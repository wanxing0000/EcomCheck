/**
 * GMC Readiness presentation layer — does not change rule pass/fail outcomes.
 */

/** Lower number = higher Google Shopping disapproval priority */
const GMC_DISAPPROVAL_PRIORITY = {
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

const GMC_RISK_AREAS = [
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

function getReadinessLabel(readinessScore, criticalCount) {
  if (criticalCount > 0) return 'Not Ready'
  if (readinessScore == null) return 'Unknown'
  if (readinessScore >= 90) return 'Ready'
  if (readinessScore >= 70) return 'Nearly Ready'
  return 'Needs Work'
}

function getReadinessStatus(readinessScore, criticalCount) {
  if (criticalCount > 0) return 'not_ready'
  if (readinessScore == null) return 'unknown'
  if (readinessScore >= 85) return 'ready'
  return 'needs_work'
}

function buildRiskAreaStatus(ruleIds, failedRuleIds) {
  const failedInArea = ruleIds.filter((id) => failedRuleIds.includes(id))
  if (failedInArea.length === 0) return 'pass'
  if (failedInArea.some((id) => ['G001', 'G002', 'G006', 'G003', 'G004'].includes(id))) {
    return 'critical'
  }
  return 'warning'
}

function buildRiskSummaryHeadline(readinessLabel, criticalCount, warningCount) {
  if (readinessLabel === 'Ready') {
    return 'Your store meets Google Merchant Center readiness requirements.'
  }
  if (criticalCount > 0) {
    return `${criticalCount} critical GMC issue${criticalCount === 1 ? '' : 's'} may block Shopping approval.`
  }
  if (warningCount > 0) {
    return `${warningCount} GMC warning${warningCount === 1 ? '' : 's'} should be resolved before scaling Shopping ads.`
  }
  return 'Improve GMC signals to reduce disapproval risk before launching Google Shopping.'
}

function buildRiskSummaryText(readinessScore, criticalCount, warningCount, passedRules, totalRules) {
  if (totalRules === 0) {
    return 'GMC readiness checks were not available for this scan.'
  }

  const parts = [
    `GMC Readiness Score is ${readinessScore ?? '—'}/100.`,
    `${passedRules}/${totalRules} GMC checks passed.`,
  ]

  if (criticalCount > 0) {
    parts.push(`${criticalCount} issue(s) flagged as critical for Merchant Center approval.`)
  } else if (warningCount > 0) {
    parts.push(`${warningCount} advisory item(s) remain.`)
  } else {
    parts.push('No open GMC blockers detected in the current rule set.')
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
  }
}

/**
 * Build GMC Readiness product report section.
 * @param {object} params
 * @param {Array} params.gmcIssues - enriched GMC issues from reportBuilder
 * @param {number|null} params.readinessScore
 * @param {{ total?: number, passed?: number, failed?: number, warnings?: number }} [params.summary]
 */
export function buildGmcReadinessReport({ gmcIssues, readinessScore, summary = {} }) {
  const sortedIssues = sortGmcIssuesByDisapprovalPriority(gmcIssues)
  const criticalIssues = sortedIssues.filter(
    (issue) => issue.severity === 'high' || issue.severity === 'medium'
  )
  const warnings = sortedIssues.filter(
    (issue) => issue.severity === 'warning' || issue.severity === 'low'
  )

  const failedRuleIds = sortedIssues
    .filter((issue) => issue.severity !== 'warning')
    .map((issue) => issue.id)

  const totalRules = summary.total ?? sortedIssues.length
  const passedRules = summary.passed ?? Math.max(totalRules - failedRuleIds.length, 0)
  const criticalCount = criticalIssues.filter((issue) => issue.severity === 'high').length
  const warningCount = warnings.length
  const readinessLabel = getReadinessLabel(readinessScore, criticalCount)
  const status = getReadinessStatus(readinessScore, criticalCount)

  const fixRecommendations = sortGmcIssuesByDisapprovalPriority(
    [...criticalIssues, ...warnings.filter((issue) => issue.fixSuggestion || issue.impact)]
  ).map((issue, index) => toFixRecommendation(issue, index + 1))

  return {
    readinessScore,
    readinessLabel,
    status,
    riskSummary: {
      headline: buildRiskSummaryHeadline(readinessLabel, criticalCount, warningCount),
      summary: buildRiskSummaryText(
        readinessScore,
        criticalCount,
        warningCount,
        passedRules,
        totalRules
      ),
      status,
      criticalCount,
      warningCount,
      passedRules,
      totalRules,
      blocksApproval: criticalCount > 0,
      riskAreas: GMC_RISK_AREAS.map((area) => ({
        id: area.id,
        label: area.label,
        status: buildRiskAreaStatus(area.ruleIds, failedRuleIds),
        failedRules: area.ruleIds.filter((id) => failedRuleIds.includes(id)),
      })),
    },
    criticalIssues,
    warnings,
    fixRecommendations,
    issuesSorted: sortedIssues,
  }
}
