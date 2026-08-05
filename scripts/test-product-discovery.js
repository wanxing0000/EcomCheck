import { discoverProductPages, getConfidenceTier } from '../services/productDiscovery.js'
import { generateFixGuides } from '../services/fixGuideGenerator.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function buildLinks(urls) {
  return urls.map((url) => ({ url, isInternal: true, path: new URL(url).pathname }))
}

console.log('Product Page Discovery Tests\n')

console.log('Shopify style URLs detected')
const shopify = discoverProductPages({
  links: buildLinks([
    'https://demo.myshopify.com/products/blue-widget',
    'https://demo.myshopify.com/collections/summer/products/blue-widget',
    'https://demo.myshopify.com/blogs/news/sale',
  ]),
  platform: { name: 'shopify' },
})
assert(shopify.productPages.length >= 2, 'Shopify product URLs should be detected')
assert(
  shopify.productPages.some((page) => page.url.includes('/products/')),
  'Shopify /products/ URL should be included'
)
assert(
  shopify.productPages.every((page) => !page.url.includes('/blogs/')),
  'Blog URLs should be excluded from product pages'
)
console.log(`  detected=${shopify.productPages.length}`)
console.log('  PASS')

console.log('\nWooCommerce style URLs detected')
const woo = discoverProductPages({
  links: buildLinks([
    'https://woo-store.test/product/handmade-mug',
    'https://woo-store.test/shop/accessory',
    'https://woo-store.test/product-category/mugs',
  ]),
  platform: { name: 'woocommerce' },
})
assert(woo.productPages.some((page) => page.url.includes('/product/handmade-mug')), 'WooCommerce product URL detected')
assert(!woo.productPages.some((page) => page.url.includes('/product-category/')), 'Category URLs should be ignored')
console.log('  PASS')

console.log('\nBlog URLs ignored')
const blog = discoverProductPages({
  links: buildLinks([
    'https://store.test/blog/how-to-style',
    'https://store.test/news/launch',
    'https://store.test/articles/guide',
  ]),
})
assert(blog.productPages.length === 0, 'Blog/news/article URLs should not be detected as products')
console.log('  PASS')

console.log('\nPolicy URLs ignored')
const policies = discoverProductPages({
  links: buildLinks([
    'https://store.test/privacy-policy',
    'https://store.test/refund-policy',
    'https://store.test/shipping-policy',
    'https://store.test/about-us',
    'https://store.test/contact',
  ]),
})
assert(policies.productPages.length === 0, 'Policy/about/contact URLs should be ignored')
console.log('  PASS')

console.log('\nProduct schema increases confidence')
const withoutSchema = discoverProductPages({
  links: buildLinks(['https://store.test/products/schema-test']),
})
const withSchema = discoverProductPages({
  links: buildLinks(['https://store.test/products/schema-test']),
  pageScores: [
    {
      url: 'https://store.test/products/schema-test',
      signals: { schema: true, price: true, addToCart: true },
      htmlScore: 65,
      products: [{ name: 'Schema Test Product' }],
    },
  ],
})
assert(withSchema.productPages.length === 1, 'Product URL should be discovered')
assert(
  withSchema.productPages[0].score > withoutSchema.productPages[0].score,
  'Schema signals should increase confidence score'
)
assert(
  withSchema.productPages[0].signals.includes('Product schema present'),
  'Schema signal should appear in discovery signals'
)
assert(getConfidenceTier(withSchema.productPages[0].score) === 'high', 'Schema-backed page should be high confidence')
console.log(`  without=${withoutSchema.productPages[0].score}, with=${withSchema.productPages[0].score}`)
console.log('  PASS')

console.log('\nDuplicate URLs deduplicated')
const dedupe = discoverProductPages({
  links: buildLinks([
    'https://store.test/products/widget',
    'https://store.test/products/widget/',
    'https://store.test/products/widget',
  ]),
})
assert(dedupe.productPages.length === 1, 'Duplicate product URLs should be deduplicated')
console.log('  PASS')

console.log('\nExisting audit reports still work (no productDiscovery field)')
const legacyReport = buildProfessionalReport(
  [
    { id: 'T001', passed: true, category: 'trust', message: 'Contact information detected: email.' },
    { id: 'G008', passed: false, category: 'gmc', message: 'Payment information incomplete.' },
  ],
  [],
  { mode: 'gmc', legacyEnabled: true, executedModules: ['gmc', 'ads', 'technical', 'trust'] }
)
const legacyFixGuides = generateFixGuides({
  auditMode: 'gmc',
  ruleResults: [
    { id: 'G008', passed: false, category: 'gmc', message: 'Payment information incomplete.' },
  ],
})
assert(legacyReport?.scores != null, 'legacy professional report should still build')
assert(Array.isArray(legacyFixGuides.fixGuides), 'fix guides should still generate')
console.log('  PASS')

console.log('\nPhase 15.1 Product Page Discovery completed')
