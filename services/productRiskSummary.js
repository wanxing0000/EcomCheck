/**
 * Product compliance risk summary — presentation-layer aggregation only.
 */

export const PRODUCT_RULE_TIERS = {
  G011: 'critical',
  G012: 'high',
  G013: 'high',
  G014: 'high',
  M004: 'warning',
  M005: 'warning',
  M006: 'warning',
  M007: 'warning',
}

export const PRODUCT_RULE_EXPLANATIONS = {
  G011: 'Google uses structured data to understand your product.',
  G012: 'Product identifiers help Google match your products correctly.',
  G013: 'Price mismatch may cause product disapproval.',
  G014: 'Availability mismatch may cause product disapproval.',
  M004: 'Detailed product information improves trust and eligibility.',
  M005: 'Trust signals help shoppers and review teams evaluate your product.',
  M006: 'Product images with alt text improve accessibility and listing quality.',
  M007: 'Clear product titles help Google and customers identify your items.',
}

const TIER_ORDER = { critical: 0, high: 1, warning: 2 }
const RULE_PRIORITY = {
  G011: 1,
  G012: 2,
  G013: 3,
  G014: 4,
  M004: 5,
  M005: 6,
  M006: 7,
  M007: 8,
}

export function getProductRuleTier(ruleId) {
  return PRODUCT_RULE_TIERS[ruleId] || 'warning'
}

export function getProductRuleExplanation(ruleId) {
  return PRODUCT_RULE_EXPLANATIONS[ruleId] || null
}

function issueHasFixAvailable(issue) {
  return Boolean(issue?.fixAvailable || issue?.fixAssistant?.copyReadyText)
}

function resolveRiskLevel({ criticalCount, highCount, warningCount }) {
  if (criticalCount > 0) return 'critical'
  if (highCount > 0) return 'high'
  if (warningCount > 0) return 'warning'
  return 'low'
}

function formatRiskLevelLabel(riskLevel) {
  switch (riskLevel) {
    case 'critical':
      return 'Critical'
    case 'high':
      return 'High'
    case 'warning':
      return 'Warning'
    default:
      return 'Low'
  }
}

/**
 * @param {{ products?: object[] }|null} productCompliance
 * @param {{ productAnalysis?: object|null, productDiscovery?: object|null }} [context]
 */
export function buildProductRiskSummary(productCompliance = null, context = {}) {
  const products = productCompliance?.products || []
  const analyzedProducts =
    context.productAnalysis?.summary?.analyzed ??
    context.productAnalysis?.products?.length ??
    productCompliance?.summary?.analyzedProducts ??
    products.length

  const totalProducts =
    context.productDiscovery?.summary?.total ??
    context.productDiscovery?.productPages?.length ??
    analyzedProducts

  let criticalCount = 0
  let highCount = 0
  let warningCount = 0
  let totalIssues = 0
  let fixAvailableCount = 0

  for (const product of products) {
    for (const issue of product.issues || []) {
      totalIssues += 1
      const tier = getProductRuleTier(issue.ruleId)
      if (tier === 'critical') criticalCount += 1
      else if (tier === 'high') highCount += 1
      else warningCount += 1
      if (issueHasFixAvailable(issue)) fixAvailableCount += 1
    }
  }

  const productsWithIssues = products.filter((product) => product.issues?.length > 0).length
  const riskLevel = resolveRiskLevel({ criticalCount, highCount, warningCount })

  return {
    totalProducts,
    analyzedProducts,
    productsWithIssues,
    riskLevel,
    riskLevelLabel: formatRiskLevelLabel(riskLevel),
    totalIssues,
    fixAvailableCount,
    criticalCount,
    highCount,
    warningCount,
  }
}

/**
 * Flatten and group product compliance issues by presentation tier.
 * @param {{ products?: object[] }|null} productCompliance
 */
export function groupProductIssuesByTier(productCompliance = null) {
  const groups = {
    critical: [],
    high: [],
    warning: [],
  }

  for (const product of productCompliance?.products || []) {
    for (const issue of product.issues || []) {
      const tier = getProductRuleTier(issue.ruleId)
      groups[tier].push({
        ...issue,
        productUrl: product.url,
        tier,
        explanation: getProductRuleExplanation(issue.ruleId),
        fixAvailable: issueHasFixAvailable(issue),
      })
    }
  }

  for (const tier of Object.keys(groups)) {
    groups[tier].sort((a, b) => {
      const priorityDiff = (RULE_PRIORITY[a.ruleId] ?? 99) - (RULE_PRIORITY[b.ruleId] ?? 99)
      if (priorityDiff !== 0) return priorityDiff
      return String(a.productUrl).localeCompare(String(b.productUrl))
    })
  }

  return groups
}

export function sortProductIssuesBySeverity(issues = []) {
  return [...issues].sort((a, b) => {
    const tierDiff = (TIER_ORDER[getProductRuleTier(a.ruleId)] ?? 99) - (TIER_ORDER[getProductRuleTier(b.ruleId)] ?? 99)
    if (tierDiff !== 0) return tierDiff
    return (RULE_PRIORITY[a.ruleId] ?? 99) - (RULE_PRIORITY[b.ruleId] ?? 99)
  })
}

export { formatRiskLevelLabel, issueHasFixAvailable }
