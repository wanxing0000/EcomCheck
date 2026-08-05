import {
  analyzePaymentPolicyQuality,
  analyzeReturnPolicyQuality,
  analyzeShippingPolicyQuality,
} from '../services/pageContent.js'
import { policyQualityRule } from '../modules/trust/rules/M002-policy-quality.js'
import { runRules } from '../rules/index.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'
import { buildComplianceActions } from '../services/complianceActionBuilder.js'
import { analyzeApprovalRisk } from '../services/approvalRiskAnalyzer.js'

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

function policyPage(url) {
  return { found: true, url }
}

function fetchedPolicy(text, analyzer, extra = {}) {
  const policyQuality = analyzer(text, extra.analyzerOptions)
  return {
    fetched: true,
    textLength: text.length,
    bodyText: text,
    policyQuality,
  }
}

function buildBasePages(overrides = {}) {
  return {
    paymentPolicy: policyPage('https://calibration.local/payment-policy'),
    shippingPolicy: policyPage('https://calibration.local/shipping-policy'),
    refundPolicy: policyPage('https://calibration.local/refund-policy'),
    ...overrides,
  }
}

function runM002Case(auditData) {
  const result = policyQualityRule.check(auditData)
  const ruleResults = runRules(auditData, AUDIT_OPTIONS)
  const report = buildProfessionalReport(ruleResults, [], REPORT_CONTEXT)
  const m002Rule = ruleResults.find((rule) => rule.id === 'M002')
  const complianceIssues = report.gmcReadiness?.complianceIssues || []
  const { complianceActions } = buildComplianceActions({
    ruleResults,
    complianceIssues,
    fixGuides: report.gmcReadiness?.fixGuides || [],
    approvalRisk: report.gmcReadiness?.approvalRisk,
    auditMode: 'gmc',
  })
  const approvalRisk = analyzeApprovalRisk({
    ruleResults,
    complianceIssues,
    gmcRiskScore: report.gmcReadiness?.gmcRiskScore,
    auditContext: REPORT_CONTEXT,
  })

  return { result, m002Rule, complianceActions, approvalRisk, report }
}

console.log('M002 Policy Quality Tests\n')

const case1 = runM002Case({
  pages: buildBasePages(),
  pageContent: {
    refundPolicy: {
      fetched: true,
      textLength: 140,
      policyQuality: {
        qualityScore: 67,
        missing: ['return conditions', 'contact information'],
        risks: ['No contact information for return inquiries.'],
        checks: {
          sufficientLength: true,
          refundKeywords: true,
          returnKeywords: true,
          returnWindow: true,
          condition: false,
          contactInformation: false,
        },
      },
    },
    shippingPolicy: {
      fetched: true,
      textLength: 120,
      policyQuality: {
        qualityScore: 100,
        missing: [],
        risks: [],
        checks: {
          sufficientLength: true,
          shippingKeywords: true,
          deliveryTime: true,
          shippingRegions: true,
          shippingCost: true,
        },
      },
    },
    paymentPolicy: {
      fetched: true,
      textLength: 120,
      policyQuality: {
        qualityScore: 100,
        missing: [],
        risks: [],
        checks: {
          sufficientLength: true,
          paymentKeywords: true,
          paymentMethods: true,
          currencyOrPricing: true,
          hasPaymentSignals: true,
        },
      },
    },
  },
})

console.log('Case 1: Refund 67 / Shipping 100 / Payment 100')
console.log('  average:', case1.result.policyQualityReport?.averageScore)
console.log('  passed:', case1.result.passed)
console.log('  gap:', case1.result.policyQualityReport?.policyGapClassification)

assert(Math.round(case1.result.policyQualityReport.averageScore) === 89, `expected average 89, got ${case1.result.policyQualityReport.averageScore}`)
assert(case1.result.passed === true, 'Case 1 should pass')
assert(
  !case1.complianceActions.some((action) => action.ruleId === 'M002'),
  'Case 1 should not create M002 compliance action'
)
console.log('  PASS\n')

const strongRefund =
  'You may return unused items within 30 days in original packaging. Contact support@store.example for refund assistance.'
const strongShipping =
  'Free standard shipping on domestic orders. Delivery within 5-7 business days across the United States and Canada.'
const strongPayment =
  'We accept Visa, Mastercard, PayPal, Apple Pay and Google Pay. All charges are processed securely in USD at checkout.'

