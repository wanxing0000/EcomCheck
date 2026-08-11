import { runRules } from '../rules/index.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'
import {
  calculateComplianceScore,
  calculateOverallScore,
  resolveGrade,
  resolveRiskLabel,
  scoreFromIssueCounts,
  WEBSITE_WEIGHT,
  PRODUCT_WEIGHT,
} from '../services/complianceScoreCalculator.js'
import { FIXTURES } from './calibration-fixtures.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

console.log('Compliance Score Engine Tests\n')

console.log('1. No issues = 100 score')
const perfect = calculateComplianceScore({
  complianceActions: [],
  productCompliance: { products: [] },
  productRiskSummary: { analyzedProducts: 0 },
})
assert(perfect.score === 100, `expected 100, got ${perfect.score}`)
assert(perfect.grade === 'A', 'grade should be A')
assert(perfect.riskLevel === 'Excellent', 'risk should be Excellent')
assert(perfect.breakdown.websiteScore === 100, 'website score should be 100')
console.log('  PASS')

console.log('\n2. Critical issue reduces score by 20')
const critical = calculateComplianceScore({
  complianceActions: [{ ruleId: 'G003', title: 'Return Policy', riskTier: 'critical', severity: 'high' }],
  productRiskSummary: { analyzedProducts: 0 },
})
assert(critical.score === 80, `expected 80, got ${critical.score}`)
assert(critical.issueSummary.critical === 1, 'should count one critical issue')
console.log('  PASS')

console.log('\n3. High issue reduces score by 10')
const high = calculateComplianceScore({
  complianceActions: [{ ruleId: 'G007', title: 'Business Information', severity: 'high' }],
  productRiskSummary: { analyzedProducts: 0 },
})
assert(high.score === 90, `expected 90, got ${high.score}`)
assert(high.issueSummary.high === 1, 'should count one high issue')
console.log('  PASS')

console.log('\n4. Warning issue reduces score by 3')
const warning = calculateComplianceScore({
  complianceActions: [{ ruleId: 'G006', title: 'Price Consistency', riskTier: 'warning', severity: 'medium' }],
  productRiskSummary: { analyzedProducts: 0 },
})
assert(warning.score === 97, `expected 97, got ${warning.score}`)
assert(warning.issueSummary.warning === 1, 'should count one warning issue')
console.log('  PASS')

console.log('\n5. Product weighting works')
const weighted = calculateComplianceScore({
  complianceActions: [],
  productCompliance: {
    products: [
      {
        url: 'https://demo.store/products/a',
        issues: [{ ruleId: 'G011', ruleName: 'Product Schema Incomplete', severity: 'high' }],
      },
    ],
  },
  productRiskSummary: { analyzedProducts: 1 },
})
assert(weighted.breakdown.websiteScore === 100, 'website score should stay 100')
assert(weighted.breakdown.productScore === 80, `product score should be 80, got ${weighted.breakdown.productScore}`)
const expectedWeighted = Math.round(100 * WEBSITE_WEIGHT + 80 * PRODUCT_WEIGHT)
assert(weighted.score === expectedWeighted, `expected ${expectedWeighted}, got ${weighted.score}`)
assert(weighted.weights?.product === PRODUCT_WEIGHT, 'product weight should apply when product data exists')
console.log(`  overall=${weighted.score} (website 100 × 40% + product 80 × 60%)`)
console.log('  PASS')

console.log('\n6. Grade mapping works')
assert(resolveGrade(95) === 'A', '95 -> A')
assert(resolveGrade(85) === 'B', '85 -> B')
assert(resolveGrade(75) === 'C', '75 -> C')
assert(resolveGrade(65) === 'D', '65 -> D')
assert(resolveGrade(55) === 'F', '55 -> F')
console.log('  PASS')

console.log('\n7. Risk label works')
assert(resolveRiskLabel(95) === 'Excellent', '95 -> Excellent')
assert(resolveRiskLabel(80) === 'Good', '80 -> Good')
assert(resolveRiskLabel(65) === 'Needs Improvement', '65 -> Needs Improvement')
assert(resolveRiskLabel(50) === 'High Risk', '50 -> High Risk')
console.log('  PASS')

console.log('\n8. Existing audits without product data still work')
const REPORT_CONTEXT = {
  mode: 'gmc',
  legacyEnabled: true,
  executedModules: ['gmc', 'ads', 'technical', 'trust'],
  saveAuditHistory: false,
  skipHistoryLookup: true,
}
const crawlResult = FIXTURES['shipping-free-standard']
const ruleResults = runRules(crawlResult, {
  auditMode: 'gmc',
  modules: ['gmc', 'ads', 'technical', 'trust'],
  legacyEnabled: true,
})
const report = buildProfessionalReport(ruleResults, [], {
  ...REPORT_CONTEXT,
  website: crawlResult.url,
})
assert(report.complianceScore != null, 'report should include complianceScore')
assert(typeof report.complianceScore.score === 'number', 'complianceScore.score should be numeric')
assert(report.complianceScore.breakdown.websiteScore != null, 'website breakdown should exist')
assert(report.complianceScore.breakdown.productScore === null, 'product score should be null without product data')
assert(report.complianceScore.topIssues.length >= 0, 'topIssues should be an array')
console.log(`  score=${report.complianceScore.score}, grade=${report.complianceScore.grade}`)
console.log('  PASS')

console.log('\n9. Minimum score is 0')
const floor = scoreFromIssueCounts({ critical: 10, high: 0, warning: 0 })
assert(floor === 0, 'score should not go below 0')
assert(calculateOverallScore(0, 0, true) === 0, 'weighted floor should be 0')
console.log('  PASS')

console.log('\nPhase 16.1 Compliance Score Engine completed')
