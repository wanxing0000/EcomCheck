import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import { compareAuditReports } from '../services/auditComparison.js'
import {
  buildHistorySummary,
  buildSummaryFromReportRecord,
  compareSavedReportRecords,
  enrichReportHistory,
  reportBelongsToUser,
} from '../services/auditHistoryIntelligence.js'
import { canAccessReport } from '../api/reports/[id].js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function makeReport({ id, url, score, createdAt, userId = 'user-a', auditMode = 'gmc', rules = [] }) {
  return {
    id,
    userId,
    url,
    auditMode,
    createdAt,
    score,
    gmcScore: score,
    data: {
      url,
      auditMode,
      rules,
      report: {
        scores: { compliance: score, gmc: score },
        approvalRisk: { level: score >= 80 ? 'low' : 'medium', readinessScore: score },
        gmcReadiness: { gmcRiskScore: score, approvalRisk: { level: score >= 80 ? 'low' : 'medium' } },
      },
    },
  }
}

console.log('Phase 17.2A Audit History Intelligence Tests\n')

console.log('1. Multiple reports calculate trend')
const summaries = [
  { id: '1', url: 'https://shop.test', auditMode: 'gmc', score: 70, createdAt: '2026-01-01T10:00:00.000Z' },
  { id: '2', url: 'https://shop.test', auditMode: 'gmc', score: 78, createdAt: '2026-01-02T10:00:00.000Z' },
  { id: '3', url: 'https://shop.test', auditMode: 'gmc', score: 85, createdAt: '2026-01-03T10:00:00.000Z' },
]
const historySummary = buildHistorySummary(summaries)
assert(historySummary.totalAudits === 3, 'total audits should be 3')
assert(historySummary.latestScore === 85, 'latest score should be 85')
assert(historySummary.previousScore === 78, 'previous score should be 78')
assert(historySummary.scoreImprovement === 7, 'improvement should be +7')
assert(historySummary.scoreTrend.length === 3, 'score trend should include 3 points')
assert(historySummary.scoreTrend[0].score === 70, 'trend should start with oldest score')

const enriched = enrichReportHistory(summaries)
const latest = enriched.find((report) => report.id === '3')
assert(latest.scoreChange === '+7', 'latest row should show +7 change')
assert(latest.trend === 'up', 'latest row trend should be up')
console.log('  PASS')

console.log('\n2. Score comparison works')
const previousRecord = makeReport({
  id: 'prev',
  url: 'https://compare.test',
  score: 72,
  createdAt: '2026-01-01T10:00:00.000Z',
  rules: [
    { id: 'G008', name: 'Payment Information', passed: false, severity: 'medium', category: 'gmc' },
    { id: 'G010', name: 'Shipping Policy', passed: false, severity: 'high', category: 'gmc' },
    { id: 'M003', name: 'Product Trust Signals', passed: true, severity: 'medium', category: 'trust' },
  ],
})
const currentRecord = makeReport({
  id: 'curr',
  url: 'https://compare.test',
  score: 86,
  createdAt: '2026-01-02T10:00:00.000Z',
  rules: [
    { id: 'G008', name: 'Payment Information', passed: true, severity: 'medium', category: 'gmc' },
    { id: 'G010', name: 'Shipping Policy', passed: false, severity: 'high', category: 'gmc' },
    { id: 'M003', name: 'Product Trust Signals', passed: false, severity: 'medium', category: 'trust' },
  ],
})
const comparison = compareSavedReportRecords(currentRecord, previousRecord)
assert(comparison != null, 'comparison should be produced')
assert(comparison.resolvedRules.includes('G008'), 'G008 should be resolved')
assert(comparison.newIssues.includes('M003'), 'M003 should be a new issue')
assert(comparison.unchangedIssues.includes('G010'), 'G010 should remain unchanged')
assert(comparison.current.complianceScore === 86, 'current compliance score should be attached')
assert(comparison.previous.complianceScore === 72, 'previous compliance score should be attached')

const summaryComparison = compareAuditReports(
  buildSummaryFromReportRecord(previousRecord),
  buildSummaryFromReportRecord(currentRecord)
)
assert(summaryComparison.scoreChange.compliance === '+14', 'compliance delta should be +14')
console.log('  PASS')

console.log('\n3. User isolation maintained')
const userA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
const userB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
const owned = { id: 'owned', userId: userA, url: 'https://a.test' }
assert(reportBelongsToUser(owned, userA) === true, 'owner should match')
assert(reportBelongsToUser(owned, userB) === false, 'other user should not match')
assert(canAccessReport(owned, { id: userA }) === true, 'report API allows owner')
assert(canAccessReport(owned, { id: userB }) === false, 'report API blocks other user')

const compareSource = readFileSync(join(ROOT, 'api/reports/compare.js'), 'utf8')
assert(compareSource.includes('reportBelongsToUser'), 'compare API validates ownership')
assert(compareSource.includes("code: 'FORBIDDEN'"), 'compare API returns forbidden for cross-user access')

const mineSource = readFileSync(join(ROOT, 'api/reports/mine.js'), 'utf8')
assert(mineSource.includes('listReportsByUser(user.id)'), 'mine endpoint scopes by user id')
assert(mineSource.includes('buildHistorySummary'), 'mine endpoint includes history summary')
console.log('  PASS')

console.log('\n4. Existing reports still work')
const reportByIdSource = readFileSync(join(ROOT, 'api/reports/[id].js'), 'utf8')
assert(reportByIdSource.includes('canAccessReport'), 'existing report fetch still uses access guard')
const persistenceSource = readFileSync(join(ROOT, 'scripts/test-report-persistence.js'), 'utf8')
assert(persistenceSource.includes('Phase 17.1B'), 'prior persistence tests still present')

const dashboardSource = readFileSync(join(ROOT, 'frontend/src/pages/DashboardReports.jsx'), 'utf8')
for (const label of ['Score Change', 'Trend', 'Audit Date', 'AuditHistoryComparison']) {
  assert(dashboardSource.includes(label), `dashboard history UI should include ${label}`)
}
console.log('  PASS')

console.log('\n5. Frontend build')
const build = spawnSync('npm', ['run', 'build'], {
  cwd: ROOT,
  encoding: 'utf8',
  shell: true,
})
assert(build.status === 0, `build failed:\n${build.stdout}\n${build.stderr}`)
console.log('  PASS')

console.log('\nPhase 17.2A Audit History Intelligence verified')
