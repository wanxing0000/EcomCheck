import { runModuleRules } from '../modules/_shared/runModuleRules.js'
import { paymentInformationRule } from '../modules/gmc/rules/G008-payment-information.js'
import { shippingPolicyQualityRule } from '../modules/gmc/rules/G010-shipping-policy-quality.js'
import { policyQualityRule } from '../modules/trust/rules/M002-policy-quality.js'
import { productTrustSignalsRule } from '../modules/trust/rules/M003-product-trust.js'
import {
  analyzePaymentPolicyQuality,
  analyzeShippingPolicyQuality,
  analyzeReturnPolicyQuality,
} from '../services/pageContent.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function getRuleResult(results, ruleId) {
  const result = results.find((entry) => entry.id === ruleId)
  assert(result, `${ruleId} result missing`)
  return result
}

function assertEvidence(name, result, expectations) {
  console.log(`\n=== ${name} ===`)
  console.log('status:', result.status)
  console.log('found:', result.evidence?.found?.length ?? 0)
  console.log('missing:', result.evidence?.missing?.length ?? 0)
  if (result.evidence?.found?.[0]) {
    console.log('sample found:', result.evidence.found[0])
  }

  assert(result.status === 'passed' || result.status === 'failed', `${name}: status missing`)
  assert(result.evidence, `${name}: evidence missing`)
  assert(Array.isArray(result.evidence.found), `${name}: evidence.found must be array`)
  assert(Array.isArray(result.evidence.missing), `${name}: evidence.missing must be array`)

  if (expectations.minFound != null) {
    assert(
      result.evidence.found.length >= expectations.minFound,
      `${name}: expected at least ${expectations.minFound} found evidence items`
    )
  }

  if (expectations.includesText) {
    const joined = result.evidence.found.map((item) => item.text).join(' ')
    assert(
      expectations.includesText.some((text) => joined.toLowerCase().includes(text.toLowerCase())),
      `${name}: expected found evidence to include ${expectations.includesText.join(' or ')}`
    )
  }

  if (expectations.pageType) {
    assert(
      result.evidence.found.some((item) => item.pageType === expectations.pageType),
      `${name}: expected pageType ${expectations.pageType}`
    )
  }

  if (expectations.sourceIncludes) {
    assert(
      result.evidence.found.some((item) => item.source.includes(expectations.sourceIncludes)),
      `${name}: expected source to include ${expectations.sourceIncludes}`
    )
  }

  assert(result.evidence.found.length <= 3, `${name}: found evidence should be capped at 3`)
  console.log('PASS')
}

const paymentQuality = analyzePaymentPolicyQuality('We accept Visa and Mastercard')
const shippingQuality = analyzeShippingPolicyQuality('We offer free standard shipping worldwide')
const refundQuality = analyzeReturnPolicyQuality(
  'You may return items within 30 days. Contact us for a refund.',
  {}
)

const auditData = {
  pages: {
    paymentPolicy: { found: true, url: 'https://demo-store.com/payment-policy' },
    shippingPolicy: { found: true, url: 'https://demo-store.com/shipping-policy' },
    refundPolicy: { found: true, url: 'https://demo-store.com/refund-policy' },
  },
  pageContent: {
    paymentPolicy: {
      fetched: true,
      textLength: 120,
      policyQuality: paymentQuality,
    },
    shippingPolicy: {
      fetched: true,
      textLength: 120,
      policyQuality: shippingQuality,
    },
    refundPolicy: {
      fetched: true,
      textLength: 120,
      policyQuality: refundQuality,
    },
  },
  productsAudit: {
    scannedPages: 1,
    productPages: [
      {
        url: 'https://demo-store.com/products/sample',
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
          imageCount: 2,
          imagesWithAlt: 1,
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
        url: 'https://demo-store.com/products/sample',
        htmlSignals: ['Product JSON-LD', 'price', 'add-to-cart'],
      },
    ],
  },
}

const results = runModuleRules(
  [paymentInformationRule, shippingPolicyQualityRule, policyQualityRule, productTrustSignalsRule],
  auditData
)

assertEvidence('G008 payment evidence', getRuleResult(results, 'G008'), {
  minFound: 1,
  includesText: ['Visa', 'Mastercard'],
  pageType: 'paymentPolicy',
  sourceIncludes: '/payment-policy',
})

assertEvidence('G010 shipping evidence', getRuleResult(results, 'G010'), {
  minFound: 1,
  includesText: ['free standard shipping', 'free shipping'],
  pageType: 'shippingPolicy',
  sourceIncludes: '/shipping-policy',
})

assertEvidence('M002 policy evidence', getRuleResult(results, 'M002'), {
  minFound: 1,
  includesText: ['Visa', 'Mastercard', 'free standard shipping', '30 days', 'Refund keywords'],
})

assertEvidence('M003 product trust evidence', getRuleResult(results, 'M003'), {
  minFound: 1,
  pageType: 'productPage',
  sourceIncludes: '/products/sample',
})

console.log('\nAll evidence output tests passed.')
