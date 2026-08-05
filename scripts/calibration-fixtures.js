import {
  analyzePaymentPolicyQuality,
  analyzeReturnPolicyQuality,
  analyzeShippingPolicyQuality,
} from '../services/pageContent.js'

function policyPage(url) {
  return { found: true, url }
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

function baseContact() {
  return {
    emails: ['support@calibration.local'],
    phones: ['+1 555 0100'],
    addresses: ['123 Calibration Street, Austin, TX 78701'],
  }
}

function basePageContent({ paymentText, shippingText, refundText }) {
  return {
    paymentPolicy: fetchedPolicy(paymentText, analyzePaymentPolicyQuality),
    shippingPolicy: fetchedPolicy(shippingText, analyzeShippingPolicyQuality),
    refundPolicy: fetchedPolicy(refundText, (text) => analyzeReturnPolicyQuality(text, {})),
    homepage: {
      fetched: true,
      bodyText: 'Calibration store with policy pages and contact details.',
      footerText: 'Mailing Address: 123 Calibration Street, Austin, TX 78701',
    },
    contactUs: {
      fetched: true,
      bodyText: 'Contact support@calibration.local. Address: 123 Calibration Street, Austin, TX 78701',
    },
  }
}

function fetchedPolicy(text, analyzer, extra = {}) {
  const policyQuality = analyzer(text, extra.analyzerOptions)
  return {
    fetched: true,
    textLength: text.length,
    bodyText: text,
    policyQuality,
    ...extra.fields,
  }
}

const FIXTURES = {
  'payment-visa-mastercard-paypal': {
    url: 'https://calibration.local/payment-policy',
    html: '<html><head><title>Calibration Payment</title></head></html>',
    meta: { title: 'Calibration Payment' },
    contactInfo: {
      emails: ['support@calibration.local'],
      phones: ['+1 555 0100'],
      addresses: ['123 Calibration Street, Austin, TX 78701'],
    },
    pages: {
      paymentPolicy: policyPage('https://calibration.local/payment-policy'),
      shippingPolicy: policyPage('https://calibration.local/shipping-policy'),
      refundPolicy: policyPage('https://calibration.local/refund-policy'),
      aboutUs: { found: true, url: 'https://calibration.local/about' },
      contactUs: { found: true, url: 'https://calibration.local/contact' },
      privacyPolicy: { found: true, url: 'https://calibration.local/privacy' },
    },
    pageContent: {
      paymentPolicy: fetchedPolicy(
        'We accept Visa, Mastercard and PayPal for all orders. All prices are shown in USD. Billing occurs at checkout.',
        analyzePaymentPolicyQuality
      ),
      shippingPolicy: fetchedPolicy(
        'We currently offer Free Standard Shipping on domestic orders. Delivery within 5-7 business days across the United States.',
        analyzeShippingPolicyQuality
      ),
      refundPolicy: fetchedPolicy(
        'You may return unused items within 30 days. Contact support@calibration.local to start a return.',
        (text) => analyzeReturnPolicyQuality(text, {})
      ),
      homepage: { fetched: true, bodyText: 'Calibration store', footerText: '123 Calibration Street' },
      contactUs: {
        fetched: true,
        bodyText: 'Contact us at support@calibration.local. Address: 123 Calibration Street, Austin, TX 78701',
      },
    },
    productsAudit: buildHealthyProductAudit(),
  },

  'payment-apple-google-pay': {
    url: 'https://calibration.local/payment-apple-google',
    html: '<html><head><title>Calibration Payment</title></head></html>',
    meta: { title: 'Calibration Payment' },
    contactInfo: {
      emails: ['payments@calibration.local'],
      phones: ['+1 555 0101'],
      addresses: ['456 Payment Lane, Austin, TX 78702'],
    },
    pages: {
      paymentPolicy: policyPage('https://calibration.local/payment-apple-google'),
      shippingPolicy: policyPage('https://calibration.local/shipping-policy'),
      refundPolicy: policyPage('https://calibration.local/refund-policy'),
      aboutUs: { found: true, url: 'https://calibration.local/about' },
      contactUs: { found: true, url: 'https://calibration.local/contact' },
      privacyPolicy: { found: true, url: 'https://calibration.local/privacy' },
    },
    pageContent: {
      paymentPolicy: fetchedPolicy(
        'Payment options include Apple Pay, Google Pay, credit card and secure checkout through our checkout provider.',
        analyzePaymentPolicyQuality
      ),
      shippingPolicy: fetchedPolicy(
        'Complimentary shipping is available on orders over $50 within the United States. Estimated delivery in 4-6 business days.',
        analyzeShippingPolicyQuality
      ),
      refundPolicy: fetchedPolicy(
        'Returns accepted within 14 days in original condition. Email payments@calibration.local for assistance.',
        (text) => analyzeReturnPolicyQuality(text, {})
      ),
      homepage: { fetched: true, bodyText: 'Calibration Apple/Google Pay store' },
      contactUs: { fetched: true, bodyText: 'Email payments@calibration.local' },
    },
    productsAudit: buildHealthyProductAudit('https://calibration.local/products/sample'),
  },

  'shipping-free-standard': {
    url: 'https://calibration.local/shipping-free',
    html: '<html><head><title>Calibration Shipping</title></head></html>',
    meta: { title: 'Calibration Shipping' },
    contactInfo: baseContact(),
    pages: baseStorePages('https://calibration.local'),
    pageContent: basePageContent({
      paymentText: 'We accept Visa and Mastercard. Payment is processed securely at checkout.',
      shippingText:
        ' We currently offer Free Standard Shipping on all domestic orders. Orders ship within 2 business days to the United States.',
      refundText:
        'Returns are accepted within 30 days if items are unused. Contact customer service for a refund.',
    }),
    productsAudit: buildHealthyProductAudit(),
  },

  'shipping-flat-rate': {
    url: 'https://calibration.local/shipping-flat-rate',
    html: '<html><head><title>Calibration Shipping</title></head></html>',
    meta: { title: 'Calibration Shipping' },
    contactInfo: baseContact(),
    pages: baseStorePages('https://calibration.local'),
    pageContent: basePageContent({
      paymentText: 'We accept Visa, Mastercard and PayPal. Billing terms are shown at checkout.',
      shippingText:
        'We offer flat rate shipping of $6.95 across the United States. Orders ship within 3-5 business days.',
      refundText: 'You may return items within 30 days. Contact us to request a refund.',
    }),
    productsAudit: buildHealthyProductAudit(),
  },

  'shipping-calculated-checkout': {
    url: 'https://calibration.local/shipping-calculated',
    html: '<html><head><title>Calibration Shipping</title></head></html>',
    meta: { title: 'Calibration Shipping' },
    contactInfo: baseContact(),
    pages: baseStorePages('https://calibration.local'),
    pageContent: basePageContent({
      paymentText: 'We accept Visa, Mastercard, PayPal and debit card payments at checkout.',
      shippingText:
        'Shipping costs are calculated at checkout based on your delivery address. We ship domestically within 5-7 business days.',
      refundText: 'Return window is 30 days from delivery. Contact support for return instructions.',
    }),
    productsAudit: buildHealthyProductAudit(),
  },

  'shipping-included': {
    url: 'https://calibration.local/shipping-included',
    html: '<html><head><title>Calibration Shipping</title></head></html>',
    meta: { title: 'Calibration Shipping' },
    contactInfo: baseContact(),
    pages: baseStorePages('https://calibration.local'),
    pageContent: basePageContent({
      paymentText: 'We accept Visa, Mastercard and PayPal. All prices include applicable taxes where required.',
      shippingText:
        'Shipping is included in the product price for all orders within the United Kingdom. Delivery takes 3-5 business days.',
      refundText:
        'You may return products within 30 days in original packaging. Email support for a refund.',
    }),
    productsAudit: buildHealthyProductAudit(),
  },

  'm002-strong-policies': {
    url: 'https://calibration.local/strong-policies',
    contactInfo: {
      emails: ['support@calibration.local'],
      phones: ['+1 555 0100'],
      addresses: ['789 Policy Road, Austin, TX 78703'],
    },
    pages: {
      paymentPolicy: policyPage('https://calibration.local/payment-policy'),
      shippingPolicy: policyPage('https://calibration.local/shipping-policy'),
      refundPolicy: policyPage('https://calibration.local/refund-policy'),
      aboutUs: { found: true, url: 'https://calibration.local/about' },
      contactUs: { found: true, url: 'https://calibration.local/contact' },
      privacyPolicy: { found: true, url: 'https://calibration.local/privacy' },
    },
    pageContent: {
      paymentPolicy: fetchedPolicy(
        'We accept Visa, Mastercard, PayPal, Apple Pay and Google Pay. All charges are processed securely at checkout in USD.',
        analyzePaymentPolicyQuality
      ),
      shippingPolicy: fetchedPolicy(
        'Free standard shipping is available nationwide. Most orders arrive within 5-7 business days. Shipping is included for qualifying bundles.',
        analyzeShippingPolicyQuality
      ),
      refundPolicy: fetchedPolicy(
        'You may return unused items within 30 days in original packaging. Refunds are processed within 5 business days after inspection. Contact support@calibration.local for help.',
        (text) => analyzeReturnPolicyQuality(text, {})
      ),
      homepage: { fetched: true, bodyText: 'Strong policy store' },
      contactUs: {
        fetched: true,
        bodyText: 'Contact support@calibration.local. Address: 789 Policy Road, Austin, TX 78703',
      },
    },
    productsAudit: buildHealthyProductAudit(),
  },

  'm003-normal-product': {
    url: 'https://calibration.local/normal-product',
    contactInfo: {
      emails: ['support@calibration.local'],
      phones: ['+1 555 0100'],
      addresses: ['123 Product Street, Austin, TX 78701'],
    },
    pages: {
      paymentPolicy: policyPage('https://calibration.local/payment-policy'),
      shippingPolicy: policyPage('https://calibration.local/shipping-policy'),
      refundPolicy: policyPage('https://calibration.local/refund-policy'),
      aboutUs: { found: true, url: 'https://calibration.local/about' },
      contactUs: { found: true, url: 'https://calibration.local/contact' },
      privacyPolicy: { found: true, url: 'https://calibration.local/privacy' },
    },
    pageContent: {
      paymentPolicy: fetchedPolicy(
        'We accept Visa, Mastercard and PayPal. Payment is collected at checkout.',
        analyzePaymentPolicyQuality
      ),
      shippingPolicy: fetchedPolicy(
        'Free standard shipping within the United States. Delivery in 4-6 business days.',
        analyzeShippingPolicyQuality
      ),
      refundPolicy: fetchedPolicy(
        'Returns accepted within 30 days. Contact support@calibration.local to start a return.',
        (text) => analyzeReturnPolicyQuality(text, {})
      ),
      homepage: { fetched: true, bodyText: 'Normal product store' },
      contactUs: { fetched: true, bodyText: 'support@calibration.local' },
    },
    productsAudit: buildHealthyProductAudit('https://calibration.local/products/premium-cotton-tee'),
  },

  'payment-none': {
    url: 'https://calibration.local/payment-none',
    pages: {
      paymentPolicy: policyPage('https://calibration.local/payment-none'),
      shippingPolicy: policyPage('https://calibration.local/shipping-policy'),
      refundPolicy: policyPage('https://calibration.local/refund-policy'),
    },
    pageContent: {
      paymentPolicy: fetchedPolicy('No payment information is provided on this page.', analyzePaymentPolicyQuality),
      shippingPolicy: fetchedPolicy(
        'Orders ship within the United States in 5-7 business days. Shipping fees may apply.',
        analyzeShippingPolicyQuality
      ),
      refundPolicy: fetchedPolicy(
        'Returns accepted within 30 days. Contact us for assistance.',
        (text) => analyzeReturnPolicyQuality(text, {})
      ),
    },
    contactInfo: { emails: ['support@calibration.local'], phones: [], addresses: [] },
    productsAudit: buildHealthyProductAudit(),
  },
}

function buildHealthyProductAudit(productUrl = 'https://calibration.local/products/sample') {
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
        schemas: [
          {
            fields: {
              brand: true,
              sku: true,
              gtin: true,
              mpn: true,
              name: true,
              image: true,
              price: true,
              availability: true,
            },
          },
        ],
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

export function getCalibrationFixture(caseUrl) {
  if (!caseUrl?.startsWith('fixture:')) return null
  const fixtureId = caseUrl.slice('fixture:'.length)
  return FIXTURES[fixtureId] || null
}

export { FIXTURES }
