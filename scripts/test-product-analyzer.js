import { analyzeDiscoveredProductPages, analyzeProductPage } from '../services/productAnalyzer.js'
import { discoverProductPages } from '../services/productDiscovery.js'
import { runProductComplianceRules } from '../services/productComplianceRules.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'
import { generateFixGuides } from '../services/fixGuideGenerator.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const PRODUCT_HTML = `<!DOCTYPE html>
<html>
<head>
  <title>Premium Cotton Tee | Demo Store</title>
  <meta name="description" content="Soft premium cotton tee with reinforced stitching.">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": "Premium Cotton Tee",
    "description": "Soft premium cotton tee with reinforced stitching.",
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
    <p class="product-description">Soft premium cotton tee with reinforced stitching and breathable fabric.</p>
    <span class="price">$29.99</span>
    <button class="single_add_to_cart_button">Add to cart</button>
    <div id="reviews"><p>Customer reviews</p><span>4.5 / 5</span></div>
    <img src="https://demo.store/images/tee.jpg" alt="Premium Cotton Tee">
  </main>
</body>
</html>`

const MISSING_BRAND_HTML = PRODUCT_HTML.replace('"brand": { "@type": "Brand", "name": "Demo Brand" },', '')
const MISSING_GTIN_HTML = MISSING_BRAND_HTML.replace('"gtin13": "0123456789012",', '')

console.log('Product Page Analyzer Tests\n')

console.log('Extract product schema')
const schemaResult = analyzeProductPage('https://demo.store/products/premium-cotton-tee', {
  html: PRODUCT_HTML,
})
assert(schemaResult.structuredData.found === true, 'Product schema should be found')
assert(schemaResult.signals.productSchema === true, 'UI schema signal should be true')
console.log('  PASS')

console.log('\nExtract price')
assert(schemaResult.productSignals.price.found === true, 'Price should be detected')
assert(schemaResult.extractedData.price != null, 'Extracted price should exist')
console.log('  PASS')

console.log('\nExtract brand')
assert(schemaResult.productSignals.brand.found === true, 'Brand should be detected')
console.log('  PASS')

console.log('\nExtract GTIN')
assert(schemaResult.productSignals.gtin.found === true, 'GTIN should be detected')
console.log('  PASS')

console.log('\nDetect missing fields')
const missingBrand = analyzeProductPage('https://demo.store/products/premium-cotton-tee', {
  html: MISSING_BRAND_HTML,
})
assert(missingBrand.structuredData.missingFields.includes('brand'), 'Missing brand should be flagged')
assert(missingBrand.issues.some((issue) => /brand/i.test(issue)), 'Brand issue should be listed')

const missingGtin = analyzeProductPage('https://demo.store/products/premium-cotton-tee', {
  html: MISSING_GTIN_HTML,
})
assert(missingGtin.structuredData.missingFields.includes('gtin'), 'Missing GTIN should be flagged')
assert(missingGtin.issues.some((issue) => /GTIN/i.test(issue)), 'GTIN issue should be listed')
console.log('  PASS')

console.log('\nDetect reviews')
assert(schemaResult.quality.hasReviews === true, 'Review section should be detected')
assert(schemaResult.signals.reviews === true, 'Review signal should be true')
console.log('  PASS')

console.log('\nDetect add-to-cart')
assert(schemaResult.quality.hasAddToCart === true, 'Add-to-cart should be detected')
assert(schemaResult.signals.addToCart === true, 'Add-to-cart signal should be true')
console.log('  PASS')

console.log('\nAnalyze high-confidence discovered pages (integration)')
const productDiscovery = discoverProductPages({
  links: [{ url: 'https://demo.store/products/premium-cotton-tee', isInternal: true }],
  platform: { name: 'shopify' },
  pageScores: [
    {
      url: 'https://demo.store/products/premium-cotton-tee',
      score: 95,
      signals: { schema: true, price: true, addToCart: true, availability: true },
      htmlScore: 65,
      products: [{ name: 'Premium Cotton Tee', valid: true, fields: { brand: true, gtin: true, sku: true, price: true, availability: true, name: true, image: true }, missingFields: [] }],
    },
  ],
})

const forcedHighDiscovery = {
  ...productDiscovery,
  productPages: productDiscovery.productPages.map((page) => ({
    ...page,
    score: 0.95,
    confidence: 'high',
  })),
}

const productAnalysis = analyzeDiscoveredProductPages({
  productDiscovery: forcedHighDiscovery,
  productsAudit: {
    pageScores: [
      {
        url: 'https://demo.store/products/premium-cotton-tee',
        signals: { schema: true, price: true, addToCart: true, availability: true },
        products: [{ name: 'Premium Cotton Tee', valid: true, fields: { brand: true, gtin: true, sku: true, price: true, availability: true, name: true, image: true }, missingFields: [] }],
      },
    ],
    productPages: [],
  },
})

assert(productAnalysis.products.length >= 1, 'At least one high-confidence page should be analyzed')
assert(productAnalysis.summary.analyzed >= 1, 'Summary analyzed count should be >= 1')
console.log('  PASS')

console.log('\nExisting reports still work')
const legacyReport = buildProfessionalReport(
  [{ id: 'G008', passed: false, category: 'gmc', message: 'Payment information incomplete.' }],
  [],
  { mode: 'gmc', legacyEnabled: true, executedModules: ['gmc', 'ads', 'technical', 'trust'] }
)
const legacyFixGuides = generateFixGuides({
  auditMode: 'gmc',
  ruleResults: [{ id: 'G008', passed: false, category: 'gmc', message: 'Payment information incomplete.' }],
})
assert(legacyReport?.scores != null, 'legacy report should still build without productAnalysis')
assert(Array.isArray(legacyFixGuides.fixGuides), 'fix guides should still generate')
console.log('  PASS')

console.log('\nPhase 15.2 Product Page Analyzer Foundation completed')

console.log('\nAccuracy regression — description in HTML only')
const HTML_DESCRIPTION_ONLY = `<!DOCTYPE html>
<html><head><title>Canvas Tote</title></head><body>
<main class="product">
  <h1>Canvas Tote</h1>
  <div class="product__description rte">
    <p>This durable canvas tote bag features reinforced handles, a spacious main compartment, and interior pocket for everyday carry. Designed for shoppers who need a reliable bag for work, travel, and errands.</p>
  </div>
  <span class="product__vendor">Field Supply Co.</span>
  <span class="sku">TOTE-778</span>
  <p>Quality guarantee and 30-day return policy available.</p>
