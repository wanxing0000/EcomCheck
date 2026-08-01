import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'

function formatNumber(n) {
  return n?.toLocaleString?.('en-US') ?? '0'
}

const PAGE_LABELS = {
  aboutUs: 'About Us',
  contactUs: 'Contact Us',
  privacyPolicy: 'Privacy Policy',
  refundPolicy: 'Refund Policy',
  shippingPolicy: 'Shipping Policy',
}

const CATEGORY_ORDER = ['trust', 'policy', 'technical', 'ads', 'gmc']

const CATEGORY_LABELS = {
  trust: 'Trust',
  policy: 'Policy',
  technical: 'Technical',
  ads: 'Ads',
  gmc: 'GMC',
}

const MODULE_LABELS = {
  gmc: 'GMC',
  ads: 'Ads',
  technical: 'Technical',
  seo: 'SEO',
  performance: 'Performance',
}

function getCoverageLabelStyle(label) {
  switch (label) {
    case 'Excellent':
      return 'text-green-700 bg-green-50 border-green-200'
    case 'Good':
      return 'text-blue-700 bg-blue-50 border-blue-200'
    case 'Needs Improvement':
      return 'text-amber-700 bg-amber-50 border-amber-200'
    case 'Critical':
      return 'text-red-700 bg-red-50 border-red-200'
    default:
      return 'text-gray-700 bg-gray-50 border-gray-200'
  }
}

function getHealthStatusStyle(status) {
  switch (status) {
    case 'healthy':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-amber-100 text-amber-900 border-amber-200'
  }
}

function getHealthStatusLabel(status) {
  switch (status) {
    case 'healthy':
      return 'Healthy'
    case 'critical':
      return 'Critical'
    default:
      return 'Needs Attention'
  }
}

function getCoverageEntries(professionalReport) {
  if (professionalReport.coverage) {
    return Object.entries(professionalReport.coverage).map(([id, item]) => ({
      id,
      label: MODULE_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1),
      score: item.score,
      statusLabel: item.label,
    }))
  }

  const scores = professionalReport.scores || {}
  return Object.entries(scores)
    .filter(([id, value]) => id !== 'overall' && value != null)
    .map(([id, value]) => ({
      id,
      label: MODULE_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1),
      score: value,
      statusLabel: value >= 90 ? 'Excellent' : value >= 70 ? 'Good' : value >= 50 ? 'Needs Improvement' : 'Critical',
    }))
}

function RoadmapItem({ item }) {
  return (
    <li className="rounded-lg border border-gray-200 bg-white px-4 py-3">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">{item.category}</span>
      </div>
      <p className="mt-2 text-sm text-gray-600">{item.reason}</p>
      {item.expectedImpact && (
        <p className="mt-1 text-sm text-gray-500">
          <span className="font-medium text-gray-700">Expected impact: </span>
          {item.expectedImpact}
        </p>
      )}
    </li>
  )
}

function scoreColor(value) {
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
      <h4 className="mt-2 text-sm font-semibold text-gray-900">{issue.title}</h4>
      <p className="mt-1 text-sm text-gray-700">{issue.message}</p>
      {issue.whyItMatters && (
        <p className="mt-3 text-sm text-gray-600">
          <span className="font-medium text-gray-800">Why it matters: </span>
          {issue.whyItMatters}
        </p>
      )}
      {issue.impact && (
        <p className="mt-1 text-sm text-gray-600">
          <span className="font-medium text-gray-800">Impact: </span>
          {issue.impact}
        </p>
      )}
      {issue.fixSuggestion && (
        <p className="mt-1 text-sm text-gray-600">
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

function StatusBadge({ found }) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        found ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
      ].join(' ')}
    >
      {found ? 'Found' : 'Not found'}
    </span>
  )
}

function PlatformBadge({ platform }) {
  if (!platform?.name) {
    return <span className="text-sm text-gray-500">Unknown</span>
  }

  const labels = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    wordpress: 'WordPress',
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
        {labels[platform.name] || platform.name}
      </span>
      {platform.confidence && platform.confidence !== 'none' && (
        <span className="text-xs text-gray-400 capitalize">{platform.confidence} confidence</span>
      )}
    </span>
  )
}

