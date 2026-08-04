import { runRules } from '../rules/index.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function runScenario(name, auditData, expectations) {
  const results = runRules(auditData, {
    auditMode: 'gmc',
    modules: ['gmc', 'ads', 'technical', 'trust'],
    legacyEnabled: true,
  })

  const report = buildProfessionalReport(results, [], {
    mode: 'gmc',
    legacyEnabled: true,
    executedModules: ['gmc', 'ads', 'technical', 'trust'],
  })

  const approvalRisk = report.gmcReadiness?.approvalRisk

  console.log(`\n=== ${name} ===`)
  console.log('level:', approvalRisk?.level)
  console.log('readinessScore:', approvalRisk?.readinessScore)
  console.log('summary:', approvalRisk?.summary)
  console.log(
    'riskFactors:',
    approvalRisk?.riskFactors?.map((factor) => `${factor.id}:${factor.severity}`).join(', ') || '(none)'
  )

  assert(approvalRisk, `${name}: gmcReadiness.approvalRisk missing`)
  assert(approvalRisk.readinessScore != null, `${name}: readinessScore missing`)
  assert(!('confidence' in approvalRisk), `${name}: confidence field should not exist`)
  assert(approvalRisk.level === expectations.level, `${name}: expected level ${expectations.level}, got ${approvalRisk.level}`)

  if (expectations.includesFactor) {
    assert(
      approvalRisk.riskFactors.some((factor) => factor.id === expectations.includesFactor),
      `${name}: expected risk factor ${expectations.includesFactor}`
    )
  }

  for (const factor of approvalRisk.riskFactors) {
    for (const key of ['id', 'title', 'severity', 'reason', 'impact', 'recommendation']) {
      assert(factor[key], `${name}: riskFactor ${factor.id} missing ${key}`)
    }
  }

  console.log('PASS')
}

