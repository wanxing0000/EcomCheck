import { buildProfessionalReport } from '../services/reportBuilder.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function buildMockGmcRuleResults() {
  return [
    {
      id: 'G008',
      name: 'Payment Information',
      category: 'gmc',
      severity: 'medium',
      passed: true,
      message:
        'Payment information detected at https://demo-store.com/payment (quality score: 72/100). Missing: payment methods, billing terms.',
      policyQuality: {
        qualityScore: 72,
        missing: ['payment methods', 'billing terms'],
        checks: {
          sufficientLength: true,
          hasPaymentSignals: true,
          paymentKeywords: true,
        },
      },
    },
    {
      id: 'M003',
      name: 'Product Trust Signals',
      category: 'trust',
      severity: 'medium',
      passed: false,
      message: 'Product pages lack sufficient trust signals (average 45/100).',
      recommendation:
        'Add detailed specifications, product attributes and factual descriptions.',
      productTrustReport: {
        scannedPages: 2,
        averageScore: 45,
        riskLevel: 'medium',
        factors: [
          {
            name: 'Product Description Quality',
            score: 40,
            detected: ['Price found'],
            missing: ['Specifications', 'Material'],
          },
          {
            name: 'Product Image Signals',
            score: 55,
            detected: ['Images found'],
            missing: ['Alt text'],
          },
        ],
      },
    },
    {
      id: 'G001',
      name: 'Product Price Data',
      category: 'gmc',
      severity: 'high',
      passed: true,
      message: 'Product price present in structured data.',
    },
    {
      id: 'G002',
      name: 'Product Availability',
      category: 'gmc',
      severity: 'high',
      passed: true,
      message: 'Product availability present in structured data.',
    },
  ]
}

function runGmcReportTest() {
  const ruleResults = buildMockGmcRuleResults()

  const report = buildProfessionalReport(ruleResults, [], {
    mode: 'gmc',
    legacyEnabled: true,
    executedModules: ['gmc', 'ads', 'technical', 'trust'],
  })

  const data = { report }
  const fixGuides = data.report.gmcReadiness?.fixGuides

  console.log('\n=== GMC report fixGuides integration ===')
  console.log('fixGuides:', fixGuides?.map((guide) => guide.ruleId).join(', ') || '(none)')

  assert(data.report.gmcReadiness, 'gmcReadiness should exist')
  assert(Array.isArray(fixGuides), 'gmcReadiness.fixGuides should be an array')
  assert(Array.isArray(data.report.gmcReadiness.complianceActions), 'complianceActions should be an array')
  assert(
    data.report.gmcReadiness.complianceActions.length === fixGuides.length,
    'fixGuides should mirror complianceActions length'
  )
  assert(fixGuides.length >= 2, `expected at least 2 fix guides, got ${fixGuides.length}`)

  const g008Guide = fixGuides.find((guide) => guide.ruleId === 'G008')
  assert(g008Guide, 'G008 fix guide should exist')
  assert(g008Guide.priority != null, 'G008 fix guide should include priority')
  assert(g008Guide.recommendedFix, 'G008 fix guide should include recommendedFix')
  assert(g008Guide.problem, 'G008 fix guide should include problem')
  assert(Array.isArray(g008Guide.detected), 'G008 fix guide should include detected[]')
  assert(Array.isArray(g008Guide.missing), 'G008 fix guide should include missing[]')

  const m003Guide = fixGuides.find((guide) => guide.ruleId === 'M003')
  assert(m003Guide, 'M003 fix guide should exist')
  assert(m003Guide.recommendedFix, 'M003 fix guide should include recommendedFix')

  assert(data.report.improvementRoadmap, 'improvementRoadmap should remain present')
  assert(data.report.improvementRoadmap.source === 'complianceActions', 'roadmap should use complianceActions source')
  assert(data.report.approvalRisk || data.report.gmcReadiness.approvalRisk, 'approvalRisk should remain present')
  assert(data.report.gmcReadiness.riskSummary, 'riskSummary should remain present')

  console.log('G008 sample:', {
    ruleId: g008Guide.ruleId,
    priority: g008Guide.priority,
    recommendedFix: g008Guide.recommendedFix,
  })
  console.log('PASS')
}

function runNonGmcReportTest() {
  const report = buildProfessionalReport(buildMockGmcRuleResults(), [], {
    mode: 'seo',
    legacyEnabled: false,
    executedModules: ['gmc', 'seo'],
  })

  assert(report.gmcReadiness?.fixGuides?.length === 0, 'non-GMC mode should return empty fixGuides')
  console.log('\n=== Non-GMC mode fixGuides ===')
  console.log('fixGuides:', report.gmcReadiness?.fixGuides)
  console.log('PASS')
}

runGmcReportTest()
runNonGmcReportTest()

console.log('\nAll report fix guide tests passed.')
