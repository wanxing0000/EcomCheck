/**
 * GMC Approval Risk presentation layer — does not change rule pass/fail outcomes.
 */

/** Lower number = higher Google Shopping disapproval priority */
const GMC_DISAPPROVAL_PRIORITY = {
  M001: 5,
  M002: 6,
  M003: 7,
  G001: 10,
  G002: 20,
  G006: 15,
  G003: 30,
  G004: 40,
  G008: 50,
  G007: 60,
  G009: 70,
  G010: 80,
  G005: 90,
}

const SEVERITY_SORT_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
  warning: 3,
}

export const GMC_RISK_WEIGHTS = {
  critical: 25,
  warning: 8,
  advisory: 3,
}

/** Lighter penalties for misrepresentation (M001-M003) — risk hints, not hard blockers */
export const GMC_MISREPRESENTATION_WEIGHTS = {
  critical: 20,
  high: 10,
  medium: 5,
  low: 2,
  warning: 2,
}

export const GMC_MISREPRESENTATION_RULE_IDS = new Set(['M001', 'M002', 'M003'])

export const GMC_RISK_TIER_IMPACT = {
  critical: 'May block Merchant Center approval',
  warning: 'May reduce approval probability',
  advisory: 'Recommended optimization — optional for many listings',
}

/**
 * Critical (−25): issues that can directly cause GMC disapproval.
 * Refund/shipping/contact missing, purchase flow failure, price mismatch, invalid product schema.
 */
const GMC_CRITICAL_RULE_IDS = new Set([
  'G001', // product price in structured data
  'G002', // product availability in structured data
  'G003', // return / refund policy missing
  'G004', // shipping policy missing
  'G006', // price mismatch
  'G009', // purchase flow failure
  'P002', // refund policy (legacy)
  'P003', // shipping policy (legacy)
  'T001', // contact information missing
])

/**
 * Warning (−8): incomplete policy or business signals — unlikely alone to block approval.
 */
const GMC_WARNING_RULE_IDS = new Set([
  'G007', // business information incomplete
  'G008', // payment information incomplete
  'G010', // shipping policy quality / shipping cost gaps
])

/**
 * Advisory (−3): optional improvements — Google allows many listings without these.
 */
export const GMC_ADVISORY_RULE_IDS = new Set([
  'G005', // product identifiers (GTIN/MPN optional)
  'A002', // Google tag
  'A003', // product JSON-LD enrichment
  'K001',
  'K002',
  'K003',
  'K004',
  'T002',
  'P001',
])

const GMC_RISK_AREAS = [
  {
    id: 'misrepresentation',
    label: 'Misrepresentation Risk',
    ruleIds: ['M001', 'M002', 'M003'],
  },
  {
    id: 'product-data',
    label: 'Product Data',
    ruleIds: ['G001', 'G002', 'G005', 'G006'],
  },
  {
    id: 'store-policies',
    label: 'Store Policies',
    ruleIds: ['G003', 'G004', 'G008', 'G010'],
  },
  {
    id: 'business-trust',
    label: 'Business & Purchase Flow',
    ruleIds: ['G007', 'G009'],
  },
]

/**
 * Classify an enriched issue into approval-risk tiers for GMC audits.
 * Presentation-only — does not change rule pass/fail outcomes.
 * @param {{ id?: string, severity?: string, message?: string, misrepresentationLevel?: string }} issue
 * @returns {'critical' | 'warning' | 'advisory'}
 */
export function resolveGmcRiskTier(issue) {
  const id = issue.id

  if (GMC_MISREPRESENTATION_RULE_IDS.has(id)) {
    const level = issue.misrepresentationLevel || issue.severity
    if (level === 'critical' || level === 'high') return 'critical'
    if (level === 'medium') return 'warning'
    return 'advisory'
  }

  if (GMC_CRITICAL_RULE_IDS.has(id)) return 'critical'
  if (GMC_WARNING_RULE_IDS.has(id)) return 'warning'
  if (GMC_ADVISORY_RULE_IDS.has(id)) return 'advisory'

  return 'advisory'
}

