import { analyzeBusinessIdentity } from '../modules/trust/rules/_helpers.js'
import { businessIdentityRule } from '../modules/trust/rules/M001-business-identity.js'

/**
 * Simulates real crawl payload: no auditData.html, only pageContent + contactInfo.
 * Mailing Address lives in homepage footer (common pattern).
 */
const crawlLikeAudit = {
  url: 'https://example-store.com',
  meta: { title: 'Example Store' },
  pages: {
    contactUs: { found: false, url: null },
    aboutUs: { found: true, url: 'https://example-store.com/pages/about' },
  },
  contactInfo: {
    emails: ['hello@example-store.com'],
    phones: ['+44 20 7946 0958'],
    addresses: [],
    sources: [],
  },
  pageContent: {
    homepage: {
      url: 'https://example-store.com',
      fetched: true,
      bodyText: 'Welcome to Example Store. Shop our latest candles.',
      footerText:
        'Example Store Ltd. Mailing Address: 12 Candle Lane, London, SW1A 1AA, United Kingdom. Email: hello@example-store.com',
      textLength: 50,
    },
    aboutUs: {
      url: 'https://example-store.com/pages/about',
      fetched: true,
      bodyText: 'We are a small business making handmade candles.',
      footerText: '',
      textLength: 48,
    },
  },
}

const identity = analyzeBusinessIdentity(crawlLikeAudit)
const result = businessIdentityRule.check(crawlLikeAudit)

console.log('Simulated crawl payload (no html field)')
console.log('address signal:', identity.signals.address)
console.log('addressEvidence:', identity.addressEvidence)
console.log('detectorInputs:', identity.addressDebug.detectorInputs)
console.log('M001 passed:', result.passed)

if (!identity.signals.address) {
  console.error('FAIL: footer Mailing Address should be detected via pageContent.homepage.footerText')
  process.exit(1)
}

console.log('PASS: homepage footer text reaches address detector')
