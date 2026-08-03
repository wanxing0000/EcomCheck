import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'
import GmcConversionCta, { FIX_GUIDE_SECTION_ID } from '../components/GmcConversionCta'
import ReportSaveCta from '../components/ReportSaveCta'
import { trackViewReport } from '../lib/analytics.js'
import {
  buildComplianceRiskAreas,
  getAuditMode,
  getAuditProduct,
  getComplianceScoreEntries,
  getPrimaryScoreRings,
  getReportSubtitle,
  getReportTitle,
  getReportProductLabel,
  isFullAudit,
  isGmcAuditProduct,
  isModuleExecuted,
  isSeoAuditProduct,
  showTrustPolicySection,
} from '../utils/auditDisplay.js'
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

function isCoverageModuleEntry(value) {
  return value != null && typeof value === 'object' && value.score != null
}

function mapCoverageEntries(entries) {
  return entries.map(([id, item]) => ({
    id,
    label: MODULE_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1),
    score: item.score,
    statusLabel: item.label,
  }))
}

function flattenCoverageGroup(group) {
  if (!group || typeof group !== 'object') return []
  return mapCoverageEntries(Object.entries(group).filter(([, item]) => isCoverageModuleEntry(item)))
}

function getCoverageEntries(professionalReport) {
  const coverage = professionalReport.coverage

  if (coverage?.compliance || coverage?.seo) {
    return [...flattenCoverageGroup(coverage.compliance), ...flattenCoverageGroup(coverage.seo)]
  }

  if (coverage) {
    const flatEntries = flattenCoverageGroup(coverage)
    if (flatEntries.length > 0) return flatEntries
  }

  const scores = professionalReport.scores || {}
  return Object.entries(scores)
    .filter(([id, value]) => id !== 'overall' && id !== 'compliance' && value != null)
    .map(([id, value]) => ({
      id,
      label: MODULE_LABELS[id] || id.charAt(0).toUpperCase() + id.slice(1),
      score: value,
      statusLabel: value >= 90 ? 'Excellent' : value >= 70 ? 'Good' : value >= 50 ? 'Needs Improvement' : 'Critical',
    }))
}

function getCategoryIssues(professionalReport, category) {
  if (professionalReport.issuesByCategory?.[category]?.length) {
    return professionalReport.issuesByCategory[category]
  }
  return professionalReport.issues?.filter((item) => item.category === category) ?? []
}

function getTrustPolicyIssues(professionalReport) {
  return [...getCategoryIssues(professionalReport, 'trust'), ...getCategoryIssues(professionalReport, 'policy')]
}

function ModuleScoreRing({ score, label, summary }) {
  if (score == null) return null

  return (
    <div className="flex flex-col items-center">
      <div
        className="flex h-20 w-20 items-center justify-center rounded-full border-[6px]"
        style={{ borderColor: scoreColor(score) }}
      >
        <span className="text-2xl font-bold text-gray-900">{score}</span>
      </div>
      <p className="mt-1 text-xs font-medium text-gray-600">{label}</p>
      {summary && (
        <p className="text-xs text-gray-400">
          {summary.passed ?? 0}/{summary.total ?? 0} passed
        </p>
      )}
    </div>
  )
}

