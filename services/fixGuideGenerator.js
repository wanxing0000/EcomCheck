/**
 * Fix Guide Intelligence — generates actionable fix guides from audit rule results.
 * Does not modify rule pass/fail outcomes.
 */

const SUPPORTED_RULE_IDS = new Set(['G005', 'G008', 'G010', 'M001', 'M002', 'M003'])

/** Lower number = higher fix priority */
const FIX_GUIDE_PRIORITY = {
  M001: 5,
  M002: 6,
  M003: 7,
  G008: 30,
  G010: 32,
  G005: 55,
}

const IDENTITY_SIGNAL_LABELS = {
  companyName: 'Company name',
  address: 'Physical address',
  phone: 'Phone number',
  domainEmail: 'Domain email',
}

const IDENTIFIER_LABELS = {
  brand: 'Brand',
  sku: 'SKU',
  gtin: 'GTIN',
  mpn: 'MPN',
}

const FIX_TEMPLATES = {
  G005: {
    title: 'Product Identifiers',
    problem: 'Product identifiers are missing or incomplete in structured data.',
    whyItMatters:
      'Google uses brand, SKU, GTIN, and MPN to match products in Shopping listings and improve ad visibility.',
    recommendedFix:
      'Add brand, SKU, GTIN, or MPN fields to Product JSON-LD on product detail pages.',
    expectedImpact: 'May improve Shopping ad match quality and product visibility.',
  },
  G008: {
    title: 'Payment Information',
    problem: 'Payment information is incomplete.',
    whyItMatters:
      'Google requires transparent payment information before approving Shopping ads.',
    recommendedFix:
      'Add accepted payment methods and billing terms to payment policy page.',
    expectedImpact: 'May improve GMC approval confidence.',
  },
  G010: {
    title: 'Shipping Policy',
    problem: 'Shipping policy is incomplete or lacks actionable delivery details.',
    whyItMatters:
      'Google expects clear shipping terms so customers understand delivery before purchase.',
    recommendedFix:
      'Expand your shipping policy with delivery timeframes, regions served, and shipping costs.',
    expectedImpact: 'May improve GMC approval confidence and reduce buyer disputes.',
  },
  M001: {
    title: 'Business Identity',
    problem: 'Business identity information is incomplete or unclear.',
    whyItMatters:
      'Google requires merchants to provide transparent business information to establish trust.',
    recommendedFix:
      'Add company name, physical address, phone number, and domain email to your Contact or About page.',
    expectedImpact: 'May reduce misrepresentation review risk during Merchant Center verification.',
  },
  M002: {
    title: 'Policy Quality',
    problem: 'Store policies lack sufficient depth or clarity.',
    whyItMatters:
      'Google evaluates whether store policies are substantive enough for customers to make informed purchases.',
    recommendedFix:
      'Expand refund, shipping, and payment policies with return windows, conditions, shipping costs, delivery times, and accepted payment methods.',
    expectedImpact: 'May reduce misrepresentation risk even when policy pages exist.',
  },
  M003: {
    title: 'Product Trust Signals',
    problem: 'Product pages lack sufficient trust signals.',
    whyItMatters:
      'Detailed product information helps Google verify product legitimacy.',
    recommendedFix:
      'Add detailed specifications, product attributes and factual descriptions.',
    expectedImpact: 'May reduce product disapprovals and misrepresentation warnings in Merchant Center.',
  },
}