const case2 = runM002Case({
  pages: buildBasePages(),
  pageContent: {
    refundPolicy: fetchedPolicy(strongRefund, (text) =>
      analyzeReturnPolicyQuality(text, { emails: ['support@store.example'] })
    ),
    shippingPolicy: fetchedPolicy(strongShipping, analyzeShippingPolicyQuality),
    paymentPolicy: fetchedPolicy(strongPayment, analyzePaymentPolicyQuality),
  },
})

console.log('Case 2: All policies complete')
console.log('  average:', case2.result.policyQualityReport?.averageScore)
console.log('  passed:', case2.result.passed)

assert(case2.result.passed === true, 'Case 2 should pass')
assert((case2.result.policyQualityReport?.averageScore ?? 0) >= 80, 'Case 2 average should be strong')
assert(!case2.complianceActions.some((action) => action.ruleId === 'M002'), 'Case 2 should not create M002 action')
console.log('  PASS\n')

const case3 = runM002Case({
  pages: buildBasePages({
    shippingPolicy: { found: false, url: null },
  }),
  pageContent: {
    refundPolicy: fetchedPolicy(strongRefund, (text) =>
      analyzeReturnPolicyQuality(text, { emails: ['support@store.example'] })
    ),
    paymentPolicy: fetchedPolicy(strongPayment, analyzePaymentPolicyQuality),
  },
})

console.log('Case 3: Missing Shipping Policy')
console.log('  passed:', case3.result.passed)
console.log('  severity:', case3.result.severity)

assert(case3.result.passed === false, 'Case 3 should fail')
assert(case3.result.severity === 'high', `Case 3 should be high severity, got ${case3.result.severity}`)
assert(
  case3.result.policyQualityReport?.policyGapClassification?.riskMissing.some((item) =>
    /shipping policy/i.test(item)
  ),
  'Case 3 should classify missing shipping page as risk gap'
)
console.log('  PASS\n')

const case4 = runM002Case({
  pages: buildBasePages(),
  pageContent: {
    refundPolicy: fetchedPolicy(
      'You may return unused items within 30 days in original packaging. Contact support@store.example to start a return.',
      (text) => analyzeReturnPolicyQuality(text, { emails: ['support@store.example'] })
    ),
    shippingPolicy: fetchedPolicy(
      'Free shipping on all orders within the United States. Delivery in 4-6 business days.',
      analyzeShippingPolicyQuality
    ),
    paymentPolicy: fetchedPolicy(
      'We accept Visa and PayPal for all orders. Free shipping is included in the product price for domestic orders. All prices are shown in USD.',
      analyzePaymentPolicyQuality
    ),
  },
})

console.log('Case 4: Payment policy with Visa/PayPal/free shipping')
console.log('  passed:', case4.result.passed)
console.log('  average:', case4.result.policyQualityReport?.averageScore)

assert(case4.result.passed === true, 'Case 4 should pass')
assert(!case4.complianceActions.some((action) => action.ruleId === 'M002'), 'Case 4 should not create M002 action')
console.log('  PASS\n')

const case5 = runM002Case({
  pages: buildBasePages(),
  pageContent: {
    refundPolicy: fetchedPolicy('Returns accepted.', (text) => analyzeReturnPolicyQuality(text, {})),
    shippingPolicy: fetchedPolicy('We ship orders.', analyzeShippingPolicyQuality),
    paymentPolicy: fetchedPolicy('Pay at checkout.', analyzePaymentPolicyQuality),
  },
})

console.log('Case 5: Sparse policy content')
console.log('  passed:', case5.result.passed)
console.log('  severity:', case5.result.severity)
console.log('  outcome:', case5.result.policyQualityReport?.outcome)

assert(case5.result.passed === false, 'Case 5 should fail')
assert(case5.result.severity === 'medium', `Case 5 should be warning/medium severity, got ${case5.result.severity}`)
assert(case5.result.policyQualityReport?.outcome === 'warning', 'Case 5 outcome should be warning')
console.log('  PASS\n')

const passedCase = case1
assert(
  !passedCase.approvalRisk?.riskFactors?.some((factor) => factor.id === 'M002'),
  'passed M002 should not appear in approval risk factors'
)

assert(case1.m002Rule?.evidence?.found?.length > 0, 'M002 should still emit found evidence')
assert(Array.isArray(case1.m002Rule?.evidence?.missing), 'M002 should still emit missing evidence array')

console.log('All M002 policy quality tests passed.')
