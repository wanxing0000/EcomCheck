/**
 * Audit Comparison — diff two audit summaries for progress tracking.
 * Does not modify rule pass/fail or scoring logic.
 */

import { getRuleTitle } from './auditHistory.js'

function buildRuleStatusMap(summary) {
  const map = new Map()
  for (const issue of summary?.issues || []) {
    map.set(issue.id, issue.status === 'passed')
  }
  return map
}

function diffScore(before, after) {
  if (before == null || after == null) return null
  return after - before
}

function buildScoreChange(previous, current) {
  const change = {}
  const keys = ['gmc', 'compliance', 'trust', 'policy']

  for (const key of keys) {
    const delta = diffScore(previous?.score?.[key], current?.score?.[key])
    if (delta != null && delta !== 0) {
      change[key] = delta > 0 ? `+${delta}` : String(delta)
    }
  }

  return change
}

function buildComparisonSummary({ resolvedRules, scoreChange, riskChange }) {
  if (resolvedRules.includes('G008')) {
    return 'Your store improved after fixing payment information.'
  }

  if (resolvedRules.includes('G010')) {
    return 'Your store improved after addressing shipping policy gaps.'
  }

  if (resolvedRules.includes('M003')) {
    return 'Your store improved after strengthening product trust signals.'
  }

  if (resolvedRules.includes('M002')) {
    return 'Your store improved after expanding store policies.'
  }

  const gmcDelta = scoreChange.gmc
  if (gmcDelta && gmcDelta.startsWith('+')) {
    return `Your store readiness improved by ${gmcDelta.replace('+', '')} points.`
  }

  if (riskChange.before !== riskChange.after) {
    return `Approval risk changed from ${riskChange.before} to ${riskChange.after}.`
  }

  if (resolvedRules.length > 0) {
    return 'Your store improved after addressing prior audit findings.'
  }

  return 'Scan complete — review remaining issues to continue improving readiness.'
}

/**
 * @param {object|null} previousReport - prior audit summary
 * @param {object|null} currentReport - current audit summary
 */
export function compareAuditReports(previousReport, currentReport) {
  if (!previousReport || !currentReport) {
    return null
  }

  const previousRules = buildRuleStatusMap(previousReport)
  const currentRules = buildRuleStatusMap(currentReport)
  const allRuleIds = new Set([...previousRules.keys(), ...currentRules.keys()])

  const resolvedRules = []
  const newIssues = []
  const remainingIssues = []

  for (const ruleId of allRuleIds) {
    const wasPassed = previousRules.get(ruleId)
    const isPassed = currentRules.get(ruleId)

    if (wasPassed === false && isPassed === true) {
      resolvedRules.push(ruleId)
    } else if (wasPassed === true && isPassed === false) {
      newIssues.push(ruleId)
    } else if (isPassed === false) {
      remainingIssues.push(ruleId)
    }
  }

  const scoreChange = buildScoreChange(previousReport, currentReport)
  const riskChange = {
    before: previousReport.approvalRisk?.level ?? 'unknown',
    after: currentReport.approvalRisk?.level ?? 'unknown',
  }

  return {
    scoreChange,
    riskChange,
    resolvedRules,
    resolvedRuleDetails: resolvedRules.map((ruleId) => ({
      ruleId,
      title: getRuleTitle(ruleId, currentReport),
    })),
    newIssues,
    newIssueDetails: newIssues.map((ruleId) => ({
      ruleId,
      title: getRuleTitle(ruleId, currentReport),
    })),
    remainingIssues,
    remainingIssueDetails: remainingIssues.map((ruleId) => ({
      ruleId,
      title: getRuleTitle(ruleId, currentReport),
    })),
    previous: {
      gmcRiskScore: previousReport.approvalRisk?.score ?? previousReport.score?.gmc,
      approvalRisk: previousReport.approvalRisk?.level ?? 'unknown',
      createdAt: previousReport.createdAt,
    },
    current: {
      gmcRiskScore: currentReport.approvalRisk?.score ?? currentReport.score?.gmc,
      approvalRisk: currentReport.approvalRisk?.level ?? 'unknown',
      createdAt: currentReport.createdAt,
    },
    summary: buildComparisonSummary({ resolvedRules, scoreChange, riskChange }),
  }
}

export async function buildPreviousAuditComparison({
  website,
  auditMode,
  currentSummary,
  previousSummary = null,
  excludeId = null,
}) {
  const { getPreviousAuditSummary } = await import('./auditHistory.js')
  const previous = previousSummary ?? (await getPreviousAuditSummary(website, { auditMode, excludeId }))

  if (!previous) return null
  return compareAuditReports(previous, currentSummary)
}
