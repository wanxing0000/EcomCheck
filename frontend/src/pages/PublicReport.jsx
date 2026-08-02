import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  getAuditProduct,
  getComplianceScoreEntries,
  getPrimaryScoreRings,
  getReportSubtitle,
  getReportTitle,
  getReportProductLabel,
  isFullAudit,
  isGmcAuditProduct,
  isSeoAuditProduct,
  showIssueCategory,
} from '../utils/auditDisplay.js'

const CATEGORY_ORDER = ['trust', 'policy', 'technical', 'seo', 'ads', 'gmc']

const CATEGORY_LABELS = {
  trust: 'Trust',
  policy: 'Policy',
  technical: 'Technical',
  seo: 'SEO',
  ads: 'Ads',
  gmc: 'GMC',
}

function scoreColor(value) {
  if (value == null) return '#d1d5db'
  if (value >= 80) return '#22c55e'
  if (value >= 60) return '#f59e0b'
  return '#ef4444'
}

function SeverityBadge({ severity, label }) {
  const styles = {
    high: 'bg-red-100 text-red-800 border-red-200',
    medium: 'bg-amber-100 text-amber-900 border-amber-200',
    low: 'bg-blue-100 text-blue-800 border-blue-200',
    warning: 'bg-sky-50 text-sky-800 border-sky-200',
  }

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${styles[severity] || styles.medium}`}>
      {label || severity}
    </span>
  )
}

function IssueCard({ issue }) {
  const borderStyles = {
    high: 'border-red-200 bg-red-50',
    medium: 'border-amber-200 bg-amber-50',
    low: 'border-blue-200 bg-blue-50',
    warning: 'border-sky-200 bg-sky-50',
  }

  return (
    <li className={`rounded-lg border px-4 py-4 ${borderStyles[issue.severity] || borderStyles.medium}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-white/70 px-1.5 py-0.5 text-xs font-bold text-gray-700">{issue.id}</span>
        <SeverityBadge severity={issue.severity} label={issue.severityLabel} />
      </div>
      <h4 className="mt-2 text-sm font-semibold text-gray-900">{issue.title || issue.name}</h4>
      <p className="mt-1 text-sm text-gray-700">{issue.message}</p>
      {issue.fixSuggestion && (
        <p className="mt-2 text-sm text-gray-600">
          <span className="font-medium text-gray-800">Fix: </span>
          {issue.fixSuggestion}
        </p>
      )}
    </li>
  )
}

