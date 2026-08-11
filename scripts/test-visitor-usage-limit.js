import {
  checkUsage,
  getUsagePolicy,
  getUsageStatus,
  getUsageLimitMessage,
  reserveUsageSlot,
  resetUsageStore,
  USAGE_LIMIT_EXCEEDED_CODE,
} from '../services/usageLimit.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

console.log('Visitor Daily Usage Limit Tests\n')

process.env.SUPABASE_URL = ''
process.env.SUPABASE_SERVICE_ROLE_KEY = ''

resetUsageStore()
const clientId = 'test-client-16-2b'
const seoClient = 'test-client-seo'

console.log('1. GMC policy is 1 per day')
assert(getUsagePolicy('gmc').dailyLimit === 1, 'GMC daily limit should be 1')
assert(getUsagePolicy('seo').unlimited === true, 'SEO should remain unlimited')
console.log('  PASS')

console.log('\n2. First GMC audit allowed')
resetUsageStore()
const first = await reserveUsageSlot(clientId, 'gmc')
assert(first.allowed === true, 'first audit should be allowed')
assert(first.status.used === 1, 'first audit should consume one slot')
assert(first.status.remaining === 0, 'no remaining free scans after first use')
console.log('  PASS')

console.log('\n3. Second GMC audit same day blocked')
const second = await reserveUsageSlot(clientId, 'gmc')
assert(second.allowed === false, 'second audit same day should be blocked')
assert(second.status.used === 1, 'used count should stay at 1')
assert(second.status.remaining === 0, 'remaining should be 0')
const message = getUsageLimitMessage('gmc')
assert(message.includes('free GMC audit'), 'limit message should be friendly')
console.log('  PASS')

console.log('\n4. Different visitor allowed (new client_id)')
resetUsageStore()
await reserveUsageSlot(clientId, 'gmc')
const blocked = await reserveUsageSlot(clientId, 'gmc')
assert(blocked.allowed === false, 'same client same day blocked')
resetUsageStore()
const otherClient = await reserveUsageSlot('other-client-new-day', 'gmc')
assert(otherClient.allowed === true, 'different client should be allowed')
console.log('  PASS')

console.log('\n5. SEO audit unaffected')
resetUsageStore()
const seoFirst = await reserveUsageSlot(seoClient, 'seo')
const seoSecond = await reserveUsageSlot(seoClient, 'seo')
const seoThird = await reserveUsageSlot(seoClient, 'seo')
assert(seoFirst.allowed === true, 'seo audit 1 allowed')
assert(seoSecond.allowed === true, 'seo audit 2 allowed')
assert(seoThird.allowed === true, 'seo audit 3 allowed')
const seoStatus = await getUsageStatus(seoClient, 'seo')
assert(seoStatus.unlimited === true, 'seo status should be unlimited')
console.log('  PASS')

console.log('\n6. Supabase failure fails open (no crash, audit allowed)')
process.env.SUPABASE_URL = 'https://example.supabase.co'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
resetUsageStore()
const failOpenClient = 'fail-open-client'
const failOpen = await reserveUsageSlot(failOpenClient, 'gmc')
assert(failOpen.allowed === true, 'supabase RPC failure should fail open and allow audit')
assert(failOpen.failOpen === true, 'should mark fail-open path')
process.env.SUPABASE_URL = ''
process.env.SUPABASE_SERVICE_ROLE_KEY = ''
console.log('  PASS')

console.log('\n7. Usage status reflects consumption')
resetUsageStore()
await reserveUsageSlot('status-client', 'gmc')
const status = await checkUsage('status-client', 'gmc')
assert(status.allowed === false, 'status should show limit reached')
assert(status.used === 1, 'status used should be 1')
assert(USAGE_LIMIT_EXCEEDED_CODE === 'USAGE_LIMIT_EXCEEDED', 'error code constant')
console.log('  PASS')

console.log('\nPhase 16.2B Free GMC Audit Limit verified')
