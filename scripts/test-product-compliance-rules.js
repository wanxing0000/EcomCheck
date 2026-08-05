import { analyzeProductPage } from '../services/productAnalyzer.js'
import { runProductComplianceRules } from '../services/productComplianceRules.js'
import { runRules } from '../rules/index.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'
import { generateFixGuides } from '../services/fixGuideGenerator.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
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

const NO_SCHEMA_HTML = FULL_PRODUCT_HTML.replace(
  /<script type="application\/ld\+json">[\s\S]*?<\/script>/,
  ''
)

const MISSING_BRAND_HTML = FULL_PRODUCT_HTML.replace(
  '"brand": { "@type": "Brand", "name": "Demo Brand" },',
  ''
)

const MISSING_GTIN_HTML = MISSING_BRAND_HTML.replace('"gtin13": "0123456789012",', '')

const WEAK_DESCRIPTION_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Short Tee | Demo Store</title>
  <meta name="description" content="Short tee.">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Short Tee",
    "description": "Short tee.",
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
    <h1>Short Tee</h1>
    <p class="product-description">Short tee.</p>
    <span class="price">$29.99</span>
  </main>
</body>
</html>`

const NO_TRUST_HTML = FULL_PRODUCT_HTML
  .replace('<div id="reviews"><p>Customer reviews</p><span>4.5 / 5</span></div>', '')
  .replace('<p>30-day money-back guarantee and free returns policy.</p>', '')

console.log('Product Compliance Rules Tests\n')

console.log('Missing product schema detected')
const noSchemaProduct = analyzeProductPage('https://demo.store/products/no-schema', { html: NO_SCHEMA_HTML })
const noSchemaCompliance = runProductComplianceRules({ products: [noSchemaProduct] })
const g011Issue = noSchemaCompliance.products[0].issues.find((issue) => issue.ruleId === 'G011')
assert(g011Issue != null, 'G011 should fire when schema is missing')
assert(g011Issue.severity === 'high', 'G011 should be high severity')
assert(g011Issue.message.includes('incomplete'), 'G011 message should mention incomplete schema')
console.log('  PASS')

console.log('\nMissing brand detected')
const missingBrandProduct = analyzeProductPage('https://demo.store/products/no-brand', {
  html: MISSING_BRAND_HTML,
})
const missingBrandCompliance = runProductComplianceRules({ products: [missingBrandProduct] })
const g012BrandIssue = missingBrandCompliance.products[0].issues.find((issue) => issue.ruleId === 'G012')
assert(g012BrandIssue != null, 'G012 should fire when brand is missing')
assert(g012BrandIssue.missing.includes('Brand'), 'G012 should list Brand as missing')
console.log('  PASS')

console.log('\nMissing GTIN detected')
const missingGtinProduct = analyzeProductPage('https://demo.store/products/no-gtin', {
  html: MISSING_GTIN_HTML,
})
const missingGtinCompliance = runProductComplianceRules({ products: [missingGtinProduct] })
const g012GtinIssue = missingGtinCompliance.products[0].issues.find((issue) => issue.ruleId === 'G012')
assert(g012GtinIssue != null, 'G012 should fire when GTIN is missing')
assert(g012GtinIssue.missing.includes('GTIN'), 'G012 should list GTIN as missing')
console.log('  PASS')

console.log('\nWeak description detected')
const weakDescriptionProduct = analyzeProductPage('https://demo.store/products/weak-description', {
  html: WEAK_DESCRIPTION_HTML,
})
const weakDescriptionCompliance = runProductComplianceRules({ products: [weakDescriptionProduct] })
const m004Issue = weakDescriptionCompliance.products[0].issues.find((issue) => issue.ruleId === 'M004')
assert(m004Issue != null, 'M004 should fire for weak description')
assert(
  m004Issue.warnings?.some((warning) => /insufficient/i.test(warning)) ||
    /insufficient/i.test(m004Issue.message),
  'M004 should warn about insufficient description'
)
console.log('  PASS')

console.log('\nMissing trust signals detected')
const noTrustProduct = analyzeProductPage('https://demo.store/products/no-trust', { html: NO_TRUST_HTML })
const noTrustCompliance = runProductComplianceRules({ products: [noTrustProduct] })
const m005Issue = noTrustCompliance.products[0].issues.find((issue) => issue.ruleId === 'M005')
assert(m005Issue != null, 'M005 should fire when trust signals are missing')
assert(m005Issue.missing.includes('Reviews'), 'M005 should list Reviews as missing')
console.log('  PASS')

console.log('\nExisting website rules still work')
const crawlFixture = {
  url: 'https://demo.store',
  pages: {
    privacyPolicy: { found: false, url: null },
    refundPolicy: { found: false, url: null },
    shippingPolicy: { found: false, url: null },
    aboutUs: { found: false, url: null },
    contactUs: { found: false, url: null },
  },
  productsAudit: { productPages: [], pageScores: [] },
  seo: {},
  meta: {},
  links: { internal: [], external: [] },
}
const websiteRules = runRules(crawlFixture, { modules: ['gmc', 'trust'], legacyEnabled: true })
assert(Array.isArray(websiteRules) && websiteRules.length > 0, 'Website rules should still execute')
assert(websiteRules.some((rule) => rule.id === 'G009'), 'Website G009 purchase flow rule should still exist')
assert(websiteRules.some((rule) => rule.id === 'G010'), 'Website G010 shipping policy rule should still exist')
console.log('  PASS')

console.log('\nLegacy reports without productAnalysis still work')
const legacyCompliance = runProductComplianceRules(null)
assert(Array.isArray(legacyCompliance.products), 'productCompliance.products should be an array')
assert(legacyCompliance.products.length === 0, 'Legacy audits without productAnalysis should have no product issues')
assert(legacyCompliance.summary.analyzedProducts === 0, 'Legacy summary analyzedProducts should be 0')

const legacyReport = buildProfessionalReport(
  [{ id: 'G008', passed: false, category: 'gmc', message: 'Payment information incomplete.' }],
  [],
  { mode: 'gmc', legacyEnabled: true, executedModules: ['gmc', 'ads', 'technical', 'trust'] }
)
const legacyFixGuides = generateFixGuides({
  auditMode: 'gmc',
  ruleResults: [{ id: 'G008', passed: false, category: 'gmc', message: 'Payment information incomplete.' }],
})
assert(legacyReport?.scores != null, 'Legacy report should still build')
assert(Array.isArray(legacyFixGuides.fixGuides), 'Fix guides should still generate without productCompliance')
console.log('  PASS')

console.log('\nNo false M004 failure when HTML description exists')
const HTML_ONLY_DESCRIPTION = `<!DOCTYPE html><html><body><main class="product">
<div class="woocommerce-product-details__short-description">This long-form product description explains the materials, fit, and intended use for customers evaluating the item before purchase.</div>
</main></body></html>`
const describedProduct = analyzeProductPage('https://demo.store/products/html-description', {
  html: HTML_ONLY_DESCRIPTION,
})
const describedCompliance = runProductComplianceRules({ products: [describedProduct] })
const m004MissingDescription = describedCompliance.products[0].issues.find(
  (issue) => issue.ruleId === 'M004' && issue.missing?.includes('Description')
)
assert(!m004MissingDescription, 'M004 should not report missing description when HTML content exists')
console.log('  PASS')

console.log('\nLow-confidence products skip identifier false positives')
const lowConfidenceProduct = analyzeProductPage('https://demo.store/products/not-fetched', {
  existingPage: { signals: { schema: true } },
})
const lowCompliance = runProductComplianceRules({ products: [lowConfidenceProduct] })
assert(lowCompliance.products[0].issues.length === 0, 'Low-confidence products should not fail G012/M004/M005')
console.log('  PASS')

console.log('\nPhase 15.3 Product Compliance Rules Integration completed')