</main></body></html>`
const htmlDescriptionResult = analyzeProductPage('https://demo.store/products/canvas-tote', {
  html: HTML_DESCRIPTION_ONLY,
})
assert(htmlDescriptionResult.extractionConfidence === 'high', 'HTML analysis should be high confidence')
assert(htmlDescriptionResult.productSignals.description.found === true, 'Visible HTML description should be detected')
assert(htmlDescriptionResult.quality.descriptionLength >= 120, 'Description length should reflect visible content')
const htmlDescriptionCompliance = runProductComplianceRules({ products: [htmlDescriptionResult] })
assert(
  !htmlDescriptionCompliance.products[0].issues.some((issue) => issue.ruleId === 'M004' && issue.missing?.includes('Description')),
  'M004 should not flag missing description when HTML description exists'
)
console.log('  PASS')

console.log('\nAccuracy regression — brand object and string JSON-LD')
const BRAND_STRING_HTML = `<!DOCTYPE html><html><body>
<script type="application/ld+json">{"@type":"Product","name":"Hat","brand":"Acme Co","sku":"HAT-1","gtin13":"0123456789012","mpn":"HAT2024","image":"https://demo.store/hat.jpg","offers":{"@type":"Offer","price":"19.99","availability":"https://schema.org/InStock"}}</script>
</body></html>`
const brandStringResult = analyzeProductPage('https://demo.store/products/hat', { html: BRAND_STRING_HTML })
assert(brandStringResult.productSignals.brand.found === true, 'String brand JSON-LD should be detected')
assert(brandStringResult.productSignals.sku.found === true, 'SKU should be detected')
assert(brandStringResult.productSignals.gtin.found === true, 'GTIN13 should be detected')
console.log('  PASS')

console.log('\nAccuracy regression — Shopify variant SKU')
const SHOPIFY_VARIANT_HTML = `<!DOCTYPE html><html><body>
<script type="application/json" id="ProductJson-product-template">{"title":"Variant Tee","vendor":"Demo Brand","variants":[{"sku":"VAR-001","barcode":"0123456789052"}]}</script>
<div class="product__description">A soft variant tee with breathable fabric and reinforced seams for daily wear.</div>
</body></html>`
const shopifyVariantResult = analyzeProductPage('https://demo.store/products/variant-tee', {
  html: SHOPIFY_VARIANT_HTML,
})
assert(shopifyVariantResult.productSignals.sku.found === true, 'Variant SKU should be detected')
assert(shopifyVariantResult.productSignals.gtin.found === true, 'Variant barcode should count as GTIN')
assert(shopifyVariantResult.productSignals.brand.found === true, 'Vendor should count as brand')
console.log('  PASS')

console.log('\nAccuracy regression — warranty and return keyword variations')
const TRUST_HTML = `<!DOCTYPE html><html><body><main class="product">
<div class="product-description">Detailed product copy with material specifications and size chart information for buyers.</div>
<p>Lifetime guarantee on manufacturing defects.</p>
<p>Free returns within 30 days. See our return policy for details.</p>
</main></body></html>`
const trustResult = analyzeProductPage('https://demo.store/products/trust-item', { html: TRUST_HTML })
assert(trustResult.quality.hasWarranty === true, 'Lifetime guarantee should count as warranty')
assert(trustResult.quality.hasReturnInfo === true, 'Return policy text should be detected')
console.log('  PASS')

console.log('\nAccuracy regression — low-confidence pages skip false compliance failures')
const lowConfidenceResult = analyzeProductPage('https://demo.store/products/discovered-only', {
  existingPage: { signals: { schema: true, price: true } },
})
assert(lowConfidenceResult.extractionConfidence === 'low', 'Undiscovered page data should be low confidence')
const lowConfidenceCompliance = runProductComplianceRules({ products: [lowConfidenceResult] })
assert(
  lowConfidenceCompliance.products[0].issues.length === 0,
  'Low-confidence extraction should not produce compliance issues'
)
console.log('  PASS')
