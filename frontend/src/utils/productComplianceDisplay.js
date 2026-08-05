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

export const PRODUCT_ISSUE_GROUP_LABELS = {
  critical: 'Critical Issues',
  high: 'High Priority',
  warning: 'Optimization',
}

export function getProductRuleTier(ruleId) {
  return PRODUCT_RULE_TIERS[ruleId] || 'warning'
}

export function getProductRuleExplanation(ruleId) {
  return PRODUCT_RULE_EXPLANATIONS[ruleId] || null
}

export function getRiskLevelStyle(riskLevel) {
  switch (riskLevel) {
    case 'critical':
      return 'text-red-700 bg-red-50 border-red-200'
    case 'high':
      return 'text-amber-800 bg-amber-50 border-amber-200'
    case 'warning':
      return 'text-blue-800 bg-blue-50 border-blue-200'
    default:
      return 'text-emerald-800 bg-emerald-50 border-emerald-200'
  }
}

export function groupIssuesFromProducts(productCompliance) {
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
        explanation: getProductRuleExplanation(issue.ruleId),
        fixAvailable: Boolean(issue.fixAvailable || issue.fixAssistant?.copyReadyText),
      })
    }
  }

  return groups
}

export function buildProductRiskSummaryFromCompliance(productCompliance, productAnalysis = null) {
  const products = productCompliance?.products || []
  const analyzedProducts = productAnalysis?.summary?.analyzed ?? productAnalysis?.products?.length ?? products.length

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
      if (issue.fixAvailable || issue.fixAssistant?.copyReadyText) fixAvailableCount += 1
    }
  }

  let riskLevel = 'low'
  if (criticalCount > 0) riskLevel = 'critical'
  else if (highCount > 0) riskLevel = 'high'
  else if (warningCount > 0) riskLevel = 'warning'

  const riskLevelLabel =
    riskLevel === 'critical' ? 'Critical' : riskLevel === 'high' ? 'High' : riskLevel === 'warning' ? 'Warning' : 'Low'

  return {
    totalProducts: analyzedProducts,
    analyzedProducts,
    productsWithIssues: products.filter((product) => product.issues?.length > 0).length,
    riskLevel,
    riskLevelLabel,
    totalIssues,
    fixAvailableCount,
    criticalCount,
    highCount,
    warningCount,
  }
}
