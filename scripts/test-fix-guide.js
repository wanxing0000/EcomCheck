import { generateFixGuides } from '../services/fixGuideGenerator.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertIncludesAll(actual, expected, label) {
  for (const item of expected) {
    assert(actual.includes(item), `${label}: expected "${item}" in [${actual.join(', ')}]`)
  }
}

function runScenario(name, input, expectations) {
  const { fixGuides } = generateFixGuides(input)

  console.log(`\n=== ${name} ===`)
  console.log('fixGuides:', fixGuides.map((guide) => guide.ruleId).join(', ') || '(none)')

  for (const guide of fixGuides) {
    console.log(`  ${guide.ruleId}: detected=[${guide.detected.join(', ')}] missing=[${guide.missing.join(', ')}]`)
  }

  assert(Array.isArray(fixGuides), `${name}: fixGuides should be an array`)

  if (expectations.count != null) {
    assert(fixGuides.length === expectations.count, `${name}: expected ${expectations.count} guides, got ${fixGuides.length}`)
  }

  if (expectations.ruleIds) {
    const ids = fixGuides.map((guide) => guide.ruleId)
    assert(
      expectations.ruleIds.every((id) => ids.includes(id)),
      `${name}: expected ruleIds ${expectations.ruleIds.join(', ')}, got ${ids.join(', ')}`
    )
  }

  if (expectations.guide) {
    const guide = fixGuides.find((entry) => entry.ruleId === expectations.guide.ruleId)
    assert(guide, `${name}: missing fix guide for ${expectations.guide.ruleId}`)

    for (const key of [
      'ruleId',
      'title',
      'priority',
      'problem',
      'whyItMatters',
      'detected',
      'missing',
      'recommendedFix',
      'expectedImpact',
    ]) {
      assert(guide[key] != null, `${name}: guide ${guide.ruleId} missing ${key}`)
    }

    if (expectations.guide.problem) {
      assert(guide.problem === expectations.guide.problem, `${name}: unexpected problem for ${guide.ruleId}`)
    }

    if (expectations.guide.detected) {
      assertIncludesAll(guide.detected, expectations.guide.detected, `${name} ${guide.ruleId} detected`)
    }

    if (expectations.guide.missing) {
      assertIncludesAll(guide.missing, expectations.guide.missing, `${name} ${guide.ruleId} missing`)
    }

    if (expectations.guide.recommendedFixIncludes) {
      assert(
        guide.recommendedFix.includes(expectations.guide.recommendedFixIncludes),
        `${name}: recommendedFix should include "${expectations.guide.recommendedFixIncludes}"`
      )
    }
  }

  if (expectations.priorityOrder) {
    const ids = fixGuides.map((guide) => guide.ruleId)
    assert(
      ids.join(',') === expectations.priorityOrder.join(','),
      `${name}: expected priority order ${expectations.priorityOrder.join(', ')}, got ${ids.join(', ')}`
    )
  }

  console.log('PASS')
}

runScenario(
  'G008 payment gaps',
  {
    auditMode: 'gmc',
    ruleResults: [
      {
        id: 'G008',
        name: 'Payment Information',
        category: 'gmc',
        severity: 'medium',
        passed: true,
        message:
          'Payment information detected at https://store.com/payment (quality score: 72/100). Missing: payment methods, billing terms.',
        policyQuality: {
          qualityScore: 72,
          missing: ['payment methods', 'billing terms'],
          checks: {
            sufficientLength: true,
            hasPaymentSignals: true,
            paymentKeywords: true,
          },
        },
      },
    ],
    complianceIssues: [],
  },
  {
    count: 1,
    ruleIds: ['G008'],
    guide: {
      ruleId: 'G008',
      problem: 'Payment information is incomplete.',
      detected: ['Payment page found'],
      missing: ['Payment Methods', 'Billing Terms'],
      recommendedFixIncludes: 'payment methods',
    },
  }
)

runScenario(
  'M003 product trust gaps',
  {
    auditMode: 'gmc',
    ruleResults: [
      {
        id: 'M003',
        name: 'Product Trust Signals',
        category: 'trust',
        severity: 'medium',
        passed: false,
        message: 'Product pages lack sufficient trust signals (average 45/100).',
        recommendation:
          'Add detailed specifications, product attributes and factual descriptions.',
        productTrustReport: {
          scannedPages: 3,
          averageScore: 45,
          riskLevel: 'medium',
          factors: [
            {
              name: 'Product Description Quality',
              score: 40,
              detected: ['Price found'],
              missing: ['Specifications', 'Material'],
            },
            {
              name: 'Product Image Signals',
              score: 55,
              detected: ['Images found'],
              missing: ['Alt text'],
            },
            {
              name: 'Product Attribute Completeness',
              score: 35,
              detected: [],
              missing: ['Attributes', 'Brand', 'Size'],
            },
          ],
        },
      },
    ],
    complianceIssues: [
      {
        id: 'M003',
        whyItMatters:
          'Google expects product pages to describe what is being sold with enough detail to avoid misleading shoppers.',
        impact: 'Low-quality product pages can lead to product disapprovals or misrepresentation warnings in Merchant Center.',
        fixSuggestion:
          'Add detailed descriptions, multiple images, specifications, materials, sizing, and factual product information on product detail pages.',
      },
    ],
  },
  {
    count: 1,
    ruleIds: ['M003'],
    guide: {
      ruleId: 'M003',
      problem: 'Product pages lack sufficient trust signals.',
      detected: ['Price Found', 'Images Found'],
      missing: ['Specifications', 'Material', 'Attributes'],
      recommendedFixIncludes: 'specifications',
    },
  }
)

runScenario(
  'Multiple rules priority order',
  {
    auditMode: 'gmc',
    ruleResults: [
      {
        id: 'G005',
        passed: false,
        category: 'gmc',
        message: 'Some product identifiers missing: gtin, mpn. Present: brand, sku.',
      },
      {
        id: 'M001',
        passed: false,
        category: 'trust',
        trustDetails: {
          signals: { companyName: true, address: false, phone: false, domainEmail: false },
          missing: ['address', 'phone', 'domainEmail'],
        },
      },
      {
        id: 'G010',
        passed: true,
        category: 'gmc',
        message: 'Shipping policy found (quality score: 68/100). Missing: delivery timeframes, shipping costs.',
        policyQuality: {
          missing: ['delivery timeframes', 'shipping costs'],
          checks: { shippingKeywords: true, sufficientLength: true },
        },
      },
    ],
    complianceIssues: [],
  },
  {
    count: 3,
    priorityOrder: ['M001', 'G010', 'G005'],
  }
)

runScenario(
  'Non-GMC mode returns empty',
  {
    auditMode: 'seo',
    ruleResults: [{ id: 'G008', passed: false, category: 'gmc' }],
    complianceIssues: [],
  },
  {
    count: 0,
  }
)

runScenario(
  'Passing rules with no gaps are skipped',
  {
    auditMode: 'gmc',
    ruleResults: [
      {
        id: 'G008',
        passed: true,
        category: 'gmc',
        message: 'Payment information detected (quality score: 95/100).',
        policyQuality: { missing: [], checks: { hasPaymentSignals: true, paymentMethods: true } },
      },
      {
        id: 'M003',
        passed: true,
        category: 'trust',
        productTrustReport: { riskLevel: 'low', factors: [] },
      },
    ],
    complianceIssues: [],
  },
  {
    count: 0,
  }
)

console.log('\nAll fix guide tests passed.')
