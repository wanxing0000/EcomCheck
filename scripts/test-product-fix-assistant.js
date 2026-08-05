import { generateFixAssistant } from '../services/fixAssistantGenerator.js'
import { generateFixGuides, generateProductFixGuides } from '../services/fixGuideGenerator.js'
import { buildComplianceActions } from '../services/complianceActionBuilder.js'
import { buildProductComplianceActions } from '../services/productComplianceActionBuilder.js'
import { analyzeProductPage } from '../services/productAnalyzer.js'
import { runProductComplianceRules } from '../services/productComplianceRules.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertNoFabricatedProductClaims(text) {
  assert(!/\b1[- ]year warranty\b/i.test(text), 'must not invent warranty periods')
  assert(!/\bCE certified\b/i.test(text), 'must not invent certifications')
  assert(!/\bNike\b/i.test(text), 'must not invent brand names')
  assert(!/\bofficial authorized dealer\b/i.test(text), 'must not invent authorization claims')
  assert(!/\b0123456789012\b/.test(text), 'must not invent GTIN values')
}

const FULL_PRODUCT_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Premium Cotton Tee | Demo Store</title>
  <meta name="description" content="Soft premium cotton tee with reinforced stitching and breathable fabric for everyday wear.">
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
    "mpn": "TEE2024",
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
    <p class="product-description">Soft premium cotton tee with reinforced stitching and breathable fabric for everyday wear. Made from 100% cotton with detailed size chart and material specifications.</p>
    <span class="price">$29.99</span>
    <button class="single_add_to_cart_button">Add to cart</button>
    <div id="reviews"><p>Customer reviews</p><span>4.5 / 5</span></div>
    <p>30-day money-back guarantee and free returns policy.</p>
    <img src="https://demo.store/images/tee.jpg" alt="Premium Cotton Tee">
  </main>
