import { analyzeProductPage } from '../services/productAnalyzer.js'
import { runProductComplianceRules } from '../services/productComplianceRules.js'
import { buildProductComplianceActions } from '../services/productComplianceActionBuilder.js'
import {
  buildProductRiskSummary,
  getProductRuleTier,
  groupProductIssuesByTier,
  sortProductIssuesBySeverity,
} from '../services/productRiskSummary.js'
import { spawnSync } from 'node:child_process'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const FULL_PRODUCT_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Premium Cotton Tee | Demo Store</title>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Premium Cotton Tee",
    "description": "Soft premium cotton tee with reinforced stitching and breathable fabric for everyday wear.",
    "image": ["https://demo.store/images/tee.jpg"],
    "sku": "TEE-001",
    "brand": { "@type": "Brand", "name": "Demo Brand" },
    "gtin13": "0123456789012",
    "offers": {
      "@type": "Offer",
      "price": "29.99",
      "priceCurrency": "USD",
      "availability": "https://schema.org/InStock"
    }
  }
  </script>
</head>
<body>
  <main class="product">
    <h1>Premium Cotton Tee</h1>
    <p class="product-description">Soft premium cotton tee with reinforced stitching and breathable fabric for everyday wear.</p>
    <span class="price">$29.99</span>
    <link itemprop="availability" href="https://schema.org/InStock">
    <img src="https://demo.store/images/tee.jpg" alt="Premium Cotton Tee">
  </main>
</body>
</html>`

const MISSING_BRAND_HTML = FULL_PRODUCT_HTML.replace('"brand": { "@type": "Brand", "name": "Demo Brand" },', '')
const NO_SCHEMA_HTML = FULL_PRODUCT_HTML.replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
const NO_TRUST_HTML = FULL_PRODUCT_HTML.replace('<img src="https://demo.store/images/tee.jpg" alt="Premium Cotton Tee">', '')

console.log('Product Report Summary Tests\n')

const analyzedProducts = [
  analyzeProductPage('https://demo.store/products/full', { html: FULL_PRODUCT_HTML }),
  analyzeProductPage('https://demo.store/products/no-brand', { html: MISSING_BRAND_HTML }),
  analyzeProductPage('https://demo.store/products/no-schema', { html: NO_SCHEMA_HTML }),
  analyzeProductPage('https://demo.store/products/no-trust', { html: NO_TRUST_HTML }),
]

const productAnalysis = {
  products: analyzedProducts,
  summary: { analyzed: analyzedProducts.length },
}

const productCompliance = runProductComplianceRules({ products: analyzedProducts })
const { productCompliance: enrichedCompliance } = buildProductComplianceActions({
  productCompliance,
  productAnalysis,
})

console.log('Risk summary calculation')
const summary = buildProductRiskSummary(enrichedCompliance, { productAnalysis })
assert(summary.analyzedProducts === 4, 'Should count analyzed products')
assert(summary.productsWithIssues > 0, 'Should count products with issues')
assert(summary.totalIssues > 0, 'Should count total issues')
assert(summary.criticalCount >= 1, 'Should count critical G011 issues')
assert(summary.highCount >= 1, 'Should count high-tier issues')
assert(summary.warningCount >= 1, 'Should count warning-tier issues')
assert(summary.riskLevel === 'critical', 'Critical issues should set risk level to critical')
assert(typeof summary.fixAvailableCount === 'number', 'Should include fix availability count')
console.log('  PASS')

console.log('\nIssue grouping')
const groups = groupProductIssuesByTier(enrichedCompliance)
assert(groups.critical.length >= 1, 'Should group critical issues')
assert(groups.critical.every((issue) => getProductRuleTier(issue.ruleId) === 'critical'), 'Critical group tier check')
assert(groups.high.every((issue) => getProductRuleTier(issue.ruleId) === 'high'), 'High group tier check')
assert(groups.warning.every((issue) => getProductRuleTier(issue.ruleId) === 'warning'), 'Warning group tier check')
console.log('  PASS')

console.log('\nSeverity ordering')
const flatIssues = [...groups.critical, ...groups.high, ...groups.warning]
const resorted = sortProductIssuesBySeverity(flatIssues)
assert(resorted[0].ruleId === 'G011', 'G011 should sort first')
const firstHighIndex = resorted.findIndex((issue) => getProductRuleTier(issue.ruleId) === 'high')
const firstWarningIndex = resorted.findIndex((issue) => getProductRuleTier(issue.ruleId) === 'warning')
assert(firstHighIndex > 0, 'High issues should come after critical')
if (firstWarningIndex >= 0 && firstHighIndex >= 0) {
  assert(firstWarningIndex > firstHighIndex, 'Warnings should come after high issues')
}
console.log('  PASS')

console.log('\nFix availability count')
const fixAvailableFromIssues = flatIssues.filter(
  (issue) => issue.fixAvailable || issue.fixAssistant?.copyReadyText
).length
assert(summary.fixAvailableCount === fixAvailableFromIssues, 'Fix availability count should match issues')
console.log('  PASS')

console.log('\nExisting product compliance still works')
for (const script of [
  'test-product-compliance-rules.js',
  'test-product-compliance-enhancement.js',
  'test-product-fix-assistant.js',
]) {
  const result = spawnSync(process.execPath, [`scripts/${script}`], {
    encoding: 'utf8',
  })
  assert(result.status === 0, `${script} should still pass:\n${result.stdout}\n${result.stderr}`)
}
console.log('  PASS')

console.log('\nPhase 15.6 Product Report UX & Risk Summary completed')
