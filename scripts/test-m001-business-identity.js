import { analyzeBusinessIdentity } from '../modules/trust/rules/_helpers.js'
import { businessIdentityRule } from '../modules/trust/rules/M001-business-identity.js'

function assert(condition, message) {
  if (!condition) {
    throw new Error(message)
  }
}

function runCase(name, auditData, expectations) {
  const identity = analyzeBusinessIdentity(auditData)
  const ruleResult = businessIdentityRule.check(auditData)

  console.log(`\n${name}`)
  console.log('  address signal:', identity.signals.address)
  console.log('  addressEvidence:', identity.addressEvidence)

  assert(
    identity.signals.address === expectations.addressPass,
    `${name}: expected address=${expectations.addressPass}, got ${identity.signals.address}`
  )

  if (expectations.evidenceFound !== undefined) {
    assert(
      identity.addressEvidence.found === expectations.evidenceFound,
      `${name}: expected addressEvidence.found=${expectations.evidenceFound}, got ${identity.addressEvidence.found}`
    )
  }

  if (expectations.matchedTextIncludes) {
    assert(
      identity.addressEvidence.matchedText?.includes(expectations.matchedTextIncludes),
      `${name}: expected matchedText to include "${expectations.matchedTextIncludes}"`
    )
  }

  if (expectations.sourceIncludes) {
    assert(
      identity.addressEvidence.source?.includes(expectations.sourceIncludes),
      `${name}: expected source to include "${expectations.sourceIncludes}", got "${identity.addressEvidence.source}"`
    )
  }

  if (expectations.addressPass) {
    assert(!identity.missing.includes('address'), `${name}: address should not be in missing list`)
  } else {
    assert(identity.missing.includes('address'), `${name}: address should be in missing list`)
  }

  console.log(`  PASS`)
  return { identity, ruleResult }
}

const baseAudit = {
  url: 'https://example-store.com',
  meta: { title: 'Example Store' },
  html: '<html><head><title>Example Store</title></head><body><h1>Example Store</h1></body></html>',
}

runCase('Case 1: Mailing Address block on contact page', {
  ...baseAudit,
  contactInfo: {
    emails: ['support@example-store.com'],
    phones: ['+1 555 0100'],
    addresses: [],
    sources: [],
  },
  pageContent: {
    contactUs: {
      bodyText: `Contact Us

Mailing Address:
123 Main Street
London
SW1A 1AA
United Kingdom

Email: support@example-store.com`,
    },
  },
  pages: {
    contactUs: { found: true, url: 'https://example-store.com/contact' },
  },
}, {
  addressPass: true,
  evidenceFound: true,
  matchedTextIncludes: 'Mailing Address',
  sourceIncludes: 'contact page',
})

runCase('Case 2: Registered Office on about page', {
  ...baseAudit,
  contactInfo: {
    emails: ['hello@example-store.com'],
    phones: ['+1 555 0101'],
    addresses: [],
    sources: [],
  },
  pageContent: {
    aboutUs: {
      bodyText: `About Example Store

Registered Office:
456 High Street
Edinburgh
EH1 1AA
Scotland`,
    },
  },
  pages: {
    aboutUs: { found: true, url: 'https://example-store.com/about' },
  },
}, {
  addressPass: true,
  evidenceFound: true,
  matchedTextIncludes: 'Registered Office',
  sourceIncludes: 'about page',
})

runCase('Case 3: email only, no address', {
  ...baseAudit,
  contactInfo: {
    emails: ['support@gmail.com'],
    phones: [],
    addresses: [],
    sources: [{ type: 'email', value: 'support@gmail.com', source: 'body', page: 'homepage' }],
  },
  pageContent: {},
  pages: {},
}, {
  addressPass: false,
  evidenceFound: false,
})

console.log('\nAll M001 business identity address tests passed.')