runScenario(
  'Normal website: level low',
  {
    url: 'https://good-store.com',
    html: '<html><head><title>Good Store Inc</title></head></html>',
    meta: { title: 'Good Store Inc' },
    contactInfo: {
      emails: ['support@good-store.com'],
      phones: ['+1 555 0100'],
      addresses: ['123 Main Street, Austin, TX 78701'],
    },
    pages: {
      refundPolicy: { found: true, url: 'https://good-store.com/refund' },
      shippingPolicy: { found: true, url: 'https://good-store.com/shipping' },
      paymentPolicy: { found: true, url: 'https://good-store.com/payment' },
      aboutUs: { found: true, url: 'https://good-store.com/about' },
      contactUs: { found: true, url: 'https://good-store.com/contact' },
      privacyPolicy: { found: true, url: 'https://good-store.com/privacy' },
    },
    pageContent: {
      homepage: {
        fetched: true,
        bodyText: 'Welcome to Good Store Inc',
        footerText: 'Mailing Address: 123 Main Street, Austin, TX 78701',
      },
      contactUs: {
        fetched: true,
        bodyText: 'Contact Good Store Inc. Mailing Address: 123 Main Street, Austin, TX 78701',
        footerText: '',
      },
      refundPolicy: {
        fetched: true,
        textLength: 500,
        policyQuality: {
          qualityScore: 90,
          missing: [],
          risks: [],
          checks: {
            sufficientLength: true,
            refundKeywords: true,
            returnKeywords: true,
            returnWindow: true,
            condition: true,
            contactInformation: true,
          },
        },
      },
      shippingPolicy: {
        fetched: true,
        textLength: 400,
        policyQuality: {
          qualityScore: 85,
          missing: [],
          risks: [],
          checks: {
            sufficientLength: true,
            shippingKeywords: true,
            deliveryTime: true,
            shippingRegions: true,
            shippingCost: true,
          },
        },
      },
      paymentPolicy: {
        fetched: true,
        textLength: 350,
        policyQuality: {
          qualityScore: 88,
          missing: [],
          risks: [],
          checks: {
            sufficientLength: true,
            paymentKeywords: true,
            paymentMethods: true,
            currencyOrPricing: true,
            hasPaymentSignals: true,
          },
        },
      },
      aboutUs: { fetched: true, title: 'About Good Store Inc', h1: 'About Us', textLength: 300 },
      privacyPolicy: { fetched: true, textLength: 400 },
    },
    productsAudit: {
      scannedPages: 1,
      detectedProducts: 1,
      validProducts: 1,
      productPages: [
        {
          url: 'https://good-store.com/products/item',
          fetched: true,
          score: 80,
          hasProductSchema: true,
          signals: { addToCart: true, schema: true, price: true, availability: true },
          trustContent: {
            descriptionLength: 420,
            hasSpecifications: true,
            marketingHeavy: false,
            imageCount: 3,
            imagesWithAlt: 2,
            hasMainImage: true,
            htmlAttributes: { material: true, size: true, color: true, model: false },
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
          url: 'https://good-store.com/products/item',
          htmlSignals: ['Product JSON-LD', 'price', 'add-to-cart'],
        },
      ],
    },
    platform: { name: 'shopify' },
    ads: {
      googleTag: { detected: true, signals: ['gtag.js'] },
    },
    seo: {
      robotsTxt: { exists: true, url: 'https://good-store.com/robots.txt' },
      sitemap: { exists: true, url: 'https://good-store.com/sitemap.xml' },
    },
  },
  { level: 'low' }
)

runScenario(
  'Missing policies: level medium/high',
  {
    url: 'https://policy-gap-store.com',
    html: '<html><head><title>Policy Gap Store</title></head></html>',
    meta: { title: 'Policy Gap Store' },
    contactInfo: {
      emails: ['support@policy-gap-store.com'],
      phones: ['+1 555 0200'],
      addresses: ['456 Oak Avenue, Dallas, TX 75201'],
    },
    pages: {
      refundPolicy: { found: false },
      shippingPolicy: { found: false },
      paymentPolicy: { found: false },
      aboutUs: { found: true, url: 'https://policy-gap-store.com/about' },
    },
    pageContent: {
      homepage: {
        fetched: true,
        bodyText: 'Policy Gap Store',
        footerText: '456 Oak Avenue, Dallas, TX 75201',
      },
      aboutUs: { fetched: true, title: 'About Policy Gap Store', h1: 'About', textLength: 200 },
    },
    productsAudit: {
      productPages: [
        {
          url: 'https://policy-gap-store.com/products/item',
          fetched: true,
          score: 75,
          hasProductSchema: true,
          signals: { addToCart: true, schema: true, price: true },
          products: [
            {
              valid: true,
              name: 'Sample Product',
              fields: { name: true, image: true, price: true, availability: true, brand: true },
            },
          ],
        },
      ],
      pageScores: [{ url: 'https://policy-gap-store.com/products/item', htmlSignals: ['Product JSON-LD'] }],
    },
    platform: { name: 'shopify' },
  },
  { level: 'high', includesFactor: 'G003' }
)

runScenario(
  'Missing business identity: level high',
  {
    url: 'https://risky-store.com',
    html: '<html><head><title>Shop</title></head></html>',
    meta: { title: 'Shop' },
    contactInfo: { emails: ['help@gmail.com'], phones: [], addresses: [] },
    pages: {
      refundPolicy: { found: true, url: 'https://risky-store.com/refund' },
      shippingPolicy: { found: true, url: 'https://risky-store.com/shipping' },
      paymentPolicy: { found: true, url: 'https://risky-store.com/payment' },
    },
    pageContent: {
      refundPolicy: {
        fetched: true,
        textLength: 500,
        policyQuality: {
          qualityScore: 90,
          missing: [],
          risks: [],
          checks: {
            sufficientLength: true,
            refundKeywords: true,
            returnKeywords: true,
            returnWindow: true,
            condition: true,
            contactInformation: true,
          },
        },
      },
      shippingPolicy: {
        fetched: true,
        textLength: 400,
        policyQuality: {
          qualityScore: 85,
          missing: [],
          risks: [],
          checks: {
            sufficientLength: true,
            shippingKeywords: true,
            deliveryTime: true,
            shippingRegions: true,
            shippingCost: true,
          },
        },
      },
      paymentPolicy: {
        fetched: true,
        textLength: 350,
        policyQuality: {
          qualityScore: 88,
          missing: [],
          risks: [],
          checks: {
            sufficientLength: true,
            paymentKeywords: true,
            paymentMethods: true,
            currencyOrPricing: true,
            hasPaymentSignals: true,
          },
        },
      },
    },
    productsAudit: { productPages: [], pageScores: [] },
    platform: { name: 'shopify' },
  },
  { level: 'high', includesFactor: 'M001' }
)

console.log('\nAll approval risk backend tests passed.')
