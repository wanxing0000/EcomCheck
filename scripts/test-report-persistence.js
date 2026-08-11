import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { canAccessReport } from '../api/reports/[id].js'
import { resolveUserFromRequest } from '../services/auth.js'
import { reserveUsageSlot, resetUsageStore } from '../services/usageLimit.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

console.log('Phase 17.1B User Report Persistence Tests\n')

console.log('1. audit_reports schema requirements')
const schema = readFileSync(join(ROOT, 'supabase/schema.sql'), 'utf8')
for (const column of ['user_id', 'url', 'audit_mode', 'score', 'platform', 'gmc_score', 'data', 'created_at']) {
  assert(schema.includes(column), `schema should define ${column}`)
}
assert(schema.includes('Users read own audit_reports'), 'RLS policy for user-owned reads should exist')
console.log('  PASS')

console.log('\n2. Logged-in audit auto-saves with user_id')
const sharedSource = readFileSync(join(ROOT, 'api/_shared.js'), 'utf8')
assert(sharedSource.includes('resolveUserFromRequest(req)'), 'handleAudit resolves user from JWT')
assert(sharedSource.includes('saveReport(url, auditData'), 'handleAudit calls saveReport')
assert(sharedSource.includes('userId: user.id'), 'saveReport receives authenticated user id')
const scanSource = readFileSync(join(ROOT, 'frontend/src/pages/Scan.jsx'), 'utf8')
assert(scanSource.includes('headers.Authorization = `Bearer ${accessToken}`'), 'Scan sends auth token')
console.log('  PASS')

console.log('\n3. Anonymous audit does not require save')
const storageSource = readFileSync(join(ROOT, 'services/reportStorage.js'), 'utf8')
assert(storageSource.includes('userId is required to save a report'), 'saveReport rejects missing userId')
assert(
  sharedSource.includes('if (user) {') && sharedSource.includes('saveReport'),
  'save only runs when user is present'
)
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_ANON_KEY
const guest = await resolveUserFromRequest({ headers: {} })
assert(guest === null, 'anonymous request has no user')
console.log('  PASS')

console.log('\n4. User A cannot view User B reports')
const userA = { id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', email: 'a@test.com' }
const userB = { id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', email: 'b@test.com' }
const ownedReport = { id: 'cccccccc-cccc-cccc-cccc-cccccccccccc', userId: userA.id, url: 'https://a.test' }
assert(canAccessReport(ownedReport, userA) === true, 'owner can access own report')
assert(canAccessReport(ownedReport, userB) === false, 'other user cannot access report')
assert(canAccessReport(ownedReport, null) === false, 'guest cannot access user-owned report')
assert(canAccessReport({ userId: null, url: 'https://legacy.test' }, null) === true, 'legacy public report stays accessible')

const reportByIdSource = readFileSync(join(ROOT, 'api/reports/[id].js'), 'utf8')
assert(reportByIdSource.includes('canAccessReport(report, user)'), 'report API enforces ownership')
assert(reportByIdSource.includes("code: 'FORBIDDEN'"), 'forbidden response for cross-user access')

const mineSource = readFileSync(join(ROOT, 'api/reports/mine.js'), 'utf8')
assert(mineSource.includes('listReportsByUser(user.id)'), 'mine endpoint scopes by JWT user id')
console.log('  PASS')

console.log('\n5. Dashboard loads reports with required fields')
const hookSource = readFileSync(join(ROOT, 'frontend/src/hooks/useUserReports.js'), 'utf8')
assert(hookSource.includes('/api/reports/mine'), 'hook fetches user reports')
assert(hookSource.includes('Authorization'), 'hook sends bearer token')
const dashboardReports = readFileSync(join(ROOT, 'frontend/src/pages/DashboardReports.jsx'), 'utf8')
for (const label of ['URL', 'Audit Type', 'Compliance Score', 'Created', 'Report']) {
  assert(dashboardReports.includes(label), `dashboard table should show ${label}`)
}
assert(dashboardReports.includes('formatReportScore'), 'dashboard formats compliance score')
assert(dashboardReports.includes('formatAuditMode'), 'dashboard formats audit type')
assert(dashboardReports.includes('formatReportDate'), 'dashboard formats date')
assert(dashboardReports.includes('/report/${report.id}'), 'dashboard links to saved report')
console.log('  PASS')

console.log('\n6. Compliance score stored on save')
assert(
  storageSource.includes('auditData.complianceScore?.score ?? auditData.score'),
  'buildRecord should prefer complianceScore.score'
)
console.log('  PASS')

console.log('\n7. Existing anonymous audits still work')
process.env.SUPABASE_URL = ''
process.env.SUPABASE_SERVICE_ROLE_KEY = ''
resetUsageStore()
const reservation = await reserveUsageSlot('anonymous-persistence-test', 'gmc')
assert(reservation.allowed === true, 'anonymous GMC audit allowed')
const seoReservation = await reserveUsageSlot('anonymous-persistence-test', 'seo')
assert(seoReservation.allowed === true, 'anonymous SEO audit allowed')
console.log('  PASS')

console.log('\n8. Frontend build')
const build = spawnSync('npm', ['run', 'build'], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: true,
})
assert(build.status === 0, `build failed:\n${build.stdout}\n${build.stderr}`)
console.log('  PASS')

console.log('\nPhase 17.1B User Report Persistence verified')