function getIssuePenalty(issue) {
  if (GMC_MISREPRESENTATION_RULE_IDS.has(issue.id)) {
    const level = issue.misrepresentationLevel || issue.severity || 'medium'
    return GMC_MISREPRESENTATION_WEIGHTS[level] ?? GMC_MISREPRESENTATION_WEIGHTS.medium
  }

  const tier = resolveGmcRiskTier(issue)
  return GMC_RISK_WEIGHTS[tier]
}

/**
 * @param {number} score
 * @returns {'LOW RISK' | 'MEDIUM RISK' | 'HIGH RISK'}
 */
export function getGmcRiskLevel(score) {
  if (score >= 90) return 'LOW RISK'
  if (score >= 70) return 'MEDIUM RISK'
  return 'HIGH RISK'
}

/**
 * @param {Array} issues
 * @returns {{ gmcRiskScore: number, riskLevel: string, criticalIssues: Array, warnings: Array, advisories: Array }}
 */
export function calculateGmcApprovalRisk(issues) {
  const sorted = sortGmcIssuesByDisapprovalPriority(issues)
  const criticalIssues = []
  const warnings = []
  const advisories = []

  for (const issue of sorted) {
    const tier = resolveGmcRiskTier(issue)
    if (tier === 'critical') criticalIssues.push(issue)
    else if (tier === 'warning') warnings.push(issue)
    else advisories.push(issue)
  }

  const penalty = sorted.reduce((sum, issue) => sum + getIssuePenalty(issue), 0)

  const gmcRiskScore = Math.max(0, Math.min(100, 100 - penalty))
  const riskLevel = getGmcRiskLevel(gmcRiskScore)

  return {
    gmcRiskScore,
    riskLevel,
    criticalIssues,
    warnings,
    advisories,
  }
}

/**
 * Sort GMC issues by disapproval priority (severity first, then rule priority).
 * @param {Array} issues
 */
export function sortGmcIssuesByDisapprovalPriority(issues) {
  return [...issues].sort((a, b) => {
    const severityDiff =
      (SEVERITY_SORT_ORDER[a.severity] ?? 9) - (SEVERITY_SORT_ORDER[b.severity] ?? 9)
    if (severityDiff !== 0) return severityDiff

    const priorityDiff =
      (GMC_DISAPPROVAL_PRIORITY[a.id] ?? 999) - (GMC_DISAPPROVAL_PRIORITY[b.id] ?? 999)
    if (priorityDiff !== 0) return priorityDiff

    return String(a.id).localeCompare(String(b.id))
  })
}

function buildRiskAreaStatus(ruleIds, failedRuleIds, issuesById = new Map()) {
  const failedInArea = ruleIds.filter((id) => failedRuleIds.includes(id))
  if (failedInArea.length === 0) return 'pass'

  const tiers = failedInArea.map((id) => {
    const issue = issuesById.get(id)
    return issue ? resolveGmcRiskTier(issue) : 'warning'
  })

  if (tiers.includes('critical')) return 'critical'
  if (tiers.includes('warning')) return 'warning'
  if (tiers.includes('advisory')) return 'warning'
  return 'pass'
}

function buildRiskSummaryHeadline(riskLevel, criticalCount, warningCount) {
  if (riskLevel === 'LOW RISK' && criticalCount === 0 && warningCount === 0) {
    return 'No significant Merchant Center approval risks detected in this scan.'
  }
  if (criticalCount > 0) {
    return `${criticalCount} critical issue${criticalCount === 1 ? '' : 's'} may block Merchant Center approval.`
  }
  if (warningCount > 0) {
    return `${warningCount} warning${warningCount === 1 ? '' : 's'} may reduce Merchant Center approval probability.`
  }
  return 'Review advisory items to strengthen Merchant Center approval readiness.'
}

function buildRiskSummaryText(gmcRiskScore, criticalCount, warningCount, advisoryCount) {
  const parts = [`Approval risk score is ${gmcRiskScore}/100.`]

  const issueParts = []
  if (criticalCount > 0) {
    issueParts.push(`${criticalCount} critical issue${criticalCount === 1 ? '' : 's'}`)
  }
  if (warningCount > 0) {
    issueParts.push(`${warningCount} warning issue${warningCount === 1 ? '' : 's'}`)
  }
  if (advisoryCount > 0) {
    issueParts.push(`${advisoryCount} advisory item${advisoryCount === 1 ? '' : 's'}`)
  }

  if (issueParts.length === 0) {
    parts.push('No open approval risks detected in the current rule set.')
  } else {
    parts.push(`${issueParts.join(', ')} identified.`)
  }

  return parts.join(' ')
}

