import {
  analyzePaymentPolicyQuality,
  analyzeReturnPolicyQuality,
  analyzeShippingPolicyQuality,
} from '../services/pageContent.js'

function policyPage(url) {
  return { found: true, url }
}

function fetchedPolicy(text, analyzer, extra = {}) {
  const policyQuality = analyzer(text, extra.analyzerOptions)
  return {
    fetched: true,
    textLength: text.length,
    bodyText: text,
    policyQuality,
  }
}

function baseContact() {
  return {
    emails: ['support@impact-calibration.local'],
    phones: ['+1 555 0200'],
    addresses: ['100 Impact Calibration Street, Austin, TX 78701'],
  }
}

function baseStorePages(baseUrl) {
  return {
    paymentPolicy: policyPage(`${baseUrl}/payment-policy`),
    shippingPolicy: policyPage(`${baseUrl}/shipping-policy`),
    refundPolicy: policyPage(`${baseUrl}/refund-policy`),
    aboutUs: { found: true, url: `${baseUrl}/about` },
    contactUs: { found: true, url: `${baseUrl}/contact` },
    privacyPolicy: { found: true, url: `${baseUrl}/privacy` },
  }
}

function buildHealthyProductAudit(productUrl = 'https://impact-calibration.local/products/sample') {
  return {
    scannedPages: 1,
    detectedProducts: 1,
    validProducts: 1,
    productPages: [
      {
        url: productUrl,
        fetched: true,
        score: 85,
        hasProductSchema: true,
        signals: { addToCart: true, schema: true, price: true, availability: true },
        trustContent: {
          descriptionLength: 420,
          hasSpecifications: true,
          marketingHeavy: false,
          imageCount: 4,
          imagesWithAlt: 3,
          hasMainImage: true,
          htmlAttributes: { material: true, size: true, color: true, model: true },
          hasReviews: true,
          hasGuarantee: true,
          hasContactOrOrder: true,
        },
        products: [
          {
            valid: true,
            name: 'Premium Cotton T-Shirt',
            fields: {
              name: true,
              image: true,
              price: true,
              availability: true,
              brand: true,
              sku: true,
              gtin: true,
              mpn: true,
            },
          },
        ],
      },
    ],
    pageScores: [
      {
        url: productUrl,
        htmlSignals: ['Product JSON-LD', 'price', 'add-to-cart', 'Material: Cotton', 'Size: Medium'],
      },
    ],
  }
}

function buildLowTrustProductAudit(productUrl = 'https://impact-calibration.local/products/blank') {
  return {
    scannedPages: 1,
    detectedProducts: 1,
    validProducts: 0,
    productPages: [
      {
        url: productUrl,
        fetched: true,
        hasProductSchema: false,
        signals: { addToCart: false, schema: false, price: false, availability: false },
        trustContent: {
          descriptionLength: 0,
          hasSpecifications: false,
          marketingHeavy: false,
          imageCount: 0,
          imagesWithAlt: 0,
          hasMainImage: false,
          htmlAttributes: { material: false, size: false, color: false, model: false },
          hasReviews: false,
          hasGuarantee: false,
          hasContactOrOrder: false,
        },
        products: [
          {
            valid: false,
            name: 'Mystery Item',
            fields: { name: true, image: false, price: false, availability: false, brand: false },
          },
        ],
      },
    ],
    pageScores: [{ url: productUrl, htmlSignals: [] }],
  }
}

const STRONG_PAYMENT_TEXT =
  'We accept Visa, Mastercard, PayPal, Apple Pay and Google Pay. All prices are shown in USD and billing occurs securely at checkout.'
const STRONG_SHIPPING_TEXT =
  'We offer free standard shipping on domestic orders within the United States. Delivery takes 5-7 business days.'
const STRONG_REFUND_TEXT =
  'You may return unused items within 30 days in original packaging. Contact support@impact-calibration.local to start a return.'

