import { getAuditProductForMode } from '../data/auditProducts.js'

export function formatAuditMode(mode) {
  if (!mode) return 'Audit'
  return getAuditProductForMode(mode).name
}

export function formatReportScore(report) {
  if (report.auditMode === 'gmc' && report.gmcScore != null) {
    return report.gmcScore
  }
  return report.score ?? '—'
}

export function formatReportDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

export function filterReportsByMode(reports, filter) {
  if (filter === 'all') return reports
  return reports.filter((report) => report.auditMode === filter)
}
