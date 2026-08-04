import { getModuleRulesForExecution } from '../modules/index.js'
import { runRules } from '../rules/index.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'

const gmcRules = getModuleRulesForExecution(['gmc', 'ads', 'technical', 'trust'], {
  auditMode: 'gmc',
})
console.log(
  'GMC trust rules:',
  gmcRules.filter((rule) => rule.id.startsWith('M')).map((rule) => rule.id).join(', ')
)

const mockAudit = {
  url: 'https://example-store.com',
  html: '<html><head><title>Example Store</title></head><body></body></html>',
  meta: { title: 'Example Store' },
  contactInfo: { emails: ['support@gmail.com'], phones: [], addresses: [] },
  pages: {
    refundPolicy: { found: false },
    shippingPolicy: { found: false },
    paymentPolicy: { found: false },
  },
  pageContent: {},
  productsAudit: { productPages: [], pageScores: [] },
  platform: { name: 'shopify' },
}

const results = runRules(mockAudit, {
  auditMode: 'gmc',
  modules: ['gmc', 'ads', 'technical', 'trust'],
  legacyEnabled: true,
})

const mResults = results.filter((rule) => rule.id.startsWith('M'))
console.log(
  'M rule results:',
  mResults.map((rule) => ({
    id: rule.id,
    passed: rule.passed,
    level: rule.misrepresentationLevel,
  }))
)

const report = buildProfessionalReport(results, [], {
  mode: 'gmc',
  legacyEnabled: true,
  executedModules: ['gmc', 'ads', 'technical', 'trust'],
})

console.log('M issues in report:', report.issues.filter((issue) => issue.id.startsWith('M')).map((issue) => issue.id))
console.log('gmcRiskScore:', report.gmcReadiness?.gmcRiskScore)
console.log(
  'roadmap critical M:',
  report.improvementRoadmap.critical?.filter((item) => item.title?.includes('Business')).length ?? 0
)
console.log(
  'misrepresentation area:',
  report.gmcReadiness?.riskSummary?.riskAreas?.find((area) => area.id === 'misrepresentation')
)