const FIXTURES = {
  'impact-normal': {
    url: 'https://impact-calibration.local/normal',
    contactInfo: baseContact(),
    pages: baseStorePages('https://impact-calibration.local'),
    pageContent: {
      paymentPolicy: fetchedPolicy(STRONG_PAYMENT_TEXT, analyzePaymentPolicyQuality),
      shippingPolicy: fetchedPolicy(STRONG_SHIPPING_TEXT, analyzeShippingPolicyQuality),
      refundPolicy: fetchedPolicy(STRONG_REFUND_TEXT, (text) =>
        analyzeReturnPolicyQuality(text, { emails: ['support@impact-calibration.local'] })
      ),
      homepage: { fetched: true, bodyText: 'Healthy calibration store' },
      contactUs: { fetched: true, bodyText: 'support@impact-calibration.local' },
    },
    productsAudit: buildHealthyProductAudit(),
  },

  'impact-missing-payment': {
    url: 'https://impact-calibration.local/missing-payment',
    contactInfo: baseContact(),
    pages: baseStorePages('https://impact-calibration.local'),
    pageContent: {
      paymentPolicy: fetchedPolicy(
        'Payment is processed securely at checkout. All orders are billed in USD through our payment provider.',
        analyzePaymentPolicyQuality
      ),
      shippingPolicy: fetchedPolicy(STRONG_SHIPPING_TEXT, analyzeShippingPolicyQuality),
      refundPolicy: fetchedPolicy(STRONG_REFUND_TEXT, (text) =>
        analyzeReturnPolicyQuality(text, { emails: ['support@impact-calibration.local'] })
      ),
      homepage: { fetched: true, bodyText: 'Store missing explicit payment methods' },
      contactUs: { fetched: true, bodyText: 'support@impact-calibration.local' },
    },
    productsAudit: buildHealthyProductAudit(),
  },

  'impact-missing-shipping-cost': {
    url: 'https://impact-calibration.local/missing-shipping-cost',
    contactInfo: baseContact(),
    pages: baseStorePages('https://impact-calibration.local'),
    pageContent: {
      paymentPolicy: fetchedPolicy(STRONG_PAYMENT_TEXT, analyzePaymentPolicyQuality),
      shippingPolicy: fetchedPolicy(
        'We ship orders within the United States. Delivery takes 5-7 business days after dispatch.',
        analyzeShippingPolicyQuality
      ),
      refundPolicy: fetchedPolicy(STRONG_REFUND_TEXT, (text) =>
        analyzeReturnPolicyQuality(text, { emails: ['support@impact-calibration.local'] })
      ),
      homepage: { fetched: true, bodyText: 'Store missing shipping cost language' },
      contactUs: { fetched: true, bodyText: 'support@impact-calibration.local' },
    },
    productsAudit: buildHealthyProductAudit(),
  },

  'impact-missing-policies': {
    url: 'https://impact-calibration.local/missing-policies',
    contactInfo: baseContact(),
    pages: {
      paymentPolicy: policyPage('https://impact-calibration.local/payment-policy'),
      shippingPolicy: { found: false, url: null },
      refundPolicy: policyPage('https://impact-calibration.local/refund-policy'),
      aboutUs: { found: true, url: 'https://impact-calibration.local/about' },
      contactUs: { found: true, url: 'https://impact-calibration.local/contact' },
    },
    pageContent: {
      paymentPolicy: fetchedPolicy(STRONG_PAYMENT_TEXT, analyzePaymentPolicyQuality),
      refundPolicy: fetchedPolicy(
        'Returns accepted within 30 days.',
        (text) => analyzeReturnPolicyQuality(text, {})
      ),
      homepage: { fetched: true, bodyText: 'Store missing shipping policy page' },
      contactUs: { fetched: true, bodyText: 'support@impact-calibration.local' },
    },
    productsAudit: buildHealthyProductAudit(),
  },

  'impact-low-product-trust': {
    url: 'https://impact-calibration.local/low-product-trust',
    contactInfo: baseContact(),
    pages: baseStorePages('https://impact-calibration.local'),
    pageContent: {
      paymentPolicy: fetchedPolicy(STRONG_PAYMENT_TEXT, analyzePaymentPolicyQuality),
      shippingPolicy: fetchedPolicy(STRONG_SHIPPING_TEXT, analyzeShippingPolicyQuality),
      refundPolicy: fetchedPolicy(STRONG_REFUND_TEXT, (text) =>
        analyzeReturnPolicyQuality(text, { emails: ['support@impact-calibration.local'] })
      ),
      homepage: { fetched: true, bodyText: 'Store with weak product pages' },
      contactUs: { fetched: true, bodyText: 'support@impact-calibration.local' },
    },
    productsAudit: buildLowTrustProductAudit(),
  },
}

export function getImpactCalibrationFixture(caseUrl) {
  if (!caseUrl?.startsWith('fixture:')) return null
  const fixtureId = caseUrl.slice('fixture:'.length)
  const fixture = FIXTURES[fixtureId]
  if (!fixture) return null
  return structuredClone(fixture)
}

export function applyFixSimulation(auditData, ruleId) {
  const data = structuredClone(auditData)
  const baseUrl = data.url || 'https://impact-calibration.local'

  switch (ruleId) {
    case 'G008':
      data.pages = data.pages || {}
      data.pages.paymentPolicy = policyPage(`${baseUrl}/payment-policy`)
      data.pageContent = data.pageContent || {}
      data.pageContent.paymentPolicy = fetchedPolicy(STRONG_PAYMENT_TEXT, analyzePaymentPolicyQuality)
      break

    case 'G010':
      data.pages = data.pages || {}
      data.pages.shippingPolicy = policyPage(`${baseUrl}/shipping-policy`)
      data.pageContent = data.pageContent || {}
      data.pageContent.shippingPolicy = fetchedPolicy(STRONG_SHIPPING_TEXT, analyzeShippingPolicyQuality)
      break

    case 'M001':
      data.contactInfo = baseContact()
      data.pageContent = data.pageContent || {}
      data.pageContent.contactUs = {
        fetched: true,
        bodyText:
          'Contact support@impact-calibration.local or call +1 555 0200. Mailing Address: 100 Impact Calibration Street, Austin, TX 78701',
      }
      data.pageContent.homepage = {
        fetched: true,
        bodyText: 'Impact Calibration Store — 100 Impact Calibration Street, Austin, TX 78701',
        footerText: 'Mailing Address: 100 Impact Calibration Street, Austin, TX 78701',
      }
      break

    case 'M002':
      data.pages = baseStorePages(baseUrl)
      data.pageContent = data.pageContent || {}
      data.pageContent.refundPolicy = fetchedPolicy(STRONG_REFUND_TEXT, (text) =>
        analyzeReturnPolicyQuality(text, { emails: ['support@impact-calibration.local'] })
      )
      data.pageContent.shippingPolicy = fetchedPolicy(STRONG_SHIPPING_TEXT, analyzeShippingPolicyQuality)
      data.pageContent.paymentPolicy = fetchedPolicy(STRONG_PAYMENT_TEXT, analyzePaymentPolicyQuality)
      break

    case 'M003':
      data.productsAudit = buildHealthyProductAudit(`${baseUrl}/products/fixed-sample`)
      break

    case 'G005':
      data.productsAudit = buildHealthyProductAudit(`${baseUrl}/products/fixed-sample`)
      break

    default:
      break
  }

  return data
}
