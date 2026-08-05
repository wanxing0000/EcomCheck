import { runRules } from '../rules/index.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'
import { compareAuditReports } from '../services/auditComparison.js'
import {
  buildAuditSummary,
  clearAuditHistoryStore,
  useInMemoryAuditHistory,
} from '../services/auditHistory.js'
import { FIXTURES } from './calibration-fixtures.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const AUDIT_OPTIONS = {
  auditMode: 'gmc',
  modules: ['gmc', 'ads', 'technical', 'trust'],
  legacyEnabled: true,
}

const REPORT_CONTEXT = {
  mode: 'gmc',
  legacyEnabled: true,
  executedModules: ['gmc', 'ads', 'technical', 'trust'],
}

const WEBSITE = 'https://audit-history-test.local'

function withWebsite(fixture, website = WEBSITE) {
  return { ...fixture, url: website }
}

function buildWeakPaymentAuditData() {
  return withWebsite(FIXTURES['shipping-free-standard'])
}

function buildImprovedPaymentAuditData() {
  return withWebsite(FIXTURES['payment-visa-mastercard-paypal'])
}

function buildSummaryFromRules(ruleResults, { scoreOverride = null, riskLevel = null } = {}) {
  const report = buildProfessionalReport(ruleResults, [], {
    ...REPORT_CONTEXT,
    website: WEBSITE,
    saveAuditHistory: false,
    skipHistoryLookup: true,
  })

  const summary = buildAuditSummary({
    website: WEBSITE,
    auditMode: 'gmc',
    professionalReport: report,
    ruleResults,
  })

  if (scoreOverride != null) {
    summary.score.gmc = scoreOverride
    summary.approvalRisk.score = scoreOverride
  }

  if (riskLevel) {
    summary.approvalRisk.level = riskLevel
  }

  return summary
}

console.log('Audit History & Comparison Tests\n')

useInMemoryAuditHistory(true)
clearAuditHistoryStore()

console.log('1. First scan — no comparison')
const weakData = buildWeakPaymentAuditData()
const weakRules = runRules(weakData, AUDIT_OPTIONS)
const firstReport = buildProfessionalReport(weakRules, [], {
  ...REPORT_CONTEXT,
  website: WEBSITE,
  saveAuditHistory: true,
})
assert(firstReport.previousAuditComparison === null, 'first scan should have no comparison')
assert(firstReport.auditSummary?.website === WEBSITE, 'first scan should save audit summary')
console.log('  PASS — no comparison')

console.log('\n2. Second scan — score improvement')
const improvedData = buildImprovedPaymentAuditData()
const improvedRules = runRules(improvedData, AUDIT_OPTIONS)
const secondReport = buildProfessionalReport(improvedRules, [], {
  ...REPORT_CONTEXT,
  website: WEBSITE,
  saveAuditHistory: true,
})
assert(secondReport.previousAuditComparison != null, 'second scan should include comparison')
const scoreChange = secondReport.previousAuditComparison.scoreChange || {}
const gmcDelta = scoreChange.gmc
const complianceDelta = scoreChange.compliance
const hasScoreImprovement =
  (typeof gmcDelta === 'string' && gmcDelta.startsWith('+')) ||
  (typeof complianceDelta === 'string' && complianceDelta.startsWith('+'))
assert(hasScoreImprovement, 'score should improve on second scan')
const currentScore = secondReport.previousAuditComparison.current?.gmcRiskScore
const previousScore = secondReport.previousAuditComparison.previous?.gmcRiskScore
if (gmcDelta) {
  assert(currentScore > previousScore, 'current GMC score should exceed previous score')
}
console.log(`  previous: ${previousScore}/100 → current: ${currentScore}/100 (${gmcDelta || complianceDelta})`)
console.log('  PASS — score improved')

console.log('\n3. G008 fix — resolvedRules includes G008')
assert(
  secondReport.previousAuditComparison.resolvedRules.includes('G008'),
  'G008 should appear in resolvedRules after payment fix'
)
assert(
  secondReport.previousAuditComparison.resolvedRuleDetails.some((item) => item.ruleId === 'G008'),
  'resolvedRuleDetails should include G008'
)
console.log('  resolvedRules:', secondReport.previousAuditComparison.resolvedRules.join(', '))
console.log('  PASS — G008 resolved')

console.log('\n4. Risk change — medium → low (comparison layer)')
const previousSummary = buildSummaryFromRules(weakRules, { scoreOverride: 79, riskLevel: 'medium' })
const currentSummary = buildSummaryFromRules(improvedRules, { scoreOverride: 86, riskLevel: 'low' })
const riskComparison = compareAuditReports(previousSummary, currentSummary)
assert(riskComparison.riskChange.before === 'medium', 'previous risk should be medium')
assert(riskComparison.riskChange.after === 'low', 'current risk should be low')
assert(riskComparison.previous.gmcRiskScore === 79, 'previous score snapshot should be 79')
assert(riskComparison.current.gmcRiskScore === 86, 'current score snapshot should be 86')
console.log('  risk:', `${riskComparison.riskChange.before} → ${riskComparison.riskChange.after}`)
console.log('  PASS — risk changed medium → low')

console.log('\n5. New issue detection')
const newIssueComparison = compareAuditReports(
  {
    ...currentSummary,
    issues: [
      { id: 'G008', severity: 'medium', status: 'passed', title: 'Payment Information' },
      { id: 'M003', severity: 'medium', status: 'passed', title: 'Product Trust Signals' },
      { id: 'G001', severity: 'high', status: 'passed', title: 'Product Price Data' },
      { id: 'G010', severity: 'high', status: 'failed', title: 'Shipping Policy' },
    ],
  },
  {
    ...currentSummary,
    issues: [
      { id: 'G008', severity: 'medium', status: 'passed', title: 'Payment Information' },
      { id: 'M003', severity: 'medium', status: 'failed', title: 'Product Trust Signals' },
      { id: 'G001', severity: 'high', status: 'failed', title: 'Product Price Data' },
      { id: 'G010', severity: 'high', status: 'failed', title: 'Shipping Policy' },
    ],
  }
)
assert(newIssueComparison.newIssues.includes('G001'), 'G001 should be detected as a new issue')
assert(newIssueComparison.newIssues.includes('M003'), 'M003 should be detected as a new issue')
assert(newIssueComparison.remainingIssues.includes('G010'), 'G010 should remain in remainingIssues')
assert(!newIssueComparison.remainingIssues.includes('M003'), 'new issues should not duplicate in remainingIssues')
console.log('  newIssues:', newIssueComparison.newIssues.join(', '))
console.log('  remainingIssues:', newIssueComparison.remainingIssues.join(', '))
console.log('  PASS — new issues detected')

console.log('\nPhase 13 Audit History completed')
