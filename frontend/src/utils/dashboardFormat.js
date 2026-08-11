import { getAuditProductForMode } from '../data/auditProducts.js'

export function formatAuditMode(mode) {
  if (!mode) return 'Audit'
  return getAuditProductForMode(mode).name
}

export function formatReportScore(report) {
  if (report.score != null) return report.score
  if (report.auditMode === 'gmc' && report.gmcScore != null) return report.gmcScore
  return '—'
}

export function formatScoreChange(report) {
  if (report.scoreChange) return report.scoreChange
  if (report.scoreChangeValue === 0) return '0'
  return '—'
}

export function scoreChangeClassName(report) {
  if (report.trend === 'up') return 'text-emerald-700'
  if (report.trend === 'down') return 'text-red-700'
  return 'text-gray-500'
}

export function formatReportDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export function filterReportsByMode(reports, filter) {
  if (filter === 'all') return reports
  return reports.filter((report) => report.auditMode === filter)
}
