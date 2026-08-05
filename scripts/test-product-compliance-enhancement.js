import { analyzeProductPage } from '../services/productAnalyzer.js'
import { runProductComplianceRules } from '../services/productComplianceRules.js'
import { spawnSync } from 'node:child_process'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const BASE_PRODUCT_HTML = `<!DOCTYPE html>
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
    <button class="single_add_to_cart_button">Add to cart</button>
    <img src="https://demo.store/images/tee.jpg" alt="Premium Cotton Tee">
  </main>
</body>
</html>`

console.log('Product Compliance Enhancement Tests\n')

console.log('G013 — missing price detected')
const missingPriceHtml = BASE_PRODUCT_HTML
  .replace('"price": "29.99",', '')
  .replace('<span class="price">$29.99</span>', '')
const missingPriceProduct = analyzeProductPage('https://demo.store/products/no-price', { html: missingPriceHtml })
const missingPriceCompliance = runProductComplianceRules({ products: [missingPriceProduct] })
const g013Missing = missingPriceCompliance.products[0].issues.find((issue) => issue.ruleId === 'G013')
assert(g013Missing != null, 'G013 should fire when price is missing')
assert(g013Missing.missing?.includes('Price'), 'G013 should list Price as missing')
console.log('  PASS')

console.log('\nG013 — inconsistent price detected')
const inconsistentPriceHtml = BASE_PRODUCT_HTML.replace('<span class="price">$29.99</span>', '<span class="price">$39.99</span>')
const inconsistentPriceProduct = analyzeProductPage('https://demo.store/products/inconsistent-price', {
  html: inconsistentPriceHtml,
})
const inconsistentPriceCompliance = runProductComplianceRules({ products: [inconsistentPriceProduct] })
const g013Inconsistent = inconsistentPriceCompliance.products[0].issues.find((issue) => issue.ruleId === 'G013')
assert(g013Inconsistent != null, 'G013 should fire when prices mismatch')
assert(
  g013Inconsistent.warnings?.some((warning) => /match schema price/i.test(warning)),
  'G013 should warn about schema/display mismatch'
)
console.log('  PASS')

console.log('\nG014 — missing availability detected')
const missingAvailabilityHtml = BASE_PRODUCT_HTML
  .replace('"availability": "https://schema.org/InStock"', '')
  .replace('<link itemprop="availability" href="https://schema.org/InStock">', '')
const missingAvailabilityProduct = analyzeProductPage('https://demo.store/products/no-availability', {
  html: missingAvailabilityHtml,
})
const missingAvailabilityCompliance = runProductComplianceRules({ products: [missingAvailabilityProduct] })
const g014Missing = missingAvailabilityCompliance.products[0].issues.find((issue) => issue.ruleId === 'G014')
assert(g014Missing != null, 'G014 should fire when availability is missing')
assert(g014Missing.missing?.includes('Availability'), 'G014 should list Availability as missing')
console.log('  PASS')

console.log('\nG014 — inconsistent availability detected')
const inconsistentAvailabilityHtml = BASE_PRODUCT_HTML
  .replace('<link itemprop="availability" href="https://schema.org/InStock">', '<p>Sold out</p>')
const inconsistentAvailabilityProduct = analyzeProductPage('https://demo.store/products/inconsistent-availability', {
  html: inconsistentAvailabilityHtml,
})
const inconsistentAvailabilityCompliance = runProductComplianceRules({ products: [inconsistentAvailabilityProduct] })
const g014Inconsistent = inconsistentAvailabilityCompliance.products[0].issues.find((issue) => issue.ruleId === 'G014')
assert(g014Inconsistent != null, 'G014 should fire when availability mismatches')
assert(
  g014Inconsistent.warnings?.some((warning) => /availability/i.test(warning)),
  'G014 should warn about availability mismatch'
)
console.log('  PASS')