function ScoreRing({ label, value, size = 'md' }) {
  const dim = size === 'lg' ? 'h-24 w-24 border-8 text-3xl' : 'h-16 w-16 border-[5px] text-xl'
  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex items-center justify-center rounded-full font-bold text-gray-900 ${dim}`}
        style={{ borderColor: scoreColor(value) }}
      >
        {value ?? '—'}
      </div>
      <p className="mt-2 text-xs font-medium text-gray-600">{label}</p>
    </div>
  )
}

function buildIssues(auditData) {
  if (auditData.report?.issues?.length) {
    return auditData.report.issues
  }

  return (auditData.issues || []).map((issue) => ({
    ...issue,
    title: issue.name,
    severityLabel: issue.severity,
    fixSuggestion: auditData.recommendations?.find((rec) => rec.id === issue.id)?.text || '',
  }))
}

function groupIssuesByCategory(issues, issuesByCategory) {
  if (issuesByCategory && Object.keys(issuesByCategory).length > 0) {
    return issuesByCategory
  }

  return issues.reduce((groups, issue) => {
    const category = issue.category || 'technical'
    if (!groups[category]) groups[category] = []
    groups[category].push(issue)
    return groups
  }, {})
}

export default function PublicReport() {
  const { id } = useParams()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [record, setRecord] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadReport() {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/reports/${id}`)
        const json = await res.json()

        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Report not found')
        }

        if (!cancelled) {
          setRecord(json.data)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message)
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadReport()
    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">Loading report...</p>
      </div>
    )
  }

  if (error || !record) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <Card className="border-red-200 bg-red-50">
          <h1 className="text-lg font-semibold text-red-900">Report unavailable</h1>
          <p className="mt-2 text-sm text-red-700">{error || 'This report could not be loaded.'}</p>
          <div className="mt-4">
            <Link to="/">
              <Button variant="primary">Scan a Store</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  const auditData = record.data || {}
  const scores = auditData.report?.scores || {
    overall: record.score ?? auditData.score,
    compliance: auditData.report?.scores?.compliance ?? null,
    gmc: record.gmcScore ?? auditData.gmc?.score ?? null,
    ads: auditData.modules?.ads?.score ?? null,
    technical: auditData.modules?.technical?.score ?? null,
    trust: auditData.report?.scores?.trust ?? null,
    policy: auditData.report?.scores?.policy ?? null,
    seo: auditData.modules?.seo?.score ?? auditData.report?.scores?.seo ?? null,
  }
  const issues = buildIssues(auditData)
  const issuesByCategory = groupIssuesByCategory(issues, auditData.report?.issuesByCategory)
  const recommendations = auditData.recommendations || []
  const auditProduct = getAuditProduct(auditData)
  const reportTitle = getReportTitle(auditData)
  const reportProductLabel = getReportProductLabel(auditData)
  const reportSubtitle = getReportSubtitle(auditData)
  const fullAudit = isFullAudit(auditData)
  const gmcAuditProduct = isGmcAuditProduct(auditData)
  const seoAuditProduct = isSeoAuditProduct(auditData)
  const complianceScoreEntries = getComplianceScoreEntries(scores)
  const primaryScoreRings = getPrimaryScoreRings(auditData, scores, {
    complianceTotal: auditData.report?.issueCounts?.complianceTotal,
    seoTotal: auditData.report?.issueCounts?.seoTotal,
    total: auditData.report?.issueCounts?.total ?? issues.length,
  })
  const visibleCategories = CATEGORY_ORDER.filter((category) => showIssueCategory(auditData, category))
  const filteredIssues = issues.filter((issue) => showIssueCategory(auditData, issue.category))

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600">{reportProductLabel}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {reportTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{reportSubtitle}</p>
          <p className="mt-2 break-all text-gray-500">{record.url || auditData.url}</p>
          <p className="mt-1 text-xs text-gray-400">
            Scanned on{' '}
            {new Date(record.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          <p className="mt-1 text-xs text-gray-400">Report ID: {record.id}</p>
        </div>

        {primaryScoreRings.length > 0 && (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            {primaryScoreRings.map((ring) => (
              <ScoreRing key={ring.label} label={ring.label} value={ring.value} size={ring.size} />
            ))}
          </div>
        )}
      </div>

      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Website</h2>
        <p className="mt-2 break-all text-sm text-gray-700">{record.url || auditData.url}</p>
      </Card>

      {(fullAudit || gmcAuditProduct) && complianceScoreEntries.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Scores</h2>
          <p className="mt-1 text-sm text-gray-500">
            {fullAudit
              ? 'Legacy full audit — compliance areas included in this report.'
              : 'Compliance areas included in your GMC audit.'}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {complianceScoreEntries.map((entry) => (
              <ScoreRing key={entry.label} label={entry.label} value={entry.value} />
            ))}
          </div>
        </Card>
      )}

      {auditData.report?.quickSummary && (
        <Card className="mt-6 border-brand-100 bg-gradient-to-r from-brand-50 to-white">
          <h2 className="text-lg font-semibold text-gray-900">Summary</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{auditData.report.quickSummary}</p>
        </Card>
      )}

      {filteredIssues.length > 0 ? (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Issues</h2>
          <div className="mt-6 space-y-8">
            {visibleCategories.map((category) => {
              const categoryIssues = issuesByCategory[category]
              if (!categoryIssues?.length) return null

              return (
                <div key={category}>
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                    {CATEGORY_LABELS[category] || category}
                  </h3>
                  <ul className="mt-3 space-y-3">
                    {categoryIssues.map((issue) => (
                      <IssueCard key={`${issue.id}-${issue.severity}`} issue={issue} />
                    ))}
                  </ul>
                </div>
              )
            })}
          </div>
        </Card>
      ) : (
        <Card className="mt-6 border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-800">No issues found for this audit.</p>
        </Card>
      )}

      {recommendations.length > 0 && fullAudit && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Recommendations</h2>
          <ul className="mt-4 space-y-3">
            {recommendations.map((rec) => (
              <li key={rec.id} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-white px-1.5 py-0.5 text-xs font-bold text-gray-700">{rec.id}</span>
                  {rec.priority && (
                    <span className="text-xs font-semibold uppercase text-amber-600">{rec.priority}</span>
                  )}
                </div>
                <p className="mt-2 text-sm text-gray-700">{rec.text}</p>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mt-10 text-center">
        <Link to="/">
          <Button variant="primary" size="lg">
            Scan Your Store
          </Button>
        </Link>
      </div>
    </div>
  )
}