function toFixRecommendation(issue, priority) {
  return {
    priority,
    ruleId: issue.id,
    title: issue.title || issue.name,
    action: issue.fixSuggestion || issue.message,
    impact: issue.impact || '',
    severity: issue.severity,
    riskTier: resolveGmcRiskTier(issue),
  }
}

function formatIssueCountLine(criticalCount, warningCount, advisoryCount) {
  const parts = []
  if (criticalCount > 0) {
    parts.push(`${criticalCount} Critical issue${criticalCount === 1 ? '' : 's'}`)
  }
  if (warningCount > 0) {
    parts.push(`${warningCount} Warning issue${warningCount === 1 ? '' : 's'}`)
  }
  if (advisoryCount > 0) {
    parts.push(`${advisoryCount} Advisory item${advisoryCount === 1 ? '' : 's'}`)
  }
  return parts
}

/**
 * Build GMC Approval Risk product report section.
 * @param {object} params
 * @param {Array} params.gmcIssues - enriched GMC-category issues
 * @param {Array} [params.complianceIssues] - all compliance issues for weighted risk score (GMC mode)
 * @param {number|null} [params.readinessScore] - legacy module pass-rate score
 * @param {{ total?: number, passed?: number, failed?: number, warnings?: number }} [params.summary]
 * @param {boolean} [params.useRiskModel=true]
 */
export function buildGmcReadinessReport({
  gmcIssues,
  complianceIssues,
  readinessScore,
  summary = {},
  useRiskModel = true,
}) {
  const sortedGmcIssues = sortGmcIssuesByDisapprovalPriority(gmcIssues)
  const riskSourceIssues =
    useRiskModel && complianceIssues?.length ? complianceIssues : sortedGmcIssues

  const {
    gmcRiskScore,
    riskLevel,
    criticalIssues,
    warnings,
    advisories,
  } = calculateGmcApprovalRisk(riskSourceIssues)

  const failedRuleIds = riskSourceIssues.map((issue) => issue.id)
  const issuesById = new Map(riskSourceIssues.map((issue) => [issue.id, issue]))
  const criticalCount = criticalIssues.length
  const warningCount = warnings.length
  const advisoryCount = advisories.length

  const displayScore = useRiskModel ? gmcRiskScore : readinessScore
  const fixRecommendations = sortGmcIssuesByDisapprovalPriority(
    [...criticalIssues, ...warnings, ...advisories.filter((issue) => issue.fixSuggestion || issue.impact)]
  ).map((issue, index) => toFixRecommendation(issue, index + 1))

  const legacyReadinessLabel =
    riskLevel === 'LOW RISK'
      ? 'Low Risk'
      : riskLevel === 'MEDIUM RISK'
        ? 'Medium Risk'
        : 'High Risk'

  return {
    gmcRiskScore,
    riskLevel,
    criticalIssues,
    warnings,
    advisories,
    readinessScore: displayScore ?? readinessScore ?? gmcRiskScore,
    readinessLabel: legacyReadinessLabel,
    status:
      criticalCount > 0 ? 'high_risk' : warningCount > 0 ? 'medium_risk' : 'low_risk',
    riskSummary: {
      headline: buildRiskSummaryHeadline(riskLevel, criticalCount, warningCount),
      summary: buildRiskSummaryText(gmcRiskScore, criticalCount, warningCount, advisoryCount),
      status:
        criticalCount > 0 ? 'high_risk' : warningCount > 0 ? 'medium_risk' : 'low_risk',
      criticalCount,
      warningCount,
      advisoryCount,
      issueCountLine: formatIssueCountLine(criticalCount, warningCount, advisoryCount),
      blocksApproval: criticalCount > 0,
      riskAreas: GMC_RISK_AREAS.map((area) => ({
        id: area.id,
        label: area.label,
        status: buildRiskAreaStatus(area.ruleIds, failedRuleIds, issuesById),
        failedRules: area.ruleIds.filter((id) => failedRuleIds.includes(id)),
      })),
    },
    fixRecommendations,
    issuesSorted: sortedGmcIssues,
  }
}
