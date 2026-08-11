import Card from './Card'
import Badge from './Badge'

function getRiskStyle(riskLevel) {
  switch (riskLevel) {
    case 'Excellent':
      return 'text-emerald-700'
    case 'Good':
      return 'text-blue-700'
    case 'Needs Improvement':
      return 'text-amber-700'
    default:
      return 'text-red-700'
  }
}

export default function ComplianceScoreCard({ complianceScore }) {
  if (!complianceScore || typeof complianceScore.score !== 'number') return null

  const { score, grade, riskLevel, breakdown, topIssues } = complianceScore

  return (
    <Card variant="elevated" className="report-section border-brand-100/80" data-testid="compliance-score-card">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">GMC Compliance Health</h2>
            <Badge variant="muted" size="sm">
              Estimated
            </Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Based on website and product compliance issues. Not an official Google score.
          </p>

          <div className="mt-5 flex flex-wrap items-end gap-4">
            <p className="text-4xl font-bold tracking-tight text-gray-900">
              {score}
              <span className="text-lg font-medium text-gray-400"> / 100</span>
            </p>
            <Badge variant={grade === 'A' || grade === 'B' ? 'success' : grade === 'C' || grade === 'D' ? 'warning' : 'danger'}>
              Grade {grade}
            </Badge>
          </div>

          <p className="mt-3 text-sm text-gray-600">
            Risk Level:{' '}
            <span className={`font-semibold ${getRiskStyle(riskLevel)}`}>{riskLevel}</span>
          </p>
        </div>

        <div className="grid min-w-[240px] grid-cols-2 gap-3">
          <div className="rounded-xl border border-gray-200 bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Website</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{breakdown?.websiteScore ?? '—'}</p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-slate-50/80 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Products</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{breakdown?.productScore ?? '—'}</p>
          </div>
        </div>
      </div>

      {topIssues?.length > 0 && (
        <div className="mt-6 border-t border-gray-100 pt-6">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Top Issues</h3>
          <ol className="mt-4 space-y-3">
            {topIssues.map((issue, index) => (
              <li key={`${issue.ruleId}-${issue.source}-${index}`} className="flex items-start gap-3 rounded-xl bg-gray-50/80 px-4 py-3 text-sm">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                  {index + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">{issue.title}</p>
                  {issue.ruleId && <p className="mt-0.5 text-xs text-gray-500">{issue.ruleId}</p>}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  )
}
