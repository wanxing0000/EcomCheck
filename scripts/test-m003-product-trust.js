import { businessIdentityRule } from '../modules/trust/rules/M001-business-identity.js'
import { productTrustSignalsRule } from '../modules/trust/rules/M003-product-trust.js'
import { analyzeProductPagesTrust } from '../modules/trust/rules/_helpers.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const incompleteProductAudit = {
  productsAudit: {
    scannedPages: 1,
    productPages: [
      {
        url: 'https://example-store.com/products/sample',
        fetched: true,
        hasProductSchema: true,
        signals: { addToCart: true, schema: true, price: true },
        products: [
          {
            valid: true,
            name: 'Sample Candle',
            fields: { name: true, image: true, price: true, availability: true, brand: true },
          },
        ],
        trustContent: {
          descriptionLength: 180,
          hasSpecifications: false,
          marketingHeavy: false,
          imageCount: 1,
          imagesWithAlt: 0,
          hasMainImage: true,
          htmlAttributes: { material: false, size: false, color: false, model: false },
          hasReviews: false,
          hasGuarantee: false,
          hasContactOrOrder: true,
        },
      },
    ],
    pageScores: [
      {
        url: 'https://example-store.com/products/sample',
        htmlSignals: ['Product JSON-LD', 'price', 'add-to-cart'],
      },
    ],
  },
}

const report = analyzeProductPagesTrust(incompleteProductAudit)
const result = productTrustSignalsRule.check(incompleteProductAudit)

console.log('Overall score:', report.score)
console.log('Risk level:', report.riskLevel)
console.log('Message:', result.message)
console.log('Factors:')
for (const factor of report.factors) {
  console.log(`- ${factor.name}: ${factor.score}/100`)
  console.log(`  detected: ${factor.detected.join(', ') || '(none)'}`)
  console.log(`  missing: ${factor.missing.join(', ') || '(none)'}`)
  console.log(`  recommendation: ${factor.recommendation}`)
}

assert(report.factors.length === 4, 'expected 4 trust factors')
assert(report.riskLevel !== 'high', `score ${report.score} should not auto-map to high risk`)
assert(result.message.includes('Product trust analysis'), 'message should be explanatory')
assert(result.message.includes('Product Description Quality'), 'message should name factor gaps')
assert(result.productTrustReport?.factors?.[0]?.recommendation, 'factor recommendation required')

console.log('\nPASS: M003 product trust analysis is explainable')
