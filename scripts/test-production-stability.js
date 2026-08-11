import { mkdtempSync, rmSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'
import { runRules } from '../rules/index.js'
import { runAuditModules } from '../modules/index.js'
import { scoreAudit } from '../services/scorer.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'
import { runProductComplianceRules } from '../services/productComplianceRules.js'
import { buildProductRiskSummary } from '../services/productRiskSummary.js'
import { CrawlerError, CrawlerErrorCode } from '../services/crawler.js'
import { ERROR_STATUS } from '../api/_shared.js'
import {
  canPersistToProjectFiles,
  isLocalFileFallbackEnabled,
  isServerlessRuntime,
} from '../services/runtimeEnv.js'
import { FIXTURES } from './calibration-fixtures.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

console.log('Phase 15.7 Production Stability Tests\n')

console.log('1. Serverless filesystem guard')
assert(isServerlessRuntime() === false, 'local runtime should not be serverless')
assert(canPersistToProjectFiles() === true, 'local runtime should allow project file writes')
assert(isLocalFileFallbackEnabled() === true, 'local file fallback should be enabled by default')
console.log('  PASS')

console.log('\n2. Report storage skips local disk on Vercel')
const reportDir = mkdtempSync(join(tmpdir(), 'prod-report-'))
const reportScript = `
import { saveReport } from '../services/reportStorage.js';
import { isLocalFileFallbackEnabled } from '../services/runtimeEnv.js';

if (isLocalFileFallbackEnabled()) {
  throw new Error('local file fallback should be disabled on Vercel');
}

let threw = false;
try {
  await saveReport('https://serverless.local', { url: 'https://serverless.local', score: 80 }, {
    userId: '00000000-0000-4000-8000-000000000001',
    auditMode: 'gmc',
  });
} catch (err) {
  threw = true;
  if (String(err.message).includes('EROFS')) {
    throw new Error('saveReport must not attempt read-only filesystem writes');
  }
}

if (!threw) {
  throw new Error('saveReport should fail gracefully without Supabase on serverless');
}
`

const reportResult = spawnSync(process.execPath, ['--input-type=module', '-e', reportScript], {
  cwd: join(process.cwd(), 'scripts'),
  encoding: 'utf8',
  env: {
    ...process.env,
    VERCEL: '1',
    REPORT_STORAGE_DIR: join(reportDir, 'reports'),
    SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
  },
})
assert(reportResult.status === 0, `report storage serverless test failed:\n${reportResult.stdout}\n${reportResult.stderr}`)
assert(!existsSync(join(reportDir, 'reports')), 'no report files should be written on Vercel')
rmSync(reportDir, { recursive: true, force: true })
console.log('  PASS')

console.log('\n3. Audit usage skips local disk on Vercel')
const usageDir = mkdtempSync(join(tmpdir(), 'prod-usage-'))
const usageScript = `
import { recordAuditUsage } from '../services/auditUsage.js';
import { isLocalFileFallbackEnabled } from '../services/runtimeEnv.js';

if (isLocalFileFallbackEnabled()) {
  throw new Error('local file fallback should be disabled on Vercel');
}

const result = await recordAuditUsage('00000000-0000-4000-8000-000000000002', 'gmc');
if (result !== null) {
  throw new Error('usage should not persist locally without Supabase on serverless');
}
`

const usageResult = spawnSync(process.execPath, ['--input-type=module', '-e', usageScript], {
  cwd: join(process.cwd(), 'scripts'),
  encoding: 'utf8',
  env: {
    ...process.env,
    VERCEL: '1',
    AUDIT_USAGE_DIR: usageDir,
    SUPABASE_URL: '',
    SUPABASE_SERVICE_ROLE_KEY: '',
  },
})
assert(usageResult.status === 0, `audit usage serverless test failed:\n${usageResult.stdout}\n${usageResult.stderr}`)
rmSync(usageDir, { recursive: true, force: true })
console.log('  PASS')

console.log('\n4. Audit pipeline end-to-end (fixture)')
const crawlResult = FIXTURES['payment-visa-mastercard-paypal']
const auditOptions = {
  modules: ['gmc', 'ads', 'technical', 'trust'],
  legacyEnabled: true,
  auditMode: 'gmc',
}
const ruleResults = runRules(crawlResult, auditOptions)
const productCompliance = runProductComplianceRules(crawlResult.productAnalysis)
const { results: moduleResults, moduleStatus } = await runAuditModules(crawlResult, auditOptions)
const { score, issues, recommendations } = scoreAudit(ruleResults)
const report = buildProfessionalReport(ruleResults, [], {
  mode: 'gmc',
  legacyEnabled: true,
  executedModules: auditOptions.modules,
  website: crawlResult.url,
  saveAuditHistory: false,
  skipHistoryLookup: true,
  productCompliance,
  productAnalysis: crawlResult.productAnalysis,
  productDiscovery: crawlResult.productDiscovery,
})

assert(typeof score === 'number', 'score should be computed')
assert(Array.isArray(issues), 'issues should be an array')
assert(Array.isArray(recommendations), 'recommendations should be an array')
assert(moduleResults.gmc != null, 'GMC module should run')
assert(moduleStatus != null, 'module status should be present')
assert(report?.gmcReadiness != null, 'professional report should include GMC readiness')
assert(productCompliance?.products != null, 'product compliance should be present')

const riskSummary = buildProductRiskSummary(report.productCompliance ?? productCompliance, {
  productAnalysis: crawlResult.productAnalysis,
})
assert(typeof riskSummary.analyzedProducts === 'number', 'product risk summary should be computed')
console.log(`  score=${score}, rules=${ruleResults.length}, modules=${Object.keys(moduleResults).length}`)
console.log('  PASS')

console.log('\n5. API error status mapping')
assert(ERROR_STATUS[CrawlerErrorCode.INVALID_URL] === 400, 'invalid URL -> 400')
assert(ERROR_STATUS[CrawlerErrorCode.TIMEOUT] === 408, 'timeout -> 408')
assert(ERROR_STATUS[CrawlerErrorCode.UNREACHABLE] === 502, 'unreachable -> 502')
const crawlerErr = new CrawlerError(CrawlerErrorCode.INVALID_URL, 'bad url')
assert(crawlerErr.code === CrawlerErrorCode.INVALID_URL, 'CrawlerError should expose code')
console.log('  PASS')

console.log('\n6. Regression — serverless audit history')
const historyResult = spawnSync(process.execPath, ['scripts/test-serverless-audit-history.js'], {
  cwd: process.cwd(),
  encoding: 'utf8',
})
assert(historyResult.status === 0, `audit history regression failed:\n${historyResult.stdout}\n${historyResult.stderr}`)
console.log('  PASS')

console.log('\nPhase 15.7 Production Stability verified')