console.log('\nM006 — missing images and alt text detected')
const noImagesHtml = BASE_PRODUCT_HTML.replace('<img src="https://demo.store/images/tee.jpg" alt="Premium Cotton Tee">', '')
const noImagesProduct = analyzeProductPage('https://demo.store/products/no-images', { html: noImagesHtml })
const noImagesCompliance = runProductComplianceRules({ products: [noImagesProduct] })
const m006NoImages = noImagesCompliance.products[0].issues.find((issue) => issue.ruleId === 'M006')
assert(m006NoImages != null, 'M006 should fire when product images are missing')
assert(m006NoImages.missing?.includes('Product images'), 'M006 should list missing product images')

const missingAltHtml = BASE_PRODUCT_HTML.replace('alt="Premium Cotton Tee"', 'alt=""')
const missingAltProduct = analyzeProductPage('https://demo.store/products/no-alt', { html: missingAltHtml })
const missingAltCompliance = runProductComplianceRules({ products: [missingAltProduct] })
const m006NoAlt = missingAltCompliance.products[0].issues.find((issue) => issue.ruleId === 'M006')
assert(m006NoAlt != null, 'M006 should fire when alt text is missing')
assert(m006NoAlt.missing?.includes('Image alt text'), 'M006 should list missing alt text')
console.log('  PASS')

console.log('\nM007 — title quality detected')
const placeholderTitleHtml = BASE_PRODUCT_HTML
  .replace('<title>Premium Cotton Tee | Demo Store</title>', '<title>Product</title>')
  .replace('<h1>Premium Cotton Tee</h1>', '<h1>Product</h1>')
  .replace('"name": "Premium Cotton Tee",', '"name": "Product",')
const placeholderTitleProduct = analyzeProductPage('https://demo.store/products/placeholder-title', {
  html: placeholderTitleHtml,
})
const placeholderTitleCompliance = runProductComplianceRules({ products: [placeholderTitleProduct] })
const m007Placeholder = placeholderTitleCompliance.products[0].issues.find((issue) => issue.ruleId === 'M007')
assert(m007Placeholder != null, 'M007 should fire for placeholder titles')
assert(
  m007Placeholder.warnings?.some((warning) => /placeholder/i.test(warning)),
  'M007 should warn about placeholder title'
)
console.log('  PASS')

console.log('\nAnalyzer signals extended')
const healthyProduct = analyzeProductPage('https://demo.store/products/healthy', { html: BASE_PRODUCT_HTML })
assert(healthyProduct.signals.hasPrice === true, 'signals.hasPrice should be exposed')
assert(healthyProduct.signals.hasCurrency === true, 'signals.hasCurrency should be exposed')
assert(healthyProduct.signals.hasAvailability === true, 'signals.hasAvailability should be exposed')
assert(healthyProduct.signals.imageCount >= 1, 'signals.imageCount should be exposed')
assert(healthyProduct.signals.hasAltText === true, 'signals.hasAltText should be exposed')
assert(healthyProduct.signals.titleLength >= 10, 'signals.titleLength should be exposed')
assert(healthyProduct.quality.imageCount >= 1, 'quality.imageCount should be exposed')
console.log('  PASS')

console.log('\nLow-confidence products avoid new-rule false positives')
const lowConfidenceProduct = analyzeProductPage('https://demo.store/products/discovered-only', {
  existingPage: { signals: { schema: true, price: true } },
})
const lowConfidenceCompliance = runProductComplianceRules({ products: [lowConfidenceProduct] })
assert(
  !lowConfidenceCompliance.products[0].issues.some((issue) =>
    ['G013', 'G014', 'M006', 'M007'].includes(issue.ruleId)
  ),
  'Low-confidence products should not trigger new rules'
)
console.log('  PASS')

console.log('\nExisting G011/G012/M004/M005 regression scripts')
for (const script of ['test-product-compliance-rules.js', 'test-product-analyzer.js']) {
  const result = spawnSync(process.execPath, [`scripts/${script}`], {
    cwd: new URL('..', import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1'),
    encoding: 'utf8',
  })
  assert(result.status === 0, `${script} should still pass:\n${result.stdout}\n${result.stderr}`)
}
console.log('  PASS')

console.log('\nPhase 15.5 Product Compliance Enhancement completed')
