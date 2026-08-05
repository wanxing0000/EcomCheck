/**
 * Fix Guide Intelligence — generates actionable fix guides from audit rule results.
 * Does not modify rule pass/fail outcomes.
 */

import { predictFixImpact, toFixGuideImpactPrediction } from './fixImpactPredictor.js'
import { generateFixAssistant } from './fixAssistantGenerator.js'

const SUPPORTED_RULE_IDS = new Set(['G005', 'G008', 'G010', 'G011', 'G012', 'M001', 'M002', 'M003', 'M004', 'M005', 'T001', 'P001', 'P002', 'P003'])

export const PRODUCT_FIX_RULE_IDS = new Set(['G011', 'G012', 'M004', 'M005'])

/** Lower number = higher fix priority */
const FIX_GUIDE_PRIORITY = {
  M001: 5,
  M002: 6,
  M003: 7,
  G008: 30,
  G010: 32,
  T001: 35,
  P002: 36,
  P003: 37,
  P001: 38,
  G005: 55,
  G011: 52,
  G012: 54,
  M004: 8,
  M005: 9,
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
  G011: {
    title: 'Product Schema Completeness',
    problem: 'Product structured data is incomplete on product detail pages.',
    whyItMatters:
      'Complete Product JSON-LD helps Google understand catalog items and match Shopping listings.',
    recommendedFix:
      'Add missing Product schema fields such as name, image, description, identifiers, and offers.',
    expectedImpact: 'May improve product feed validation and Shopping ad match quality.',
  },
  G012: {
    title: 'Product Identifier Quality',
    problem: 'Product identifiers are missing on analyzed product pages.',
    whyItMatters:
      'Google uses brand, SKU, GTIN, and MPN to match products in Shopping listings.',
    recommendedFix:
      'Add missing brand, SKU, GTIN, or MPN values to product pages and Product JSON-LD.',
    expectedImpact: 'May improve Shopping ad match quality and product visibility.',
  },
  M004: {
    title: 'Product Content Quality',
    problem: 'Product content signals are weak or incomplete.',
    whyItMatters:
      'Factual product descriptions and specifications help shoppers and review teams evaluate listings.',
    recommendedFix:
      'Expand product descriptions and add measurable specifications such as material and size.',
    expectedImpact: 'May reduce product disapprovals caused by insufficient product detail.',
  },
  M005: {
    title: 'Product Trust Signals',
    problem: 'Product pages are missing baseline trust elements.',
    whyItMatters:
      'Reviews, warranty, and return information help establish buyer confidence and policy transparency.',
    recommendedFix:
      'Add genuine reviews where available, plus clear warranty and return information.',
    expectedImpact: 'May improve buyer trust and reduce post-purchase disputes.',
  },
  T001: {
    title: 'Contact Information',
    problem: 'Contact information is missing from the website.',
    whyItMatters:
      'Google and customers need a verifiable way to reach your business before approving Shopping ads.',
    recommendedFix:
      'Add email, phone, or business address to your footer, contact page, or about page.',
    expectedImpact: 'May unblock Merchant Center contact verification requirements.',
  },
  P001: {
    title: 'Privacy Policy',
    problem: 'No privacy policy page was detected.',
    whyItMatters:
      'Privacy policies are expected by Google Merchant Center and many payment providers.',
    recommendedFix:
      'Create a privacy policy page covering data collection, cookies, payment data, and third-party services.',
    expectedImpact: 'May improve platform trust during Merchant Center review.',
  },
  P002: {
    title: 'Refund Policy',
    problem: 'No refund or return policy page was detected.',
    whyItMatters:
      'Google expects clear return and refund terms before approving e-commerce listings.',
    recommendedFix:
      'Publish a refund policy with return period, conditions, refund method, and return address.',
    expectedImpact: 'May unblock Merchant Center refund policy requirements.',
  },
  P003: {
    title: 'Shipping Information',
    problem: 'No shipping policy page was detected.',
    whyItMatters:
      'Customers and Google need transparent shipping details before purchase.',
    recommendedFix:
      'Create a shipping policy page with processing time, regions served, delivery time, and shipping costs.',
    expectedImpact: 'May improve Merchant Center shipping transparency checks.',
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

function extractT001Signals(rule) {
  const detected = []
  const missing = []
  const message = rule.message || ''

  if (/email/i.test(message) && (/detected/i.test(message) || rule.passed)) detected.push('Email')
  if (/phone/i.test(message) && (/detected/i.test(message) || rule.passed)) detected.push('Phone')
  if (/address/i.test(message) && (/detected/i.test(message) || rule.passed)) detected.push('Address')

  if (!rule.passed) {
    if (!detectedIncludesSimple(detected, 'email')) missing.push('Contact email')
    if (!detectedIncludesSimple(detected, 'phone')) missing.push('Phone')
    if (!detectedIncludesSimple(detected, 'address')) missing.push('Business address')
    missing.push('Company name')
  }

  return { detected: uniqueStrings(detected), missing: uniqueStrings(missing) }
}

function detectedIncludesSimple(detected, token) {
  return detected.some((item) => item.toLowerCase().includes(token))
}

function extractPolicyPageSignals(rule, pageLabel, missingPageLabel, contentGaps = []) {
  const detected = []
  const missing = []
  const message = rule.message || ''

  if (rule.passed || /page found|found at/i.test(message)) {
    detected.push(`${pageLabel} page found`)
    return { detected: uniqueStrings(detected), missing: uniqueStrings(missing) }
  }

  missing.push(missingPageLabel, ...contentGaps)
  return { detected: uniqueStrings(detected), missing: uniqueStrings(missing) }
}

function extractP001Signals(rule) {
  return extractPolicyPageSignals(rule, 'Privacy', 'Privacy policy page')
}

function extractP002Signals(rule) {
  return extractPolicyPageSignals(rule, 'Refund', 'Refund policy page', [
    'Return period',
    'Return conditions',
    'Refund method',
    'Return address',
  ])
}

function extractP003Signals(rule) {
  return extractPolicyPageSignals(rule, 'Shipping', 'Shipping policy page', [
    'Processing time',
    'Shipping regions',
    'Delivery time',
    'Shipping costs',
  ])
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
  T001: extractT001Signals,
  P001: extractP001Signals,
  P002: extractP002Signals,
  P003: extractP003Signals,
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

function buildFixGuide(rule, complianceIssue, context = {}) {
  const template = FIX_TEMPLATES[rule.id]
  if (!template) return null

  const extract = SIGNAL_EXTRACTORS[rule.id]
  const { detected, missing } = extract ? extract(rule) : { detected: [], missing: [] }

  const recommendedFix =
    rule.recommendation ||
    complianceIssue?.fixSuggestion ||
    template.recommendedFix

  const impact = predictFixImpact({
    ruleId: rule.id,
    severity: rule.severity || complianceIssue?.severity,
    currentScore: context.gmcRiskScore,
    gmcRiskScore: context.gmcRiskScore,
    approvalRisk: context.approvalRisk,
    missing,
    detected,
    rule,
  })

  const fixAssistant = generateFixAssistant({
    ruleId: rule.id,
    evidence: {
      message: rule.message,
      policyQuality: rule.policyQuality,
      policyQualityReport: rule.policyQualityReport,
      trustDetails: rule.trustDetails,
      productTrustReport: rule.productTrustReport,
    },
    missing,
    detected,
  })

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
    impactPrediction: toFixGuideImpactPrediction(impact),
    fixAssistant,
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
 * @param {{
 *   ruleResults: object[],
 *   complianceIssues?: object[],
 *   auditMode?: string,
 *   gmcRiskScore?: number|null,
 *   approvalRisk?: object|null,
 * }} input
 * @returns {{ fixGuides: object[] }}
 */
export function generateFixGuides({
  ruleResults = [],
  complianceIssues = [],
  auditMode = 'gmc',
  gmcRiskScore = null,
  approvalRisk = null,
} = {}) {
  if (auditMode !== 'gmc') {
    return { fixGuides: [] }
  }

  const rulesById = indexRuleResults(ruleResults)
  const issuesById = indexComplianceIssues(complianceIssues)
  const fixGuides = []
  const impactContext = { gmcRiskScore, approvalRisk }

  for (const ruleId of SUPPORTED_RULE_IDS) {
    const rule = rulesById.get(ruleId)
    if (!rule || !ruleNeedsFixGuide(rule)) continue

    const guide = buildFixGuide(rule, issuesById.get(ruleId), impactContext)
    if (guide) fixGuides.push(guide)
  }

  fixGuides.sort((a, b) => a.priority - b.priority)

  return { fixGuides }
}

function indexProductsByUrl(products = []) {
  const map = new Map()
  for (const product of products) {
    if (product?.url) map.set(product.url, product)
  }
  return map
}

function extractProductDetectedSignals(product) {
  const detected = []
  const signals = product?.productSignals || {}

  if (product?.structuredData?.found) detected.push('Product schema')
  if (signals.brand?.found) detected.push('Brand')
  if (signals.sku?.found) detected.push('SKU')
  if (signals.gtin?.found) detected.push('GTIN')
  if (signals.mpn?.found) detected.push('MPN')
  if (signals.description?.found) detected.push('Description')
  if (signals.price?.found) detected.push('Price')
  if (signals.availability?.found) detected.push('Availability')
  if (product?.quality?.hasSpecifications) detected.push('Specifications')
  if (product?.quality?.hasMaterial) detected.push('Material')
  if (product?.quality?.hasSize) detected.push('Size')
  if (product?.quality?.hasReviews) detected.push('Reviews')
  if (product?.quality?.hasWarranty) detected.push('Warranty')
  if (product?.quality?.hasReturnInfo) detected.push('Return information')

  return uniqueStrings(detected)
}

function extractProductIssueMissing(issue) {
  const missing = []

  if (Array.isArray(issue.missingFields)) {
    for (const field of issue.missingFields) {
      missing.push(String(field))
    }
  }

  if (Array.isArray(issue.missing)) {
    missing.push(...issue.missing)
  }

  return uniqueStrings(missing)
}

function buildProductFixGuide(issue, product, context = {}) {
  const template = FIX_TEMPLATES[issue.ruleId]
  if (!template || !PRODUCT_FIX_RULE_IDS.has(issue.ruleId)) return null

  const detected = extractProductDetectedSignals(product)
  const missing = extractProductIssueMissing(issue)
  const missingForAssistant = issue.ruleId === 'G011' ? issue.missingFields || missing : missing

  const fixAssistant = generateFixAssistant({
    ruleId: issue.ruleId,
    evidence: {
      message: issue.message,
      productUrl: issue.productUrl || product?.url || '',
    },
    missing: missingForAssistant,
    detected,
  })

  if (!fixAssistant) return null

  const impact = predictFixImpact({
    ruleId: issue.ruleId,
    severity: issue.severity,
    currentScore: context.gmcRiskScore,
    gmcRiskScore: context.gmcRiskScore,
    approvalRisk: context.approvalRisk,
    missing,
    detected,
  })

  return {
    ruleId: issue.ruleId,
    productUrl: issue.productUrl || product?.url || '',
    title: template.title,
    priority: FIX_GUIDE_PRIORITY[issue.ruleId] ?? 99,
    problem: issue.message || template.problem,
    whyItMatters: template.whyItMatters,
    detected,
    missing,
    recommendedFix: template.recommendedFix,
    expectedImpact: template.expectedImpact,
    impactPrediction: toFixGuideImpactPrediction(impact),
    fixAssistant,
    severity: issue.severity,
    category: issue.category || 'gmc',
    fixAvailable: Boolean(fixAssistant.copyReadyText),
  }
}

/**
 * Build product-level fix guides from product compliance issues.
 * @param {{
 *   productCompliance?: object|null,
 *   productAnalysis?: object|null,
 *   gmcRiskScore?: number|null,
 *   approvalRisk?: object|null,
 * }} input
 */
export function generateProductFixGuides({
  productCompliance = null,
  productAnalysis = null,
  gmcRiskScore = null,
  approvalRisk = null,
} = {}) {
  const analysisByUrl = indexProductsByUrl(productAnalysis?.products)
  const fixGuides = []
  const context = { gmcRiskScore, approvalRisk }

  for (const productEntry of productCompliance?.products || []) {
    const analyzedProduct = analysisByUrl.get(productEntry.url) || null

    for (const issue of productEntry.issues || []) {
      const guide = buildProductFixGuide(issue, analyzedProduct, context)
      if (guide) fixGuides.push(guide)
    }
  }

  fixGuides.sort((a, b) => a.priority - b.priority)

  return { fixGuides }
}

export {
  SUPPORTED_RULE_IDS,
  FIX_TEMPLATES,
  FIX_GUIDE_PRIORITY,
}
