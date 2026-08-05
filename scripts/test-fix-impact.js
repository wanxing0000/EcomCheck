import { predictFixImpact } from '../services/fixImpactPredictor.js'
import { generateFixGuides } from '../services/fixGuideGenerator.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'
import { runRules } from '../rules/index.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertRange(actual, min, max, label) {
  assert(actual.min === min && actual.max === max, `${label}: expected ${min}-${max}, got ${actual.min}-${actual.max}`)
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

console.log('Fix Impact Prediction Tests\n')

const g008PaymentMethods = predictFixImpact({
  ruleId: 'G008',
  severity: 'medium',
  gmcRiskScore: 72,
  approvalRisk: { level: 'medium' },
  missing: ['Payment Methods', 'Billing Terms'],
  rule: {
    id: 'G008',
    passed: false,
    message: 'Payment information detected (quality score: 72/100). Missing: payment methods.',
    policyQuality: { missing: ['payment methods'] },
  },
})

console.log('G008 payment methods missing')
assertRange(g008PaymentMethods.estimatedScoreGain, 3, 8, 'G008 methods score gain')
assert(g008PaymentMethods.riskReduction.from === 'medium', 'G008 methods risk from')
assert(g008PaymentMethods.riskReduction.to === 'medium', 'G008 methods risk unchanged')
assert(g008PaymentMethods.impactLevel === 'medium', 'G008 methods impact level')
console.log('  PASS')

const g008PageMissing = predictFixImpact({
  ruleId: 'G008',
  severity: 'high',
  gmcRiskScore: 55,
  approvalRisk: { level: 'high' },
  missing: ['Payment page'],
  rule: {
    id: 'G008',
    passed: false,
    message: 'No payment policy page detected.',
  },
})

console.log('\nG008 payment page missing')
assertRange(g008PageMissing.estimatedScoreGain, 10, 20, 'G008 page score gain')
assert(g008PageMissing.riskReduction.from === 'high', 'G008 page risk from')
assert(g008PageMissing.riskReduction.to === 'medium', 'G008 page risk to')
assert(g008PageMissing.impactLevel === 'high', 'G008 page impact level')
console.log('  PASS')

const g010ShippingMissing = predictFixImpact({
  ruleId: 'G010',
  severity: 'high',
  gmcRiskScore: 58,
  approvalRisk: { level: 'high' },
  missing: ['Shipping policy page'],
  rule: {
    id: 'G010',
    passed: false,
    message: 'No shipping policy page detected.',
  },
})

console.log('\nG010 shipping policy missing')
assertRange(g010ShippingMissing.estimatedScoreGain, 10, 20, 'G010 page score gain')
assert(g010ShippingMissing.riskReduction.to === 'medium', 'G010 page risk to')
console.log('  PASS')

const g010ShippingCost = predictFixImpact({
  ruleId: 'G010',
  severity: 'medium',
  gmcRiskScore: 70,
  approvalRisk: { level: 'medium' },
  missing: ['Shipping costs'],
  rule: {
    id: 'G010',
    passed: false,
    policyQuality: { missing: ['shipping costs'] },
  },
})

console.log('\nG010 shipping cost missing')
assertRange(g010ShippingCost.estimatedScoreGain, 2, 5, 'G010 cost score gain')
console.log('  PASS')

const m003Trust = predictFixImpact({
  ruleId: 'M003',
  severity: 'medium',
  gmcRiskScore: 62,
  approvalRisk: { level: 'medium' },
  missing: ['Product description', 'Specifications', 'Material'],
  rule: {
    id: 'M003',
    passed: false,
    productTrustReport: {
      gapClassification: {
        riskMissing: ['product description', 'specifications', 'material'],
        optimizationMissing: [],
      },
    },
  },
})

console.log('\nM003 trust risk gaps')
assertRange(m003Trust.estimatedScoreGain, 8, 15, 'M003 risk score gain')
assert(m003Trust.riskReduction.to === 'medium', 'M003 risk to')
console.log('  PASS')

