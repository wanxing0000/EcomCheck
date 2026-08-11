/**
 * Audit history intelligence — trends and comparisons from saved audit_reports.
 * Uses existing auditComparison + auditHistory summary shapes; does not modify audit engine.
 */

import { compareAuditReports } from './auditComparison.js'
import { buildAuditSummary, normalizeWebsiteKey } from './auditHistory.js'

function reportGroupKey(report) {
  return `${normalizeWebsiteKey(report.url)}::${report.auditMode || 'gmc'}`
}

function readReportScore(report) {
  if (report?.score != null) return report.score
  if (report?.gmcScore != null) return report.gmcScore
  return null
}

export function computeScoreDelta(currentScore, previousScore) {
  if (currentScore == null || previousScore == null) return null
  return currentScore - previousScore
}

export function formatScoreDelta(delta) {
  if (delta == null || delta === 0) return null
  return delta > 0 ? `+${delta}` : String(delta)
}

export function scoreTrendDirection(delta) {
  if (delta == null || delta === 0) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

/**
 * Build an audit summary from a stored report record (audit_reports row).
 * @param {{ id: string, url: string, auditMode?: string|null, createdAt: string, score?: number|null, gmcScore?: number|null, data?: object }} record
 */
export function buildSummaryFromReportRecord(record) {
  const auditData = record?.data || {}
  const summary = buildAuditSummary({
    id: record.id,
    website: record.url,
    auditMode: record.auditMode || auditData.auditMode || auditData.auditPlan?.mode || 'gmc',
    createdAt: record.createdAt,
    professionalReport: auditData.report || {},
    ruleResults: auditData.rules || [],
  })

  const storedScore = readReportScore(record)
  if (storedScore != null) {
    summary.score.compliance = storedScore
  }

  return summary
}

/**
 * Attach score change and trend metadata to each report summary row.
 * @param {object[]} reports
 */
export function enrichReportHistory(reports) {
  const sorted = [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const groups = new Map()

  for (const report of sorted) {
    const key = reportGroupKey(report)
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(report)
  }

  return sorted.map((report) => {
    const group = groups.get(reportGroupKey(report)) || []
    const index = group.findIndex((entry) => entry.id === report.id)
    const older = index >= 0 ? group[index + 1] : null
    const currentScore = readReportScore(report)
    const previousScore = older ? readReportScore(older) : null
    const delta = computeScoreDelta(currentScore, previousScore)

    return {
      ...report,
      previousScore,
      scoreChange: formatScoreDelta(delta),
      scoreChangeValue: delta,
      trend: scoreTrendDirection(delta),
    }
  })
}

/**
 * Dashboard-level history summary from saved report rows.
 * @param {object[]} reports
 */
export function buildHistorySummary(reports) {
  const sorted = [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const latest = sorted[0]
  const previous = sorted[1]
  const latestScore = latest ? readReportScore(latest) : null
  const previousScore = previous ? readReportScore(previous) : null
  const scoreImprovement = computeScoreDelta(latestScore, previousScore)

  const scoreTrend = [...sorted]
    .reverse()
    .map((report) => ({
      date: report.createdAt,
      score: readReportScore(report),
      url: report.url,
      auditMode: report.auditMode,
      reportId: report.id,
    }))
    .filter((entry) => entry.score != null)

  return {
    totalAudits: reports.length,
    latestScore,
    previousScore,
    scoreImprovement,
    scoreImprovementLabel: formatScoreDelta(scoreImprovement),
    latestReportId: latest?.id ?? null,
    previousReportId: previous?.id ?? null,
    scoreTrend,
  }
}

/**
 * Find the prior saved report for comparison (same URL + audit mode when possible).
 * @param {object[]} reports
 * @param {object} currentReport
 */
export function findPreviousReportForComparison(reports, currentReport) {
  const sorted = [...reports].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const key = reportGroupKey(currentReport)
  const sameSite = sorted.filter((report) => reportGroupKey(report) === key)
  const index = sameSite.findIndex((report) => report.id === currentReport.id)

  if (index >= 0 && sameSite[index + 1]) {
    return sameSite[index + 1]
  }

  if (sorted[0]?.id === currentReport.id) {
    return sorted[1] ?? null
  }

  return null
}

/**
 * Compare two saved report records for issue/score deltas.
 * @param {object} currentRecord
 * @param {object} previousRecord
 */
export function compareSavedReportRecords(currentRecord, previousRecord) {
  if (!currentRecord || !previousRecord) return null

  const comparison = compareAuditReports(
    buildSummaryFromReportRecord(previousRecord),
    buildSummaryFromReportRecord(currentRecord)
  )

  if (!comparison) return null

  return {
    ...comparison,
    previous: {
      ...comparison.previous,
      complianceScore: readReportScore(previousRecord),
    },
    current: {
      ...comparison.current,
      complianceScore: readReportScore(currentRecord),
    },
    unchangedIssues: comparison.remainingIssues,
    unchangedIssueDetails: comparison.remainingIssueDetails,
  }
}

/**
 * Build comparison for the user's latest saved report vs its predecessor.
 * @param {object[]} reportSummaries
 * @param {(id: string) => Promise<object|null>} loadFullRecord
 */
export async function buildLatestReportComparison(reportSummaries, loadFullRecord) {
  if (!reportSummaries?.length) return null

  const sorted = [...reportSummaries].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  const latestSummary = sorted[0]
  const previousSummary = findPreviousReportForComparison(sorted, latestSummary)
  if (!previousSummary) return null

  const [currentRecord, previousRecord] = await Promise.all([
    loadFullRecord(latestSummary.id),
    loadFullRecord(previousSummary.id),
  ])

  return compareSavedReportRecords(currentRecord, previousRecord)
}

/**
 * Verify a stored report belongs to the authenticated user.
 * @param {object|null} record
 * @param {string} userId
 */
export function reportBelongsToUser(record, userId) {
  if (!record || !userId) return false
  if (!record.userId) return false
  return record.userId === userId
}
