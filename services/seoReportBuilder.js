/**
 * SEO Health presentation layer — does not change rule pass/fail outcomes.
 */

/** Lower number = higher SEO remediation priority */
const SEO_ISSUE_PRIORITY = {
  S008: 10,
  S001: 20,
  S003: 30,
  S002: 40,
  S007: 50,
  S004: 60,
  S006: 70,
  S005: 80,
}

const SEVERITY_SORT_ORDER = {
  high: 0,
  medium: 1,
  low: 2,
  warning: 3,
}

const SEO_RISK_AREAS = [
  {
    id: 'on-page',
    label: 'On-page SEO',
    ruleIds: ['S001', 'S002', 'S003'],
  },
  {
    id: 'technical',
    label: 'Technical SEO',
    ruleIds: ['S004', 'S005'],
  },
  {
    id: 'structured-data',
    label: 'Structured Data',
    ruleIds: ['S006', 'S007'],
  },
  {
    id: 'crawlability',
    label: 'Crawlability',
    ruleIds: ['S008'],
  },
]

const CRITICAL_RULE_IDS = new Set(['S008', 'S001', 'S002', 'S003', 'S007'])

/**
 * Sort SEO issues by remediation priority (severity first, then rule priority).
 * @param {Array} issues
 */
export function sortSeoIssuesByPriority(issues) {
  return [...issues].sort((a, b) => {
    const severityDiff =
      (SEVERITY_SORT_ORDER[a.severity] ?? 9) - (SEVERITY_SORT_ORDER[b.severity] ?? 9)
    if (severityDiff !== 0) return severityDiff

    const priorityDiff =
      (SEO_ISSUE_PRIORITY[a.id] ?? 999) - (SEO_ISSUE_PRIORITY[b.id] ?? 999)
    if (priorityDiff !== 0) return priorityDiff

    return String(a.id).localeCompare(String(b.id))
  })
}

function getSeoLabel(seoScore, criticalIssues) {
  if (seoScore == null) return 'Unknown'
  if (criticalIssues.length > 0 && seoScore < 50) return 'Poor'
  if (criticalIssues.length > 0 && seoScore < 75) return 'Needs Improvement'
  if (seoScore >= 90 && criticalIssues.length === 0) return 'Excellent'
  if (seoScore >= 75) return 'Good'
  if (seoScore >= 50) return 'Needs Improvement'
  return 'Poor'
}

function getSeoStatus(seoLabel) {
  switch (seoLabel) {
    case 'Excellent':
      return 'excellent'
    case 'Good':
      return 'good'
    case 'Needs Improvement':
      return 'needs_improvement'
    case 'Poor':
      return 'poor'
    default:
      return 'unknown'
  }
}

function buildRiskAreaStatus(ruleIds, failedRuleIds) {
  const failedInArea = ruleIds.filter((id) => failedRuleIds.includes(id))
  if (failedInArea.length === 0) return 'pass'
  if (failedInArea.some((id) => CRITICAL_RULE_IDS.has(id))) return 'critical'
  return 'warning'
}

function buildRiskSummaryHeadline(seoLabel, criticalCount, warningCount) {
  if (seoLabel === 'Excellent') {
    return 'Homepage SEO signals are in strong shape for organic discovery.'
  }
  if (criticalCount > 0) {
    return `${criticalCount} critical SEO issue${criticalCount === 1 ? '' : 's'} may limit search visibility.`
  }
  if (warningCount > 0) {
    return `${warningCount} SEO warning${warningCount === 1 ? '' : 's'} should be addressed to improve organic performance.`
  }
  return 'Improve homepage SEO signals to strengthen organic search performance.'
}

function buildRiskSummaryText(seoScore, criticalCount, warningCount, passedRules, totalRules) {
  if (totalRules === 0) {
    return 'SEO health checks were not available for this scan.'
  }

  const parts = [
    `SEO Health Score is ${seoScore ?? '—'}/100.`,
    `${passedRules}/${totalRules} SEO checks passed.`,
  ]

  if (criticalCount > 0) {
    parts.push(`${criticalCount} issue(s) flagged as critical for organic visibility.`)
  } else if (warningCount > 0) {
    parts.push(`${warningCount} advisory item(s) remain.`)
  } else {
    parts.push('No open SEO blockers detected in the current rule set.')
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
 * Build SEO Health product report section.
 * @param {object} params
 * @param {Array} params.seoIssues - enriched SEO issues from reportBuilder
 * @param {number|null} params.seoScore
 * @param {{ total?: number, passed?: number, failed?: number, warnings?: number }} [params.summary]
 */
export function buildSeoHealthReport({ seoIssues, seoScore, summary = {} }) {
  const sortedIssues = sortSeoIssuesByPriority(seoIssues)
  const criticalIssues = sortedIssues.filter(
    (issue) => issue.severity === 'high' || issue.severity === 'medium'
  )
  const warnings = sortedIssues.filter(
    (issue) => issue.severity === 'warning' || issue.severity === 'low'
  )

  const failedRuleIds = sortedIssues
    .filter((issue) => issue.severity !== 'warning')
    .map((issue) => issue.id)

  const totalRules = summary.total ?? Math.max(sortedIssues.length, 0)
  const passedRules =
    summary.passed ??
    (summary.total != null ? Math.max(summary.total - failedRuleIds.length, 0) : Math.max(8 - failedRuleIds.length, 0))
  const criticalCount = criticalIssues.length
  const warningCount = warnings.length
  const seoLabel = getSeoLabel(seoScore, criticalIssues)
  const status = getSeoStatus(seoLabel)

  const fixRecommendations = sortSeoIssuesByPriority(
    [...criticalIssues, ...warnings.filter((issue) => issue.fixSuggestion || issue.impact)]
  ).map((issue, index) => toFixRecommendation(issue, index + 1))

  return {
    seoScore,
    seoLabel,
    status,
    riskSummary: {
      headline: buildRiskSummaryHeadline(seoLabel, criticalCount, warningCount),
      summary: buildRiskSummaryText(
        seoScore,
        criticalCount,
        warningCount,
        passedRules,
        summary.total ?? 8
      ),
      status,
      criticalCount,
      warningCount,
      passedRules,
      totalRules: summary.total ?? 8,
      riskAreas: SEO_RISK_AREAS.map((area) => ({
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
