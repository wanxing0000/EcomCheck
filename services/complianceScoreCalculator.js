/**
 * GMC Compliance Health Score — transparent estimation from existing audit results.
 * Not Google's official score; presentation layer only.
 */

import { getProductRuleTier, sortProductIssuesBySeverity } from './productRiskSummary.js'

export const SCORE_DEDUCTIONS = {
  critical: 20,
  high: 10,
  warning: 3,
}

export const WEBSITE_WEIGHT = 0.4
export const PRODUCT_WEIGHT = 0.6

const TIER_SORT_ORDER = { critical: 0, high: 1, warning: 2 }

/**
 * Map website compliance action to scoring tier.
 * @param {{ riskTier?: string, severity?: string }|null|undefined} action
 * @returns {'critical'|'high'|'warning'}
 */
export function mapWebsiteActionTier(action) {
  if (!action) return 'warning'
  if (action.riskTier === 'critical' || action.severity === 'critical') return 'critical'
  if (action.severity === 'high') return 'high'
  if (action.riskTier === 'warning' || action.severity === 'medium' || action.severity === 'warning') {
    return 'warning'
  }
  return 'warning'
}

/**
 * @param {{ critical?: number, high?: number, warning?: number }} counts
 * @returns {number}
 */
export function scoreFromIssueCounts(counts = {}) {
  const critical = counts.critical ?? 0
  const high = counts.high ?? 0
  const warning = counts.warning ?? 0
  const deduction =
    critical * SCORE_DEDUCTIONS.critical +
    high * SCORE_DEDUCTIONS.high +
    warning * SCORE_DEDUCTIONS.warning
  return Math.max(0, Math.round(100 - deduction))
}

/**
 * @param {number} score
 * @returns {'A'|'B'|'C'|'D'|'F'}
 */
export function resolveGrade(score) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

/**
 * @param {number} score
 * @returns {'Excellent'|'Good'|'Needs Improvement'|'High Risk'}
 */
export function resolveRiskLabel(score) {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Good'
  if (score >= 60) return 'Needs Improvement'
  return 'High Risk'
}

function emptyCounts() {
  return { critical: 0, high: 0, warning: 0, total: 0 }
}

function addTierCount(counts, tier) {
  if (tier === 'critical') counts.critical += 1
  else if (tier === 'high') counts.high += 1
  else counts.warning += 1
  counts.total += 1
}

function countWebsiteIssues(complianceActions = []) {
  const counts = emptyCounts()
  for (const action of complianceActions) {
    addTierCount(counts, mapWebsiteActionTier(action))
  }
  return counts
}

function countProductIssues(productCompliance = null) {
  const counts = emptyCounts()
  for (const product of productCompliance?.products || []) {
    for (const issue of product.issues || []) {
      addTierCount(counts, getProductRuleTier(issue.ruleId))
    }
  }
  return counts
}

function hasProductScoreInput(productCompliance, productRiskSummary) {
  const analyzed =
    productRiskSummary?.analyzedProducts ??
    productCompliance?.summary?.analyzedProducts ??
    productCompliance?.products?.length ??
    0
  return analyzed > 0
}

function buildWebsiteTopIssues(complianceActions = []) {
  return complianceActions.map((action) => ({
    ruleId: action.ruleId,
    title: action.title || action.ruleId,
    tier: mapWebsiteActionTier(action),
    source: 'website',
  }))
}

function buildProductTopIssues(productCompliance = null) {
  const issues = []
  for (const product of productCompliance?.products || []) {
    for (const issue of product.issues || []) {
      issues.push({
        ruleId: issue.ruleId,
        title: issue.ruleName || issue.ruleId,
        tier: getProductRuleTier(issue.ruleId),
        source: 'product',
        productUrl: product.url,
      })
    }
  }
  return issues
}

function buildTopIssues(complianceActions = [], productCompliance = null, limit = 5) {
  const combined = [...buildWebsiteTopIssues(complianceActions), ...buildProductTopIssues(productCompliance)]
  const sorted = combined.sort((a, b) => {
    const tierDiff = (TIER_SORT_ORDER[a.tier] ?? 99) - (TIER_SORT_ORDER[b.tier] ?? 99)
    if (tierDiff !== 0) return tierDiff
    return String(a.title).localeCompare(String(b.title))
  })

  const seen = new Set()
  const unique = []
  for (const issue of sorted) {
    const key = `${issue.source}:${issue.ruleId}:${issue.title}`
    if (seen.has(key)) continue
    seen.add(key)
    unique.push(issue)
    if (unique.length >= limit) break
  }
  return unique
}

function mergeIssueSummary(websiteCounts, productCounts) {
  return {
    critical: websiteCounts.critical + productCounts.critical,
    high: websiteCounts.high + productCounts.high,
    warning: websiteCounts.warning + productCounts.warning,
    total: websiteCounts.total + productCounts.total,
  }
}

function calculateOverallScore(websiteScore, productScore, includeProductWeight) {
  if (!includeProductWeight) return websiteScore
  return Math.round(websiteScore * WEBSITE_WEIGHT + productScore * PRODUCT_WEIGHT)
}

/**
 * @param {{
 *   complianceActions?: object[],
 *   productCompliance?: object|null,
 *   productRiskSummary?: object|null
 * }} input
 */
export function calculateComplianceScore({
  complianceActions = [],
  productCompliance = null,
  productRiskSummary = null,
} = {}) {
  const websiteCounts = countWebsiteIssues(complianceActions)
  const productCounts = countProductIssues(productCompliance)
  const websiteScore = scoreFromIssueCounts(websiteCounts)
  const productScore = scoreFromIssueCounts(productCounts)
  const includeProductWeight = hasProductScoreInput(productCompliance, productRiskSummary)
  const score = calculateOverallScore(websiteScore, productScore, includeProductWeight)

  return {
    score,
    grade: resolveGrade(score),
    riskLevel: resolveRiskLabel(score),
    breakdown: {
      websiteScore,
      productScore: includeProductWeight ? productScore : null,
    },
    issueSummary: mergeIssueSummary(websiteCounts, productCounts),
    topIssues: buildTopIssues(complianceActions, productCompliance),
    weights: includeProductWeight
      ? { website: WEBSITE_WEIGHT, product: PRODUCT_WEIGHT }
      : { website: 1, product: 0 },
  }
}

export {
  countWebsiteIssues,
  countProductIssues,
  hasProductScoreInput,
  calculateOverallScore,
}