const g005Identifiers = predictFixImpact({
  ruleId: 'G005',
  severity: 'low',
  gmcRiskScore: 88,
  approvalRisk: { level: 'low' },
  missing: ['GTIN', 'MPN'],
  rule: {
    id: 'G005',
    passed: false,
    message: 'Product JSON-LD found. Present: brand, sku. Missing: gtin, mpn.',
  },
})

console.log('\nG005 identifier only')
assertRange(g005Identifiers.estimatedScoreGain, 1, 3, 'G005 score gain')
assert(g005Identifiers.riskReduction.from === 'low', 'G005 risk unchanged from')
assert(g005Identifiers.riskReduction.to === 'low', 'G005 risk unchanged to')
assert(g005Identifiers.impactLevel === 'low', 'G005 impact level')
console.log('  PASS')

const { fixGuides } = generateFixGuides({
  auditMode: 'gmc',
  gmcRiskScore: 72,
  approvalRisk: { level: 'medium' },
  ruleResults: [
    {
      id: 'G008',
      name: 'Payment Information',
      category: 'gmc',
      severity: 'medium',
      passed: false,
      message: 'Payment information incomplete. Missing: payment methods.',
      policyQuality: { missing: ['payment methods'] },
    },
  ],
  complianceIssues: [],
})

console.log('\nFix guide integration')
assert(fixGuides.length === 1, 'expected one fix guide')
assert(fixGuides[0].impactPrediction != null, 'fix guide should include impactPrediction')
assert(fixGuides[0].impactPrediction.estimatedScoreGain.min === 3, 'integrated score min')
assert(fixGuides[0].impactPrediction.riskAfter === 'medium', 'integrated risk unchanged')
console.log('  PASS')

const auditData = {
  url: 'https://impact-test.local',
  pages: {
    paymentPolicy: { found: true, url: 'https://impact-test.local/payment' },
    shippingPolicy: { found: false, url: null },
    refundPolicy: { found: true, url: 'https://impact-test.local/refund' },
  },
  pageContent: {
    paymentPolicy: {
      fetched: true,
      textLength: 60,
      policyQuality: {
        qualityScore: 40,
        missing: ['payment methods', 'sufficient content length'],
        checks: { paymentKeywords: true },
      },
    },
    refundPolicy: {
      fetched: true,
      textLength: 120,
      policyQuality: {
        qualityScore: 80,
        missing: [],
        checks: { sufficientLength: true, refundKeywords: true, returnWindow: true },
      },
    },
  },
  contactInfo: { emails: ['support@impact-test.local'], phones: [], addresses: [] },
  productsAudit: { scannedPages: 0, productPages: [] },
}

const ruleResultsBefore = runRules(auditData, AUDIT_OPTIONS)
const report = buildProfessionalReport(ruleResultsBefore, [], REPORT_CONTEXT)
const g008Before = ruleResultsBefore.find((rule) => rule.id === 'G008')
const m002Before = ruleResultsBefore.find((rule) => rule.id === 'M002')

console.log('\nAudit unchanged by impact layer')
assert(g008Before?.passed === false, 'G008 should still fail in audit')
assert(typeof report.gmcReadiness?.gmcRiskScore === 'number', 'gmcRiskScore should still be computed')
const actionsWithImpact = (report.gmcReadiness?.complianceActions || []).filter(
  (action) => action.impactPrediction?.estimatedScoreGain
)
assert(actionsWithImpact.length > 0, 'at least one compliance action should carry impactPrediction')
assert(
  actionsWithImpact.every((action) => action.impactPrediction?.estimatedScoreGain?.min != null),
  'each impacted action should include score gain'
)
console.log('  gmcRiskScore:', report.gmcReadiness?.gmcRiskScore)
console.log('  M002 passed:', m002Before?.passed)
console.log('  PASS')

console.log('\nAll fix impact prediction tests passed.')