function RuleResultsList({ rules }) {
  if (!rules?.length) return null

  return (
    <ul className="mt-4 divide-y divide-gray-100">
      {rules.map((rule) => (
        <li key={rule.id} className="flex items-start justify-between gap-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-bold text-brand-700">{rule.id}</span>
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
  )
}

function ModuleIssuesList({ issues }) {
  if (!issues?.length) return null

  return (
    <div className="mt-4 border-t border-gray-100 pt-4">
      <h3 className="text-sm font-semibold text-gray-900">Issues</h3>
      <ul className="mt-3 space-y-3">
        {issues.map((issue) => (
          <IssueCard key={`${issue.id}-${issue.severity}`} issue={issue} />
        ))}
      </ul>
    </div>
  )
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

function getSeoHealthLabelStyle(label) {
  switch (label) {
    case 'Excellent':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'Good':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'Needs Improvement':
      return 'bg-amber-100 text-amber-900 border-amber-200'
    case 'Poor':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function getGmcReadinessLabelStyle(label) {
  switch (label) {
    case 'Ready':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'Nearly Ready':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'Needs Work':
      return 'bg-amber-100 text-amber-900 border-amber-200'
    case 'Not Ready':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function GmcRiskAreaPill({ area }) {
  const styles = {
    pass: 'bg-green-50 text-green-700 border-green-200',
    warning: 'bg-amber-50 text-amber-800 border-amber-200',
    critical: 'bg-red-50 text-red-700 border-red-200',
  }

  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${styles[area.status] || styles.warning}`}
    >
      {area.label}
      {area.failedRules?.length > 0 && (
        <span className="ml-1.5 opacity-75">({area.failedRules.join(', ')})</span>
      )}
    </span>
  )
}


function GmcFixRecommendationList({ recommendations }) {
  if (!recommendations?.length) return null

  return (
    <ol className="mt-3 space-y-3">
      {recommendations.map((rec) => (
        <li
          key={`${rec.ruleId}-${rec.priority}`}
          className="rounded-lg border border-brand-100 bg-brand-50/40 px-4 py-3"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {rec.priority}
            </span>
            <span className="rounded bg-white px-1.5 py-0.5 text-xs font-bold text-brand-700">{rec.ruleId}</span>
            <h4 className="text-sm font-semibold text-gray-900">{rec.title}</h4>
          </div>
          {rec.action && <p className="mt-2 text-sm text-gray-700">{rec.action}</p>}
          {rec.impact && (
            <p className="mt-1 text-sm text-gray-600">
              <span className="font-medium text-gray-800">Impact: </span>
              {rec.impact}
            </p>
          )}
        </li>
      ))}
    </ol>
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

  useEffect(() => {
    if (!crawlResult) return
    trackViewReport({
      reportId: crawlResult.reportId || null,
      auditMode: getAuditMode(crawlResult),
      source: 'session',
    })
  }, [crawlResult])

  if (!url || !crawlResult) return null

  const { platform, pages, seo, meta, links, pageContent, contactInfo, score, issues, recommendations, rules, productsAudit, gmc, modules, detectionSources, report } = crawlResult

  const adsRules = rules?.filter((r) => r.category === 'ads') ?? []
  const seoRules = rules?.filter((r) => r.category === 'seo') ?? []
  const technicalRules = rules?.filter((r) => r.category === 'technical') ?? []
  const trustPolicyRules = rules?.filter((r) => r.category === 'trust' || r.category === 'policy') ?? []
  const seoModule = modules?.seo
  const technicalModule = modules?.technical
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
  const gmcIssues = getCategoryIssues(professionalReport, 'gmc')
  const gmcReadiness = professionalReport.gmcReadiness
  const gmcCriticalIssues =
    gmcReadiness?.criticalIssues ??
    gmcIssues.filter((issue) => issue.severity === 'high' || issue.severity === 'medium')
  const gmcWarningIssues =
    gmcReadiness?.warnings ??
    gmcIssues.filter((issue) => issue.severity === 'warning' || issue.severity === 'low')
  const gmcFixRecommendations =
    gmcReadiness?.fixRecommendations ??
    (gmc?.recommendations || []).map((rec, index) => ({
      priority: index + 1,
      ruleId: rec.id || `GMC-${index + 1}`,
      title: rec.name || rec.id || 'Recommendation',
      action: rec.text,
      impact: '',
      severity: rec.priority === 'high' ? 'high' : 'medium',
    }))
  const seoIssues = getCategoryIssues(professionalReport, 'seo')
  const seoHealth = professionalReport.seoHealth
  const seoCriticalIssues =
    seoHealth?.criticalIssues ??
    seoIssues.filter((issue) => issue.severity === 'high' || issue.severity === 'medium')
  const seoWarningIssues =
    seoHealth?.warnings ??
    seoIssues.filter((issue) => issue.severity === 'warning' || issue.severity === 'low')
  const seoFixRecommendations =
    seoHealth?.fixRecommendations ??
    seoIssues
      .filter((issue) => issue.fixSuggestion || issue.impact)
      .map((issue, index) => ({
        priority: index + 1,
        ruleId: issue.id,
        title: issue.title || issue.name,
        action: issue.fixSuggestion || issue.message,
        impact: issue.impact || '',
        severity: issue.severity,
      }))
  const adsIssues = getCategoryIssues(professionalReport, 'ads')
  const technicalIssues = getCategoryIssues(professionalReport, 'technical')
  const trustPolicyIssues = getTrustPolicyIssues(professionalReport)

  const overallScore = professionalReport.scores?.overall ?? score
  const executiveSummary = professionalReport.executiveSummary
  const complianceScore =
    executiveSummary?.complianceScore ?? professionalReport.scores?.compliance ?? overallScore
  const seoScore = executiveSummary?.seoScore ?? professionalReport.scores?.seo ?? seoModule?.score
  const complianceIssueCount =
    professionalReport.issueCounts?.complianceTotal ??
    professionalReport.issues?.filter((item) => item.category !== 'seo').length ??
    issues?.length ??
    0
  const seoIssueCount = professionalReport.issueCounts?.seoTotal ?? seoIssues.length
  const coverageEntries = getCoverageEntries(professionalReport)
  const improvementRoadmap = professionalReport.improvementRoadmap

  const auditProduct = getAuditProduct(crawlResult)
  const auditMode = getAuditMode(crawlResult)
  const reportTitle = getReportTitle(crawlResult)
  const reportProductLabel = getReportProductLabel(crawlResult)
  const reportSubtitle = getReportSubtitle(crawlResult)
  const fullAudit = isFullAudit(crawlResult)
  const gmcAuditProduct = isGmcAuditProduct(crawlResult)
  const seoAuditProduct = isSeoAuditProduct(crawlResult)
  const showGmc = gmcAuditProduct && isModuleExecuted(crawlResult, 'gmc') && gmc
  const showSeo = seoAuditProduct && isModuleExecuted(crawlResult, 'seo')
  const showAds = gmcAuditProduct && isModuleExecuted(crawlResult, 'ads')
  const showTechnical = gmcAuditProduct && isModuleExecuted(crawlResult, 'technical')
  const showTrustPolicy = gmcAuditProduct && showTrustPolicySection(crawlResult)
  const complianceRiskAreas = buildComplianceRiskAreas(professionalReport.scores, {
    ads: adsIssues,
    technical: technicalIssues,
    trust: getCategoryIssues(professionalReport, 'trust'),
    policy: getCategoryIssues(professionalReport, 'policy'),
  })
  const auditUsage = crawlResult.usage
  const complianceScoreEntries = getComplianceScoreEntries(professionalReport.scores)
  const primaryScoreRings = getPrimaryScoreRings(crawlResult, professionalReport.scores, {
    complianceTotal: complianceIssueCount,
    seoTotal: seoIssueCount,
    total: professionalReport.issueCounts?.total,
  })

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
      <ReportSaveCta
        reportId={crawlResult.reportId}
        url={url}
        crawlResult={crawlResult}
        placement="top"
      />

      <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600">{reportProductLabel}</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            {reportTitle}
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">{reportSubtitle}</p>
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

        {primaryScoreRings.length > 0 && (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-8">
            {primaryScoreRings.map((ring) => (
              <div key={ring.label} className="flex flex-col items-center">
                <ScoreRing label={ring.label} value={ring.value} size={ring.size} />
                {ring.subtext && <p className="mt-2 text-xs text-gray-400">{ring.subtext}</p>}
              </div>
            ))}
            {fullAudit && overallScore != null && overallScore !== complianceScore && complianceScore != null && (
              <p className="text-xs text-gray-400">Overall (incl. SEO): {overallScore}</p>
            )}
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
          {showSeo && executiveSummary.seoSummary && (
            <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold text-gray-900">SEO Overview</h3>
                {executiveSummary.seoScore != null && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                    {executiveSummary.seoScore}/100
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-gray-700">{executiveSummary.seoSummary}</p>
              {executiveSummary.seoPriorities?.length > 0 && (
                <ol className="mt-3 space-y-2">
                  {executiveSummary.seoPriorities.map((item) => (
                    <li key={item.priority} className="rounded-lg border border-blue-100 bg-white/80 px-3 py-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                          {item.priority}
                        </span>
                        <span className="text-sm font-medium text-gray-900">{item.title}</span>
                      </div>
                      {item.action && <p className="mt-1 text-xs text-gray-600">{item.action}</p>}
                    </li>
                  ))}
                </ol>
              )}
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
      {(fullAudit || auditMode === 'gmc') && complianceScoreEntries.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Scores</h2>
          <p className="mt-1 text-sm text-gray-500">Compliance areas only — SEO is tracked separately.</p>
          <div className="mt-4 grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {complianceScoreEntries.map((entry) => (
              <ScoreRing key={entry.label} label={entry.label} value={entry.value} />
            ))}
          </div>
        </Card>
      )}

      {fullAudit && seoScore != null && (
        <Card className="mt-6 border-blue-100 bg-gradient-to-r from-blue-50/80 to-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">SEO Health Score</h2>
              <p className="mt-1 text-sm text-gray-500">On-page SEO audit, separate from compliance scoring.</p>
            </div>
            <ScoreRing label="SEO Health" value={seoScore} />
          </div>
        </Card>
      )}

      {coverageEntries.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Audit Coverage</h2>
          <p className="mt-1 text-sm text-gray-500">Audit areas included in this report.</p>
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

      {(fullAudit || auditMode === 'gmc') && improvementRoadmap && (
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

      {/* Professional Issues by Category — compliance-only fallback when no module sections render */}
      {complianceIssueCount === 0 &&
        seoIssueCount === 0 &&
        !showGmc &&
        !showAds &&
        !showTechnical &&
        !showTrustPolicy &&
        !showSeo && (
        <Card className="mt-6 border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-800">
            All compliance checks passed for the current rule set.
          </p>
        </Card>
      )}

      {/* GMC Readiness */}
      {showGmc && (
        <Card className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Google Merchant Center Readiness</h2>
              <p className="mt-1 text-sm text-gray-500">
                Product readiness report for Google Shopping approval.
              </p>
              {gmcReadiness?.readinessLabel && (
                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getGmcReadinessLabelStyle(gmcReadiness.readinessLabel)}`}
                >
                  {gmcReadiness.readinessLabel}
                </span>
              )}
            </div>
            <ModuleScoreRing
              score={gmcReadiness?.readinessScore ?? gmc?.score ?? professionalReport.scores?.gmc}
              label="Readiness Score"
              summary={gmc?.summary}
            />
          </div>

          {gmcReadiness?.riskSummary && (
            <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">GMC Risk Summary</h3>
              <p className="mt-2 text-sm font-medium text-gray-900">{gmcReadiness.riskSummary.headline}</p>
              <p className="mt-1 text-sm text-gray-600">{gmcReadiness.riskSummary.summary}</p>
              {gmcReadiness.riskSummary.riskAreas?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {gmcReadiness.riskSummary.riskAreas.map((area) => (
                    <GmcRiskAreaPill key={area.id} area={area} />
                  ))}
                </div>
              )}
            </div>
          )}

          {gmcCriticalIssues.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900">
                Critical Issues
                <span className="ml-2 font-normal text-gray-500">({gmcCriticalIssues.length})</span>
              </h3>
              <ul className="mt-3 space-y-3">
                {gmcCriticalIssues.map((issue) => (
                  <IssueCard key={`${issue.id}-${issue.severity}-critical`} issue={issue} />
                ))}
              </ul>
            </div>
          )}

          {gmcWarningIssues.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900">
                Warnings
                <span className="ml-2 font-normal text-gray-500">({gmcWarningIssues.length})</span>
              </h3>
              <ul className="mt-3 space-y-3">
                {gmcWarningIssues.map((issue) => (
                  <IssueCard key={`${issue.id}-${issue.severity}-warning`} issue={issue} />
                ))}
              </ul>
            </div>
          )}

          {gmcFixRecommendations.length > 0 && (
            <div id={FIX_GUIDE_SECTION_ID} className="mt-5 border-t border-gray-100 pt-5 scroll-mt-24">
              <h3 className="text-sm font-semibold text-gray-900">Fix Recommendations</h3>
              <p className="mt-1 text-xs text-gray-500">
                Prioritized by Google Shopping disapproval risk.
              </p>
              <GmcFixRecommendationList recommendations={gmcFixRecommendations} />
            </div>
          )}

          {auditMode === 'gmc' && (
            <GmcConversionCta
              gmcReadiness={gmcReadiness}
              gmcFixRecommendations={gmcFixRecommendations}
              usage={auditUsage}
            />
          )}

          {gmcCriticalIssues.length === 0 && gmcWarningIssues.length === 0 && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-medium text-green-800">
                No open GMC blockers detected in the current rule set.
              </p>
            </div>
          )}

          {gmc.passedRules?.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-5">
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

      {/* Compliance Risk Summary — GMC Audit bundle */}
      {gmcAuditProduct && (showAds || showTechnical || showTrustPolicy) && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Risk Summary</h2>
          <p className="mt-1 text-sm text-gray-500">
            Ads, technical, and trust & policy signals bundled with your Merchant Center audit.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {complianceRiskAreas.map((area) => (
              <GmcRiskAreaPill key={area.id} area={area} />
            ))}
          </div>
          <dl className="mt-4 grid gap-3 sm:grid-cols-3">
            {complianceRiskAreas.map((area) => (
              <div key={`${area.id}-score`} className="rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
                <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">{area.label}</dt>
                <dd className="mt-1 flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-gray-900">{area.score ?? '—'}</span>
                  {area.score != null && <span className="text-xs text-gray-400">/100</span>}
                </dd>
                {area.failedRules?.length > 0 && (
                  <p className="mt-1 text-xs text-amber-700">{area.failedRules.join(', ')}</p>
                )}
              </div>
            ))}
          </dl>
        </Card>
      )}

      {/* GMC Risk Details */}
      {showGmc && gmc?.riskDetails && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">GMC Risk Details</h2>
          <p className="mt-1 text-sm text-gray-500">
            Deep quality signals for return policy, shipping, payment, purchase flow, and business trust.
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

          {gmc.riskDetails.purchaseFlow && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Purchase Flow</h3>
              <p className="mt-1 text-sm text-gray-600">
                Scanned {gmc.riskDetails.purchaseFlow.scannedPages ?? 0} page(s) · Add to Cart on{' '}
                {gmc.riskDetails.purchaseFlow.withAddToCart ?? 0} · Buy Now on{' '}
                {gmc.riskDetails.purchaseFlow.withBuyNow ?? 0}
              </p>
              {gmc.riskDetails.purchaseFlow.pages?.length > 0 && (
                <ul className="mt-2 space-y-1 text-xs text-gray-500">
                  {gmc.riskDetails.purchaseFlow.pages.map((page) => (
                    <li key={page.url} className="truncate">
                      {page.addToCart || page.buyNow ? '✓' : '✗'} {page.url}
                      {page.addToCart && ' · cart'}
                      {page.buyNow && ' · buy'}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {gmc.riskDetails.paymentPolicy && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Payment Policy Quality</h3>
              <p className="mt-1 text-sm text-gray-600">
                Quality score:{' '}
                <span className="font-medium">{gmc.riskDetails.paymentPolicy.qualityScore ?? 0}/100</span>
                {gmc.riskDetails.paymentPolicy.pageSource && (
                  <span className="text-gray-500"> · source: {gmc.riskDetails.paymentPolicy.pageSource}</span>
                )}
              </p>
              {gmc.riskDetails.paymentPolicy.checks && (
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(gmc.riskDetails.paymentPolicy.checks).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <dt className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd className={value ? 'font-medium text-green-700' : 'font-medium text-amber-700'}>
                        {value ? 'Yes' : 'No'}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}

          {gmc.riskDetails.shippingPolicy && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Shipping Policy Quality</h3>
              <p className="mt-1 text-sm text-gray-600">
                Quality score:{' '}
                <span className="font-medium">{gmc.riskDetails.shippingPolicy.qualityScore ?? 0}/100</span>
                {' · '}
                Text length: {formatNumber(gmc.riskDetails.shippingPolicy.textLength ?? 0)} chars
              </p>
              {gmc.riskDetails.shippingPolicy.checks && (
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(gmc.riskDetails.shippingPolicy.checks).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <dt className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd className={value ? 'font-medium text-green-700' : 'font-medium text-amber-700'}>
                        {value ? 'Yes' : 'No'}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Product Pricing Analysis */}
      {(showGmc || showAds) && productsAudit?.productPages?.some((page) => page.pricing) && (
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

      {/* SEO Health */}
      {showSeo && (seoModule || seoRules.length > 0 || seo?.homepage || seoIssues.length > 0) && (
        <Card className="mt-6 border-blue-100">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">SEO Health</h2>
              <p className="mt-1 text-sm text-gray-500">
                Organic search readiness from homepage on-page and technical signals.
              </p>
              {seoHealth?.seoLabel && (
                <span
                  className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${getSeoHealthLabelStyle(seoHealth.seoLabel)}`}
                >
                  {seoHealth.seoLabel}
                </span>
              )}
            </div>
            <ModuleScoreRing
              score={seoHealth?.seoScore ?? seoScore}
              label="SEO Health Score"
              summary={seoModule?.summary}
            />
          </div>

          {seoHealth?.riskSummary && (
            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
              <h3 className="text-sm font-semibold text-gray-900">SEO Risk Summary</h3>
              <p className="mt-2 text-sm font-medium text-gray-900">{seoHealth.riskSummary.headline}</p>
              <p className="mt-1 text-sm text-gray-600">{seoHealth.riskSummary.summary}</p>
              {seoHealth.riskSummary.riskAreas?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {seoHealth.riskSummary.riskAreas.map((area) => (
                    <GmcRiskAreaPill key={area.id} area={area} />
                  ))}
                </div>
              )}
            </div>
          )}

          {seoCriticalIssues.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900">
                Critical Issues
                <span className="ml-2 font-normal text-gray-500">({seoCriticalIssues.length})</span>
              </h3>
              <ul className="mt-3 space-y-3">
                {seoCriticalIssues.map((issue) => (
                  <IssueCard key={`${issue.id}-${issue.severity}-seo-critical`} issue={issue} />
                ))}
              </ul>
            </div>
          )}

          {seoWarningIssues.length > 0 && (
            <div className="mt-5">
              <h3 className="text-sm font-semibold text-gray-900">
                Warnings
                <span className="ml-2 font-normal text-gray-500">({seoWarningIssues.length})</span>
              </h3>
              <ul className="mt-3 space-y-3">
                {seoWarningIssues.map((issue) => (
                  <IssueCard key={`${issue.id}-${issue.severity}-seo-warning`} issue={issue} />
                ))}
              </ul>
            </div>
          )}

          {seoFixRecommendations.length > 0 && (
            <div className="mt-5 border-t border-gray-100 pt-5">
              <h3 className="text-sm font-semibold text-gray-900">Fix Recommendations</h3>
              <p className="mt-1 text-xs text-gray-500">Prioritized by SEO impact on organic visibility.</p>
              <GmcFixRecommendationList recommendations={seoFixRecommendations} />
            </div>
          )}

          {seoCriticalIssues.length === 0 && seoWarningIssues.length === 0 && (
            <div className="mt-5 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
              <p className="text-sm font-medium text-green-800">
                No open SEO blockers detected in the current rule set.
              </p>
            </div>
          )}

          <div className="mt-5 border-t border-gray-100 pt-5">
            <h3 className="text-sm font-semibold text-gray-900">Homepage Signals</h3>
            <p className="mt-1 text-xs text-gray-500">Raw on-page SEO signals from the scanned homepage.</p>
          <dl className="mt-4 divide-y divide-gray-100">
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-sm font-medium text-gray-700">Title</dt>
              <dd className="min-w-0 flex-1 text-right text-sm text-gray-900">
                <p className="truncate">{meta?.title || crawlResult.title || '(not found)'}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {seo?.homepage?.titleLength ?? meta?.title?.length ?? 0} chars
                </p>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 py-3">
              <dt className="text-sm font-medium text-gray-700">Description</dt>
              <dd className="min-w-0 flex-1 text-right text-sm text-gray-900">
                <p className="line-clamp-2">{meta?.description || crawlResult.description || '(not found)'}</p>
                <p className="mt-0.5 text-xs text-gray-400">
                  {seo?.homepage?.descriptionLength ?? meta?.description?.length ?? 0} chars
                </p>
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm font-medium text-gray-700">H1</dt>
              <dd className="text-sm text-gray-900">
                {seo?.homepage?.h1Count ?? 0} heading{(seo?.homepage?.h1Count ?? 0) !== 1 ? 's' : ''}
                {seo?.homepage?.h1Texts?.[0] && (
                  <span className="block max-w-xs truncate text-xs text-gray-400">
                    {seo.homepage.h1Texts[0]}
                  </span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm font-medium text-gray-700">Schema</dt>
              <dd className="text-right text-sm text-gray-900">
                <div className="flex flex-wrap justify-end gap-2">
                  <StatusBadge found={seo?.structuredData?.organization?.found} />
                  <StatusBadge found={seo?.structuredData?.product?.found} />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Org · Product
                  {seo?.structuredData?.product?.count
                    ? ` (${seo.structuredData.product.count})`
                    : ''}
                </p>
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm font-medium text-gray-700">Robots</dt>
              <dd className="flex items-center gap-2">
                <StatusBadge found={seo?.robotsTxt?.exists} />
                {seo?.robotsTxt?.blocksAll && (
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                    Blocks all
                  </span>
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between py-3">
              <dt className="text-sm font-medium text-gray-700">Sitemap</dt>
              <dd className="flex items-center gap-2">
                <StatusBadge found={seo?.sitemap?.exists} />
                {seo?.sitemap?.statusCode && (
                  <span className="text-xs text-gray-400">HTTP {seo.sitemap.statusCode}</span>
                )}
              </dd>
            </div>
          </dl>
          </div>

          {seoRules.length > 0 && !seoModule && !seoHealth && <RuleResultsList rules={seoRules} />}
        </Card>
      )}

      {/* Ads Audit */}
      {showAds && (adsRules.length > 0 || adsIssues.length > 0 || modules?.ads) && (
        <Card className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Ads Audit</h2>
              <p className="mt-1 text-sm text-gray-500">
                Google Merchant Center and Meta Ads tracking checks.
              </p>
            </div>
            <ModuleScoreRing
              score={professionalReport.scores?.ads ?? modules?.ads?.score}
              label="Ads Score"
              summary={modules?.ads?.summary}
            />
          </div>
          <RuleResultsList rules={adsRules} />
          <ModuleIssuesList issues={adsIssues} />

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

      {/* Technical Audit */}
      {showTechnical && (technicalModule || technicalRules.length > 0 || technicalIssues.length > 0) && (
        <Card className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Technical Audit</h2>
              <p className="mt-1 text-sm text-gray-500">
                Site security, performance, and technical readiness checks.
              </p>
            </div>
            <ModuleScoreRing
              score={professionalReport.scores?.technical ?? technicalModule?.score}
              label="Technical Score"
              summary={technicalModule?.summary}
            />
          </div>
          <RuleResultsList rules={technicalRules.length > 0 ? technicalRules : technicalModule?.rules} />
          <ModuleIssuesList issues={technicalIssues} />
        </Card>
      )}

      {/* Trust & Policy Audit */}
      {showTrustPolicy &&
        (trustPolicyRules.length > 0 ||
          trustPolicyIssues.length > 0 ||
          pages ||
          contactInfo ||
          pageContent) && (
        <Card className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Trust & Policy Audit</h2>
              <p className="mt-1 text-sm text-gray-500">
                Business trust signals, contact information, and policy page coverage.
              </p>
            </div>
            <div className="flex gap-4">
              <ModuleScoreRing
                score={professionalReport.scores?.trust}
                label="Trust Score"
              />
              <ModuleScoreRing
                score={professionalReport.scores?.policy}
                label="Policy Score"
              />
            </div>
          </div>
          <RuleResultsList rules={trustPolicyRules} />
          <ModuleIssuesList issues={trustPolicyIssues} />

          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-900">Key Pages</h3>
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
          </div>

          <div className="mt-6 border-t border-gray-100 pt-4">
            <h3 className="text-sm font-semibold text-gray-900">Contact Information</h3>
            <p className="mt-1 text-sm text-gray-500">Detected from homepage and key pages.</p>
            <dl className="mt-4 space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contactInfo?.emails?.length > 0 ? contactInfo.emails.join(', ') : '(not found)'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contactInfo?.phones?.length > 0 ? contactInfo.phones.join(', ') : '(not found)'}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {contactInfo?.addresses?.length > 0 ? contactInfo.addresses.join('; ') : '(not found)'}
                </dd>
              </div>
            </dl>
          </div>

          {pageContent && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Page Content Analysis</h3>
              <p className="mt-1 text-sm text-gray-500">Content extracted from discovered key pages.</p>
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
                            <dt className="shrink-0 text-gray-500">Title:</dt>
                            <dd className="truncate text-gray-900">{content.title || '(empty)'}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-gray-500">H1:</dt>
                            <dd className="truncate text-gray-900">{content.h1 || '(empty)'}</dd>
                          </div>
                          <div className="flex gap-2">
                            <dt className="shrink-0 text-gray-500">Text length:</dt>
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
            </div>
          )}
        </Card>
      )}

      {fullAudit && (
      <Card className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Platform Detection</h2>
        <div className="mt-4">
          <PlatformBadge platform={platform} />
        </div>
      </Card>
      )}

      {import.meta.env.DEV && fullAudit && detectionSources && (
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

      {fullAudit && (
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
      )}

      {fullAudit && (
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
      )}

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