function capitalizeLabel(value) {
  if (!value || typeof value !== 'string') return value
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function uniqueStrings(values) {
  return [...new Set(values.filter(Boolean))]
}

function parseG005Lists(message = '') {
  const detected = []
  const missing = []

  const presentMatch = message.match(/Present:\s*([^.]+)/i)
  const missingMatch = message.match(/missing:\s*([^.]+)/i)

  if (presentMatch) {
    for (const item of presentMatch[1].split(',')) {
      const key = item.trim().toLowerCase()
      if (IDENTIFIER_LABELS[key]) detected.push(IDENTIFIER_LABELS[key])
    }
  }

  if (missingMatch) {
    for (const item of missingMatch[1].split(',')) {
      const key = item.trim().toLowerCase()
      if (IDENTIFIER_LABELS[key]) missing.push(IDENTIFIER_LABELS[key])
    }
  }

  return { detected, missing }
}

function extractG005Signals(rule) {
  const { detected, missing } = parseG005Lists(rule.message || '')

  if (detected.length === 0 && /product json-ld/i.test(rule.message || '')) {
    detected.push('Product JSON-LD found')
  }

  if (missing.length === 0 && !rule.passed) {
    missing.push('Brand', 'SKU', 'GTIN', 'MPN')
  }

  return { detected: uniqueStrings(detected), missing: uniqueStrings(missing) }
}

function extractPolicyQualitySignals(rule, pageLabel) {
  const quality = rule.policyQuality || {}
  const checks = quality.checks || {}
  const signals = quality.signals || {}
  const detected = []
  const missing = []

  const message = rule.message || ''
  if (/page found|information detected|policy found/i.test(message)) {
    detected.push(`${pageLabel} found`)
  }

  const paymentMethodsSignal = signals.paymentMethods
  if (paymentMethodsSignal?.detected === 'found') {
    detected.push(
      paymentMethodsSignal.evidence
        ? `Payment methods: ${paymentMethodsSignal.evidence}`
        : 'Payment methods'
    )
  } else if (checks.paymentMethods) {
    detected.push('Payment methods')
  }

  const shippingCostSignal = signals.shippingCost
  if (shippingCostSignal?.detected === 'found') {
    detected.push(
      shippingCostSignal.evidence ? `Shipping cost: ${shippingCostSignal.evidence}` : 'Shipping costs'
    )
  } else if (checks.shippingCost) {
    detected.push('Shipping costs')
  }

  if (checks.currencyOrPricing) detected.push('Billing terms')
  if (checks.paymentKeywords && !paymentMethodsSignal?.found) detected.push('Payment keywords')
  if (checks.deliveryTime) detected.push('Delivery timeframes')
  if (checks.shippingRegions) detected.push('Shipping regions')
  if (checks.shippingKeywords && !shippingCostSignal?.found) detected.push('Shipping keywords')

  for (const item of quality.missing || []) {
    if (item === 'actionable payment information') continue
    missing.push(capitalizeLabel(item))
  }

  if (missing.length === 0 && !rule.passed) {
    if (rule.id === 'G008') {
      missing.push('Payment methods', 'Billing terms')
    }
    if (rule.id === 'G010') {
      missing.push('Delivery timeframes', 'Shipping costs')
    }
  }

  return { detected: uniqueStrings(detected), missing: uniqueStrings(missing) }
}

function extractM001Signals(rule) {
  const trustDetails = rule.trustDetails || {}
  const signals = trustDetails.signals || {}
  const detected = []
  const missing = []

  for (const [key, present] of Object.entries(signals)) {
    const label = IDENTITY_SIGNAL_LABELS[key] || capitalizeLabel(key)
    if (present) detected.push(label)
    else missing.push(label)
  }

  if (detected.length === 0 && trustDetails.emails?.length > 0) {
    detected.push('Email address')
  }

  if (missing.length === 0 && Array.isArray(trustDetails.missing)) {
    for (const key of trustDetails.missing) {
      missing.push(IDENTITY_SIGNAL_LABELS[key] || capitalizeLabel(key))
    }
  }

  return { detected: uniqueStrings(detected), missing: uniqueStrings(missing) }
}

function extractM002Signals(rule) {
  const report = rule.policyQualityReport || {}
  const policies = report.policies || []
  const detected = []
  const missing = []

  for (const policy of policies) {
    if (policy.found) {
      detected.push(`${policy.label} page found`)
      if ((policy.qualityScore ?? 0) >= 70) {
        detected.push(`${policy.label} quality acceptable`)
      }
    } else {
      missing.push(`${policy.label} page`)
    }

    for (const item of policy.missing || []) {
      missing.push(`${policy.label}: ${capitalizeLabel(item)}`)
    }
  }

  return { detected: uniqueStrings(detected), missing: uniqueStrings(missing) }
}

function extractM003Signals(rule) {
  const report = rule.productTrustReport || {}
  const factors = report.factors || []
  const detected = []
  const missing = []

  for (const factor of factors) {
    detected.push(...(factor.detected || []))
    missing.push(...(factor.missing || []))
  }

  if (detected.length === 0 && report.scannedPages > 0) {
    detected.push('Product pages scanned')
  }

  return {
    detected: uniqueStrings(detected.map(capitalizeLabel)),
    missing: uniqueStrings(missing.map(capitalizeLabel)),
  }
}

const SIGNAL_EXTRACTORS = {
  G005: extractG005Signals,
  G008: (rule) => extractPolicyQualitySignals(rule, 'Payment page'),
  G010: (rule) => extractPolicyQualitySignals(rule, 'Shipping policy'),
  M001: extractM001Signals,
  M002: extractM002Signals,
  M003: extractM003Signals,
}

function getPolicyGaps(rule) {
  const quality = rule.policyQuality || {}
  return (quality.missing || []).filter((item) => item !== 'actionable payment information')
}

function ruleNeedsFixGuide(rule) {
  if (!rule || !SUPPORTED_RULE_IDS.has(rule.id)) return false

  if (!rule.passed) return true

  if (rule.id === 'G008' || rule.id === 'G010') {
    return getPolicyGaps(rule).length > 0
  }

  return false
}

function buildFixGuide(rule, complianceIssue) {
  const template = FIX_TEMPLATES[rule.id]
  if (!template) return null

  const extract = SIGNAL_EXTRACTORS[rule.id]
  const { detected, missing } = extract ? extract(rule) : { detected: [], missing: [] }

  const recommendedFix =
    rule.recommendation ||
    complianceIssue?.fixSuggestion ||
    template.recommendedFix

  return {
    ruleId: rule.id,
    title: template.title,
    priority: FIX_GUIDE_PRIORITY[rule.id] ?? 99,
    problem: template.problem,
    whyItMatters: complianceIssue?.whyItMatters || template.whyItMatters,
    detected,
    missing,
    recommendedFix,
    expectedImpact: complianceIssue?.impact || template.expectedImpact,
  }
}

function indexComplianceIssues(complianceIssues) {
  const map = new Map()
  for (const issue of complianceIssues || []) {
    if (issue?.id) map.set(issue.id, issue)
  }
  return map
}

function indexRuleResults(ruleResults) {
  const map = new Map()
  for (const rule of ruleResults || []) {
    if (rule?.id) map.set(rule.id, rule)
  }
  return map
}

/**
 * @param {{ ruleResults: object[], complianceIssues?: object[], auditMode?: string }} input
 * @returns {{ fixGuides: object[] }}
 */
export function generateFixGuides({ ruleResults = [], complianceIssues = [], auditMode = 'gmc' } = {}) {
  if (auditMode !== 'gmc') {
    return { fixGuides: [] }
  }

  const rulesById = indexRuleResults(ruleResults)
  const issuesById = indexComplianceIssues(complianceIssues)
  const fixGuides = []

  for (const ruleId of SUPPORTED_RULE_IDS) {
    const rule = rulesById.get(ruleId)
    if (!rule || !ruleNeedsFixGuide(rule)) continue

    const guide = buildFixGuide(rule, issuesById.get(ruleId))
    if (guide) fixGuides.push(guide)
  }

  fixGuides.sort((a, b) => a.priority - b.priority)

  return { fixGuides }
}

export {
  SUPPORTED_RULE_IDS,
  FIX_TEMPLATES,
  FIX_GUIDE_PRIORITY,
}