</body>
</html>`

const MISSING_BRAND_HTML = FULL_PRODUCT_HTML.replace(
  '"brand": { "@type": "Brand", "name": "Demo Brand" },',
  ''
)

const MISSING_GTIN_HTML = MISSING_BRAND_HTML.replace('"gtin13": "0123456789012",', '')

const WEAK_DESCRIPTION_HTML = FULL_PRODUCT_HTML
  .replace(
    'Soft premium cotton tee with reinforced stitching and breathable fabric for everyday wear.',
    'Short tee.'
  )
  .replace(
    'Soft premium cotton tee with reinforced stitching and breathable fabric for everyday wear. Made from 100% cotton with detailed size chart and material specifications.',
    'Short tee.'
  )

const NO_TRUST_HTML = FULL_PRODUCT_HTML
  .replace('<div id="reviews"><p>Customer reviews</p><span>4.5 / 5</span></div>', '')
  .replace('<p>30-day money-back guarantee and free returns policy.</p>', '')

const NO_SCHEMA_HTML = FULL_PRODUCT_HTML.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  ''
)

console.log('Product Fix Assistant Tests\n')

console.log('G011 generates schema fix')
const g011Draft = generateFixAssistant({
  ruleId: 'G011',
  missing: ['brand', 'sku', 'offers'],
  detected: ['name', 'image', 'description'],
})
assert(g011Draft?.copyReadyText, 'G011 draft should exist')
assert(g011Draft.copyReadyText.includes('application/ld+json'), 'G011 should include JSON-LD')
assert(g011Draft.copyReadyText.includes('{{BRAND}}'), 'G011 should include brand placeholder')
assert(g011Draft.copyReadyText.includes('{{SKU}}'), 'G011 should include SKU placeholder')
assert(!g011Draft.copyReadyText.includes('{{PRODUCT_NAME}}'), 'G011 should skip detected name')
assertNoFabricatedProductClaims(g011Draft.copyReadyText)
console.log('  PASS')

console.log('\nG012 generates identifier fix')
const g012Draft = generateFixAssistant({
  ruleId: 'G012',
  missing: ['GTIN', 'Brand'],
  detected: ['SKU'],
})
assert(g012Draft?.copyReadyText.includes('{{GTIN}}'), 'G012 should include GTIN placeholder')
assert(g012Draft.copyReadyText.includes('{{BRAND}}'), 'G012 should include brand placeholder')
assert(!g012Draft.copyReadyText.includes('SKU:'), 'G012 should skip detected SKU')
assertNoFabricatedProductClaims(g012Draft.copyReadyText)
console.log('  PASS')

console.log('\nM004 generates content fix')
const m004Draft = generateFixAssistant({
  ruleId: 'M004',
  missing: ['Specifications', 'Material', 'Size information'],
  detected: [],
  evidence: { message: 'Product description may be insufficient' },
})
assert(m004Draft?.copyReadyText.includes('{{PRODUCT_DESCRIPTION}}'), 'M004 should include description placeholder')
assert(m004Draft.copyReadyText.includes('{{MATERIAL}}'), 'M004 should include material placeholder')
assert(m004Draft.copyReadyText.includes('{{SIZE}}'), 'M004 should include size placeholder')
assertNoFabricatedProductClaims(m004Draft.copyReadyText)
console.log('  PASS')

console.log('\nM005 generates trust fix')
const m005Draft = generateFixAssistant({
  ruleId: 'M005',
  missing: ['Reviews', 'Warranty information', 'Return information'],
  detected: [],
})
assert(m005Draft?.copyReadyText.includes('{{REVIEWS_SECTION}}'), 'M005 should include reviews placeholder')
assert(m005Draft.copyReadyText.includes('{{WARRANTY_TERMS}}'), 'M005 should include warranty placeholder')
assert(m005Draft.copyReadyText.includes('{{RETURN_POLICY}}'), 'M005 should include return placeholder')
assertNoFabricatedProductClaims(m005Draft.copyReadyText)
console.log('  PASS')

console.log('\nExisting detected fields are skipped')
const partialSchemaDraft = generateFixAssistant({
  ruleId: 'G011',
  missing: ['brand', 'sku', 'price'],
  detected: ['Brand', 'Price'],
})
assert(!partialSchemaDraft.copyReadyText.includes('{{BRAND}}'), 'Detected brand should be skipped')
assert(partialSchemaDraft.copyReadyText.includes('{{SKU}}'), 'Missing SKU should remain')
console.log('  PASS')

console.log('\nNo fake values generated')
for (const draft of [g011Draft, g012Draft, m004Draft, m005Draft]) {
  assertNoFabricatedProductClaims(draft.copyReadyText)
  assert(/\{\{[A-Z0-9_]+\}\}/.test(draft.copyReadyText), 'Draft should use placeholders')
}
console.log('  PASS')

console.log('\nFix integrates with report actions')
const analyzedProducts = [
  analyzeProductPage('https://demo.store/products/no-gtin', { html: MISSING_GTIN_HTML }),
  analyzeProductPage('https://demo.store/products/no-trust', { html: NO_TRUST_HTML }),
  analyzeProductPage('https://demo.store/products/no-schema', { html: NO_SCHEMA_HTML }),
]

const productCompliance = runProductComplianceRules({ products: analyzedProducts })
const { productCompliance: enrichedCompliance, productComplianceActions } = buildProductComplianceActions({
  productCompliance,
  productAnalysis: { products: analyzedProducts },
})

assert(enrichedCompliance.products.length === 3, 'Should enrich all analyzed products')
assert(productComplianceActions.length > 0, 'Should build product compliance actions')

const g012Action = productComplianceActions.find(
  (action) => action.ruleId === 'G012' && action.productUrl.includes('no-gtin')
)
assert(g012Action?.fixAvailable === true, 'G012 action should be fixable')
assert(g012Action?.generatedDraft?.includes('{{GTIN}}'), 'G012 action should include generated draft')

const { fixGuides } = generateProductFixGuides({
  productCompliance,
  productAnalysis: { products: analyzedProducts },
})
assert(fixGuides.some((guide) => guide.ruleId === 'G011'), 'Product fix guides should include G011')
assert(fixGuides.some((guide) => guide.fixAssistant?.copyReadyText), 'Product fix guides should include fixAssistant')

const issueWithFix = enrichedCompliance.products
  .flatMap((product) => product.issues)
  .find((issue) => issue.ruleId === 'G012' && issue.fixAvailable)
assert(issueWithFix?.fixAssistant?.copyReadyText, 'Enriched issues should include fixAssistant on issue')
console.log('  PASS')

console.log('\nLegacy reports still work')
const legacyReport = buildProfessionalReport(
  [{ id: 'G008', passed: false, category: 'gmc', message: 'Payment information incomplete.' }],
  [],
  { mode: 'gmc', legacyEnabled: true, executedModules: ['gmc', 'ads', 'technical', 'trust'] }
)
const { fixGuides: legacyFixGuides } = generateFixGuides({
  auditMode: 'gmc',
  ruleResults: [{ id: 'G008', passed: false, category: 'gmc', message: 'Payment information incomplete.' }],
})
const { complianceActions } = buildComplianceActions({
  auditMode: 'gmc',
  ruleResults: [{ id: 'G008', passed: false, category: 'gmc', message: 'Payment information incomplete.' }],
  fixGuides: legacyFixGuides.fixGuides || legacyFixGuides,
})
assert(legacyReport?.scores != null, 'Legacy report should still build')
assert(Array.isArray(legacyFixGuides.fixGuides ?? legacyFixGuides), 'Legacy fix guides should still generate')
assert(complianceActions.length >= 0, 'Legacy compliance actions should still build')
assert(legacyReport.productCompliance == null, 'Legacy report without productCompliance should remain unchanged')
console.log('  PASS')

console.log('\nPhase 15.4 Product Fix Assistant Integration completed')