export default function Report() {
  const location = useLocation()
  const navigate = useNavigate()
  const url = location.state?.url
  const crawlResult = location.state?.crawlResult

  useEffect(() => {
    if (!url || !crawlResult) {
      navigate('/', { replace: true })
    }
  }, [url, crawlResult, navigate])

  if (!url || !crawlResult) return null

  const { platform, pages, seo, meta, links, pageContent, contactInfo, score, issues, recommendations, rules, productsAudit, gmc, detectionSources, report } = crawlResult

  const adsRules = rules?.filter((r) => r.category === 'ads') ?? []
  const professionalReport = report || {
    quickSummary: score === 100 ? 'Your store passed all compliance checks.' : `${issues?.length ?? 0} issue(s) found.`,
    scores: { overall: score, gmc: gmc?.score, ads: null, technical: null },
    issuesByCategory: {},
    issues: (issues || []).map((issue) => ({
      ...issue,
      title: issue.name,
      severityLabel: issue.severity,
      whyItMatters: '',
      impact: '',
      fixSuggestion: recommendations?.find((r) => r.id === issue.id)?.text || '',
    })),
  }

  const overallScore = professionalReport.scores?.overall ?? score
  const coverageEntries = getCoverageEntries(professionalReport)
  const executiveSummary = professionalReport.executiveSummary
  const improvementRoadmap = professionalReport.improvementRoadmap

  function exportReportJson() {
    const exportPayload = {
      reportId: crawlResult.reportId || null,
      savedAt: crawlResult.savedAt || null,
      url: crawlResult.url || url,
      exportedAt: new Date().toISOString(),
      ...crawlResult,
    }

    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' })
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    const host = (crawlResult.url || url || 'report').replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '-')
    anchor.href = objectUrl
    anchor.download = `ecomcheck-${host}-${Date.now()}.json`
    anchor.click()
    URL.revokeObjectURL(objectUrl)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600">Audit Report</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Store Compliance Audit
          </h1>
          <p className="mt-2 break-all text-gray-500">{crawlResult.url || url}</p>
          <p className="mt-1 text-xs text-gray-400">
            Scanned on{' '}
            {new Date(crawlResult.savedAt || Date.now()).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
          {crawlResult.reportId && (
            <p className="mt-1 text-xs text-gray-400">Report ID: {crawlResult.reportId}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={exportReportJson}>
              Export JSON
            </Button>
            {crawlResult.reportId && (
              <Link to={`/report/${crawlResult.reportId}`}>
                <Button variant="secondary" size="sm">
                  View Public Report
                </Button>
              </Link>
            )}
          </div>
        </div>

        {overallScore != null && (
          <div className="flex flex-col items-center">
            <ScoreRing label="Overall Score" value={overallScore} size="lg" />
            <p className="mt-2 text-xs text-gray-400">
              {professionalReport.issueCounts?.total ?? issues?.length ?? 0} item
              {(professionalReport.issueCounts?.total ?? issues?.length ?? 0) !== 1 ? 's' : ''} to review
            </p>
          </div>
        )}
      </div>

      {/* Executive Summary */}
      {executiveSummary && (
        <Card className="mt-6 border-brand-100 bg-gradient-to-r from-brand-50 to-white">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Executive Summary</h2>
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getHealthStatusStyle(executiveSummary.healthStatus)}`}
            >
              {getHealthStatusLabel(executiveSummary.healthStatus)}
            </span>
          </div>
          <p className="mt-3 text-base font-medium leading-relaxed text-gray-900">{executiveSummary.headline}</p>
          {executiveSummary.summary && (
            <p className="mt-2 text-sm leading-relaxed text-gray-600">{executiveSummary.summary}</p>
          )}
          {executiveSummary.topPriorities?.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900">Top Priorities</h3>
              <ol className="mt-3 space-y-3">
                {executiveSummary.topPriorities.map((item) => (
                  <li key={item.priority} className="rounded-lg border border-white/80 bg-white/70 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                        {item.priority}
                      </span>
                      <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        {item.category}
                      </span>
                    </div>
                    {item.impact && <p className="mt-2 text-sm text-gray-600">{item.impact}</p>}
                    {item.action && (
                      <p className="mt-1 text-sm text-gray-600">
                        <span className="font-medium text-gray-800">Action: </span>
                        {item.action}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </Card>
      )}

      {/* Quick Summary (legacy fallback) */}
      {!executiveSummary && professionalReport.quickSummary && (
        <Card className="mt-6 border-brand-100 bg-gradient-to-r from-brand-50 to-white">
          <h2 className="text-lg font-semibold text-gray-900">Quick Summary</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-700">{professionalReport.quickSummary}</p>
        </Card>
      )}

      {/* Score Dashboard */}
      {professionalReport.scores && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Scores</h2>
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-4">
            <ScoreRing label="Overall" value={professionalReport.scores.overall} />
            <ScoreRing label="GMC" value={professionalReport.scores.gmc} />
            <ScoreRing label="Ads" value={professionalReport.scores.ads} />
            <ScoreRing label="Technical" value={professionalReport.scores.technical} />
          </div>
        </Card>
      )}

      {coverageEntries.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Audit Coverage</h2>
          <p className="mt-1 text-sm text-gray-500">Module readiness across your store audit areas.</p>
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            {coverageEntries.map((module) => (
              <div
                key={module.id}
                className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{module.label}</span>
                  <span className="text-2xl font-bold text-gray-900">{module.score}</span>
                </div>
                <span
                  className={`mt-3 inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getCoverageLabelStyle(module.statusLabel)}`}
                >
                  {module.statusLabel}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {improvementRoadmap && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Improvement Roadmap</h2>
          <p className="mt-1 text-sm text-gray-500">Prioritized actions to improve store readiness.</p>

          {improvementRoadmap.immediate?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-red-700">Fix Now</h3>
              <ul className="mt-3 space-y-3">
                {improvementRoadmap.immediate.map((item, index) => (
                  <RoadmapItem key={`immediate-${index}`} item={item} />
                ))}
              </ul>
            </div>
          )}

          {improvementRoadmap.recommended?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-amber-700">Improve Later</h3>
              <ul className="mt-3 space-y-3">
                {improvementRoadmap.recommended.map((item, index) => (
                  <RoadmapItem key={`recommended-${index}`} item={item} />
                ))}
              </ul>
            </div>
          )}

          {improvementRoadmap.future?.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-blue-700">Future</h3>
              <ul className="mt-3 space-y-3">
                {improvementRoadmap.future.map((item, index) => (
                  <RoadmapItem key={`future-${index}`} item={item} />
                ))}
              </ul>
            </div>
          )}

          {!improvementRoadmap.immediate?.length &&
            !improvementRoadmap.recommended?.length &&
            !improvementRoadmap.future?.length && (
              <p className="mt-4 text-sm text-green-700">No improvement actions required for the current rule set.</p>
            )}
        </Card>
      )}

      {/* Professional Issues by Category */}
      {professionalReport.issues?.length > 0 ? (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Issues & Recommendations</h2>
          <p className="mt-1 text-sm text-gray-500">
            Prioritized findings grouped by area. Fix high-risk items first.
          </p>
          <div className="mt-6 space-y-8">
            {CATEGORY_ORDER.map((category) => {
              const categoryIssues =
                professionalReport.issuesByCategory?.[category] ||
                professionalReport.issues.filter((item) => item.category === category)
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
          <p className="text-sm font-medium text-green-800">
            All compliance checks passed for the current rule set.
          </p>
        </Card>
      )}

      {/* GMC Compliance */}
      {gmc && (
        <Card className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">GMC Compliance</h2>
              <p className="mt-1 text-sm text-gray-500">
                Google Merchant Center readiness checks.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-[6px]"
                style={{ borderColor: scoreColor(gmc?.score) }}
              >
                <span className="text-2xl font-bold text-gray-900">{gmc.score}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-gray-600">GMC Score</p>
              <p className="text-xs text-gray-400">
                {gmc.summary?.passed ?? 0}/{gmc.summary?.total ?? 0} passed
              </p>
            </div>
          </div>

          {gmc.passedRules?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">Passed Rules</h3>
              <ul className="mt-2 space-y-2">
                {gmc.passedRules.map((rule) => (
                  <li key={rule.id} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold">{rule.id}</span>
                    <span>{rule.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gmc.issues?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">Issues</h3>
              <ul className="mt-2 space-y-2">
                {gmc.issues.map((issue) => (
                  <li key={issue.id} className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                    <span className="shrink-0 rounded bg-red-200 px-1.5 py-0.5 text-xs font-bold text-red-700">{issue.id}</span>
                    <div>
                      <p className="font-medium text-red-900">{issue.name}</p>
                      <p className="text-red-700">{issue.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gmc.warnings?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">Warnings</h3>
              <ul className="mt-2 space-y-2">
                {gmc.warnings.map((warn) => (
                  <li key={warn.id} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                    <span className="shrink-0 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-bold text-amber-800">{warn.id}</span>
                    <div>
                      <p className="font-medium text-amber-900">{warn.name}</p>
                      <p className="text-amber-800">{warn.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gmc.recommendations?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">Recommendations</h3>
              <ul className="mt-2 space-y-2">
                {gmc.recommendations.map((rec) => (
                  <li key={rec.id} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="shrink-0 font-medium uppercase text-amber-600">{rec.priority}</span>
                    <span>{rec.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gmc.riskDetails?.priceConsistency?.details?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">Price Consistency Details</h3>
              <p className="mt-1 text-xs text-gray-500">
                Per-page schema vs display price comparison (G006).
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead>
                    <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                      <th className="py-2 pr-3">Product URL</th>
                      <th className="py-2 pr-3">Schema Price</th>
                      <th className="py-2 pr-3">Display Price</th>
                      <th className="py-2 pr-3">Currency</th>
                      <th className="py-2">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gmc.riskDetails.priceConsistency.details.map((item) => {
                      const resultLabel = {
                        match: 'Match',
                        price_mismatch: 'Price Mismatch',
                        currency_mismatch: 'Currency Mismatch',
                        missing_display: 'Missing Display',
                        no_schema: 'No Schema',
                        no_pricing: 'No Data',
                      }[item.result] || item.result

                      const resultClass =
                        item.result === 'match'
                          ? 'bg-green-100 text-green-700'
                          : item.result === 'missing_display'
                            ? 'bg-amber-100 text-amber-800'
                            : item.result === 'price_mismatch' || item.result === 'currency_mismatch'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-gray-100 text-gray-600'

                      return (
                        <tr key={item.url}>
                          <td className="py-2 pr-3">
                            <p className="max-w-[220px] truncate text-gray-900">{item.url}</p>
                          </td>
                          <td className="py-2 pr-3 text-gray-900">{item.schemaPrice ?? '—'}</td>
                          <td className="py-2 pr-3 text-gray-900">{item.displayPrice ?? '—'}</td>
                          <td className="py-2 pr-3 text-gray-900">
                            {item.schemaCurrency && item.displayCurrency && item.schemaCurrency !== item.displayCurrency
                              ? `${item.schemaCurrency} / ${item.displayCurrency}`
                              : item.currency ?? '—'}
                          </td>
                          <td className="py-2">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${resultClass}`}>
                              {resultLabel}
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* GMC Risk Details */}
      {gmc?.riskDetails && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">GMC Risk Details</h2>
          <p className="mt-1 text-sm text-gray-500">
            Deep quality signals for return policy, price consistency, and business trust.
          </p>

          {gmc.riskDetails.returnPolicy && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Return Policy Quality</h3>
              <p className="mt-1 text-sm text-gray-600">
                Quality score: <span className="font-medium">{gmc.riskDetails.returnPolicy.qualityScore ?? 0}/100</span>
                {' · '}
                Text length: {formatNumber(gmc.riskDetails.returnPolicy.textLength ?? 0)} chars
              </p>
              {gmc.riskDetails.returnPolicy.checks && (
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(gmc.riskDetails.returnPolicy.checks).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <dt className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd className={value ? 'font-medium text-green-700' : 'font-medium text-amber-700'}>
                        {value ? 'Yes' : 'No'}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {gmc.riskDetails.returnPolicy.risks?.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-amber-800">
                  {gmc.riskDetails.returnPolicy.risks.map((risk) => (
                    <li key={risk}>• {risk}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {gmc.riskDetails.priceConsistency && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Price Consistency Summary</h3>
              <p className="mt-1 text-sm text-gray-600">
                {gmc.riskDetails.priceConsistency.matched ?? gmc.riskDetails.priceConsistency.consistent ?? 0} matched ·{' '}
                {gmc.riskDetails.priceConsistency.priceMismatch ?? 0} price mismatch ·{' '}
                {gmc.riskDetails.priceConsistency.currencyMismatch ?? 0} currency mismatch ·{' '}
                {gmc.riskDetails.priceConsistency.missingDisplay ?? 0} missing display
              </p>
            </div>
          )}

          {gmc.riskDetails.businessInformation && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Business Information</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {gmc.riskDetails.businessInformation.email ? 'Found' : 'Missing'}
                  </dd>
                  {gmc.riskDetails.businessInformation.details?.emails?.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {gmc.riskDetails.businessInformation.details.emails[0]}
                    </p>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {gmc.riskDetails.businessInformation.phone ? 'Found' : 'Missing'}
                  </dd>
                  {gmc.riskDetails.businessInformation.details?.phones?.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {gmc.riskDetails.businessInformation.details.phones[0]}
                    </p>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {gmc.riskDetails.businessInformation.address ? 'Found' : 'Missing'}
                  </dd>
                  {gmc.riskDetails.businessInformation.details?.addresses?.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {gmc.riskDetails.businessInformation.details.addresses[0]}
                    </p>
                  )}
                </div>
              </dl>
              {gmc.riskDetails.businessInformation.missing?.length > 0 && (
                <p className="mt-3 text-sm text-amber-800">
                  Missing: {gmc.riskDetails.businessInformation.missing.join(', ')}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Product Pricing Analysis */}
      {productsAudit?.productPages?.some((page) => page.pricing) && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Product Pricing Analysis</h2>
          <p className="mt-1 text-sm text-gray-500">
            Schema vs visible price comparison from scanned product pages.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead>
                <tr className="text-left text-xs font-medium uppercase tracking-wide text-gray-500">
                  <th className="py-2 pr-4">Product Page</th>
                  <th className="py-2 pr-4">Schema Price</th>
                  <th className="py-2 pr-4">Display Price</th>
                  <th className="py-2 pr-4">Currency</th>
                  <th className="py-2">Consistency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {productsAudit.productPages
                  .filter((page) => page.pricing)
                  .slice(0, 5)
                  .map((page) => {
                    const currency =
                      page.pricing?.schema?.currency ||
                      page.pricing?.display?.currency ||
                      page.priceConsistency?.currency ||
                      '—'
                    const consistent = page.priceConsistency?.consistent
                    const consistencyLabel =
                      consistent === true ? 'Match' : consistent === false ? 'Mismatch' : 'N/A'

                    return (
                      <tr key={page.url}>
                        <td className="py-3 pr-4">
                          <p className="max-w-xs truncate font-medium text-gray-900">{page.url}</p>
                          {page.pricing?.display?.source && (
                            <p className="mt-0.5 text-xs text-gray-400">via {page.pricing.display.source}</p>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-900">
                          {page.pricing?.schema?.price ?? '—'}
                          {page.pricing?.schema?.source && (
                            <span className="block text-xs text-gray-400">{page.pricing.schema.source}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-900">
                          {page.pricing?.display?.price ?? '—'}
                          {page.pricing?.display?.type && (
                            <span className="block text-xs text-gray-400">{page.pricing.display.type}</span>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-gray-900">{currency}</td>
                        <td className="py-3">
                          <span
                            className={[
                              'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
                              consistent === true
                                ? 'bg-green-100 text-green-700'
                                : consistent === false
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-gray-100 text-gray-500',
                            ].join(' ')}
                          >
                            {consistencyLabel}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Ads Compliance */}
      {adsRules.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Ads Compliance</h2>
          <p className="mt-1 text-sm text-gray-500">
            Google Merchant Center and Meta Ads tracking checks.
          </p>
          <ul className="mt-4 divide-y divide-gray-100">
            {adsRules.map((rule) => (
              <li key={rule.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-bold text-brand-700">
                      {rule.id}
                    </span>
                    <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{rule.message}</p>
                  {!rule.passed && rule.recommendation && (
                    <p className="mt-1 text-xs text-gray-500">{rule.recommendation}</p>
                  )}
                </div>
                <StatusBadge found={rule.passed} />
              </li>
            ))}
          </ul>

          {productsAudit && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Product Page Analysis</h3>
              <p className="mt-1 text-xs text-gray-500">
                Candidate pages scored by URL patterns and shopping signals, then top pages scanned.
              </p>
              <dl className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <dt className="text-xs text-gray-500">Candidates</dt>
                  <dd className="text-lg font-semibold text-gray-900">{productsAudit.candidateCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Scanned</dt>
                  <dd className="text-lg font-semibold text-gray-900">{productsAudit.scannedPages ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Product Schema</dt>
                  <dd className="text-lg font-semibold text-gray-900">{productsAudit.summary?.withSchema ?? productsAudit.detectedProducts ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Price Detected</dt>
                  <dd className="text-lg font-semibold text-gray-900">{productsAudit.summary?.withPrice ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Add to Cart</dt>
                  <dd className="text-lg font-semibold text-gray-900">{productsAudit.summary?.withAddToCart ?? 0}</dd>
                </div>
              </dl>
              {productsAudit.missingFields?.length > 0 && (
                <p className="mt-3 text-sm text-amber-700">
                  Missing required fields: {productsAudit.missingFields.join(', ')}
                </p>
              )}
              {productsAudit.productPages?.length > 0 && (
                <ul className="mt-3 space-y-2 text-xs text-gray-500">
                  {productsAudit.productPages.slice(0, 5).map((page) => (
                    <li key={page.url}>
                      <div className="truncate">
                        {page.valid ? '✓' : page.hasProductSchema ? '!' : '✗'} score {page.score ?? '—'} — {page.url}
                      </div>
                      {page.signals && (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {page.signals.schema && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">schema</span>}
                          {page.signals.price && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">price</span>}
                          {page.signals.addToCart && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">addToCart</span>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Platform */}
      <Card className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Platform Detection</h2>
        <div className="mt-4">
          <PlatformBadge platform={platform} />
        </div>
      </Card>

      {/* Key Pages */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Key Pages</h2>
        <p className="mt-1 text-sm text-gray-500">
          Policy and informational pages identified from links and page content.
        </p>
        <ul className="mt-4 divide-y divide-gray-100">
          {Object.entries(PAGE_LABELS).map(([key, label]) => {
            const page = pages?.[key]
            return (
              <li key={key} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  {page?.url && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">{page.url}</p>
                  )}
                </div>
                <StatusBadge found={page?.found} />
              </li>
            )
          })}
        </ul>
      </Card>

      {/* Contact Info */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
        <p className="mt-1 text-sm text-gray-500">
          Detected from homepage and key pages.
        </p>
        <dl className="mt-4 space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {contactInfo?.emails?.length > 0
                ? contactInfo.emails.join(', ')
                : '(not found)'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Phone</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {contactInfo?.phones?.length > 0
                ? contactInfo.phones.join(', ')
                : '(not found)'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Address</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {contactInfo?.addresses?.length > 0
                ? contactInfo.addresses.join('; ')
                : '(not found)'}
            </dd>
          </div>
        </dl>
      </Card>

      {import.meta.env.DEV && detectionSources && (
        <Card className="mt-6 border-dashed border-brand-200 bg-brand-50/40">
          <h2 className="text-lg font-semibold text-gray-900">Detection Sources</h2>
          <p className="mt-1 text-xs text-gray-500">Development debug view — data extraction provenance.</p>

          <div className="mt-4 space-y-4 text-sm">
            <div>
              <h3 className="font-medium text-gray-900">Phone</h3>
              <ul className="mt-1 space-y-1 text-gray-700">
                {(detectionSources.contact?.phone || []).length > 0 ? (
                  detectionSources.contact.phone.map((item) => (
                    <li key={`${item.source}-${item.value}`}>
                      ✓ {item.source} {item.page ? `(${item.page})` : ''} — {item.value}
                    </li>
                  ))
                ) : (
                  <li className="text-gray-400">No phone sources detected</li>
                )}
              </ul>
            </div>

            <div>
              <h3 className="font-medium text-gray-900">Email</h3>
              <ul className="mt-1 space-y-1 text-gray-700">
                {(detectionSources.contact?.email || []).slice(0, 5).map((item) => (
                  <li key={`${item.source}-${item.value}`}>
                    ✓ {item.source} {item.page ? `(${item.page})` : ''} — {item.value}
                  </li>
                ))}
              </ul>
            </div>

            {['privacyPolicy', 'refundPolicy', 'shippingPolicy'].map((policyType) => (
              <div key={policyType}>
                <h3 className="font-medium text-gray-900">
                  {policyType.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}
                </h3>
                <ul className="mt-1 space-y-1 text-gray-700">
                  {(detectionSources.policies?.[policyType] || []).length > 0 ? (
                    detectionSources.policies[policyType].map((item) => (
                      <li key={item.url} className="truncate">
                        ✓ {item.source} — {item.url}
                      </li>
                    ))
                  ) : (
                    <li className="text-gray-400">Not detected</li>
                  )}
                </ul>
              </div>
            ))}

            <div>
              <h3 className="font-medium text-gray-900">Product</h3>
              <ul className="mt-1 space-y-1 text-gray-700">
                {(detectionSources.products?.signals || []).map((signal) => (
                  <li key={signal}>✓ {signal}</li>
                ))}
                <li>
                  Scanned {detectionSources.products?.scanned ?? 0} /{' '}
                  {detectionSources.products?.candidates ?? 0} candidates
                </li>
              </ul>
            </div>
          </div>
        </Card>
      )}

      {/* Page Content */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Page Content Analysis</h2>
        <p className="mt-1 text-sm text-gray-500">
          Content extracted from discovered key pages.
        </p>
        <ul className="mt-4 divide-y divide-gray-100">
          {Object.entries(PAGE_LABELS).map(([key, label]) => {
            const content = pageContent?.[key]
            if (!content) return null
            return (
              <li key={key} className="py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <StatusBadge found={content.fetched} />
                </div>
                {content.fetched ? (
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex gap-2">
                      <dt className="text-gray-500 shrink-0">Title:</dt>
                      <dd className="text-gray-900 truncate">{content.title || '(empty)'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-gray-500 shrink-0">H1:</dt>
                      <dd className="text-gray-900 truncate">{content.h1 || '(empty)'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-gray-500 shrink-0">Text length:</dt>
                      <dd className="text-gray-900">{formatNumber(content.textLength)} chars</dd>
                    </div>
                    {content.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {content.keywords.slice(0, 6).map(({ word, count }) => (
                          <span
                            key={word}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {word} ({count})
                          </span>
                        ))}
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">
                    {content.error || 'Page not found or could not be fetched'}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      {/* SEO */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">SEO Basics</h2>
        <dl className="mt-4 divide-y divide-gray-100">
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-gray-500">robots.txt</dt>
            <dd className="flex items-center gap-2">
              <StatusBadge found={seo?.robotsTxt?.exists} />
              {seo?.robotsTxt?.statusCode && (
                <span className="text-xs text-gray-400">HTTP {seo.robotsTxt.statusCode}</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-gray-500">sitemap.xml</dt>
            <dd className="flex items-center gap-2">
              <StatusBadge found={seo?.sitemap?.exists} />
              {seo?.sitemap?.statusCode && (
                <span className="text-xs text-gray-400">HTTP {seo.sitemap.statusCode}</span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Meta */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Meta Information</h2>
        <dl className="mt-4 divide-y divide-gray-100">
          {[
            { label: 'Title', value: meta?.title || crawlResult.title },
            { label: 'Description', value: meta?.description || crawlResult.description },
            { label: 'OG Title', value: meta?.ogTitle },
            { label: 'OG Description', value: meta?.ogDescription },
            { label: 'OG Image', value: meta?.ogImage },
            { label: 'Canonical', value: meta?.canonical },
            { label: 'Viewport', value: meta?.viewport },
            { label: 'Robots Meta', value: meta?.robots },
            { label: 'Generator', value: meta?.generator },
          ].map(({ label, value }) => (
            <div key={label} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 break-all text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {value || '(not found)'}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Links summary */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Link Discovery</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-gray-500">Total Links</dt>
            <dd className="text-2xl font-semibold text-gray-900">{formatNumber(links?.total ?? crawlResult.linksCount)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Internal</dt>
            <dd className="text-2xl font-semibold text-gray-900">{formatNumber(links?.internal)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">External</dt>
            <dd className="text-2xl font-semibold text-gray-900">{formatNumber(links?.external)}</dd>
          </div>
        </dl>
        {links?.discovered?.length > 0 && (
          <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-xs text-gray-500">
            {links.discovered.map((link) => (
              <li key={link.url} className="truncate">
                {link.text ? `${link.text} → ` : ''}{link.path}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to="/">
          <Button variant="primary" size="lg">
            Scan Another Store
          </Button>
        </Link>
      </div>
    </div>
  )
}
