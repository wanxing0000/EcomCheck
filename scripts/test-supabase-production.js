import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import {
  getMissingSupabaseServiceEnv,
  getSupabaseEnv,
  getSupabaseProductionRequirements,
  getSupabaseServiceClient,
  isSupabaseAuthConfigured,
  isSupabaseServiceConfigured,
  resetSupabaseServiceClient,
  scrubSecrets,
  toPublicErrorMessage,
} from '../services/supabaseConfig.js'
import {
  isVisitorUsageStoreConfigured,
  consumeVisitorDailyUsage,
} from '../services/visitorUsageStore.js'
import { reserveUsageSlot, resetUsageStore, getUsagePolicy } from '../services/usageLimit.js'
import { isLocalFileFallbackEnabled } from '../services/runtimeEnv.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function walkFiles(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const stat = statSync(full)
    if (stat.isDirectory()) {
      if (entry === 'node_modules' || entry === 'dist') continue
      walkFiles(full, acc)
    } else if (/\.(jsx?|tsx?|mjs)$/.test(entry)) {
      acc.push(full)
    }
  }
  return acc
}

console.log('Phase 16.3 Supabase Production Verification\n')

console.log('1. Supabase client initialization')
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
resetSupabaseServiceClient()
assert(isSupabaseServiceConfigured() === true, 'service config should detect env vars')
const client = getSupabaseServiceClient()
assert(client != null, 'service client should initialize')
assert(isVisitorUsageStoreConfigured() === true, 'visitor store should be configured')
console.log('  PASS')

console.log('\n2. Missing env variables handled gracefully')
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_SERVICE_ROLE_KEY
resetSupabaseServiceClient()
resetUsageStore()
assert(isSupabaseServiceConfigured() === false, 'should be unconfigured without env')
assert(getMissingSupabaseServiceEnv().includes('SUPABASE_URL'), 'should list missing SUPABASE_URL')
assert(getMissingSupabaseServiceEnv().includes('SUPABASE_SERVICE_ROLE_KEY'), 'should list missing service key')
const memoryReserve = await reserveUsageSlot('missing-env-client', 'gmc')
assert(memoryReserve.allowed === true, 'missing Supabase should use memory fallback locally')
console.log('  PASS')

console.log('\n3. Visitor usage RPC integration (fail-open when unreachable)')
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
resetSupabaseServiceClient()
resetUsageStore()
const rpcResult = await consumeVisitorDailyUsage('rpc-test-client', 'gmc', 1)
assert(rpcResult === null, 'unreachable Supabase RPC should return null (fail-open)')
const failOpenReserve = await reserveUsageSlot('rpc-fail-open', 'gmc')
assert(failOpenReserve.allowed === true, 'RPC failure should fail open for audits')
assert(failOpenReserve.failOpen === true, 'should mark fail-open path')
console.log('  PASS')

console.log('\n4. GMC daily limit still works (memory fallback)')
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_SERVICE_ROLE_KEY
resetSupabaseServiceClient()
resetUsageStore()
assert(getUsagePolicy('gmc').dailyLimit === 1, 'GMC limit should remain 1/day')
const first = await reserveUsageSlot('limit-client', 'gmc')
const second = await reserveUsageSlot('limit-client', 'gmc')
assert(first.allowed === true, 'first GMC audit allowed')
assert(second.allowed === false, 'second GMC audit blocked')
console.log('  PASS')

console.log('\n5. SEO audit unaffected')
resetUsageStore()
const seo1 = await reserveUsageSlot('seo-client', 'seo')
const seo2 = await reserveUsageSlot('seo-client', 'seo')
assert(seo1.allowed === true && seo2.allowed === true, 'SEO should remain unlimited')
console.log('  PASS')

console.log('\n6. Report storage fallback behavior')
process.env.VERCEL = ''
delete process.env.SUPABASE_URL
delete process.env.SUPABASE_SERVICE_ROLE_KEY
assert(isLocalFileFallbackEnabled() === true, 'local file fallback enabled in dev')
process.env.VERCEL = '1'
assert(isLocalFileFallbackEnabled() === false, 'local file fallback disabled on Vercel')
delete process.env.VERCEL
console.log('  PASS')

console.log('\n7. API does not crash when Supabase unavailable')
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'invalid-key'
resetSupabaseServiceClient()
resetUsageStore()
const auditAllowed = await reserveUsageSlot('crash-test', 'gmc')
assert(auditAllowed.allowed === true, 'audit path should not throw when Supabase unavailable')
console.log('  PASS')

console.log('\n8. Production errors sanitized (no keys exposed)')
const secretErr = new Error('Invalid API key: eyJhbGciOiJIUzI1NiJ9.abc.def service_role_secret')
const publicMsg = toPublicErrorMessage(secretErr)
assert(!publicMsg.includes('eyJ'), 'public message must not include JWT')
assert(!publicMsg.includes('service_role'), 'public message must not include service_role')
assert(scrubSecrets(secretErr.message).includes('[redacted-token]'), 'logs should scrub tokens')
console.log('  PASS')

console.log('\n9. Frontend does not reference service role key')
const frontendSrc = join(ROOT, 'frontend', 'src')
const frontendFiles = walkFiles(frontendSrc)
const forbidden = ['SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE_KEY', 'service_role']
for (const file of frontendFiles) {
  const content = readFileSync(file, 'utf8')
  for (const term of forbidden) {
    assert(!content.includes(term), `${file} must not reference ${term}`)
  }
}
const supabaseJs = readFileSync(join(frontendSrc, 'lib', 'supabase.js'), 'utf8')
assert(supabaseJs.includes('VITE_SUPABASE_ANON_KEY'), 'frontend should only use anon key env')
assert(!supabaseJs.includes('SERVICE_ROLE'), 'frontend supabase client must not use service role')
console.log('  PASS')

console.log('\n10. Production requirements documented')
const requirements = getSupabaseProductionRequirements()
assert(requirements.tables.includes('visitor_daily_usage'), 'requires visitor_daily_usage table')
assert(requirements.rpcFunctions.includes('consume_visitor_daily_usage'), 'requires RPC')
assert(requirements.serverEnv.includes('SUPABASE_SERVICE_ROLE_KEY'), 'requires service role on server')
assert(requirements.frontendEnv.includes('VITE_SUPABASE_ANON_KEY'), 'frontend uses anon key only')
console.log('  tables:', requirements.tables.join(', '))
console.log('  rpc:', requirements.rpcFunctions.join(', '))
console.log('  PASS')

console.log('\n11. Regression — visitor usage limit tests')
const visitorTest = spawnSync(process.execPath, ['scripts/test-visitor-usage-limit.js'], {
  cwd: ROOT,
  encoding: 'utf8',
  env: { ...process.env, SUPABASE_URL: '', SUPABASE_SERVICE_ROLE_KEY: '' },
})
assert(visitorTest.status === 0, `visitor usage regression failed:\n${visitorTest.stdout}\n${visitorTest.stderr}`)
console.log('  PASS')

console.log('\nPhase 16.3 Supabase Production Verification completed')
