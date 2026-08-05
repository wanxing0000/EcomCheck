import Card from './Card'

function formatConfidence(score) {
  if (typeof score !== 'number') return '—'
  return `${Math.round(score * 100)}%`
}

function getConfidenceBadgeStyle(tier) {
  switch (tier) {
    case 'high':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'medium':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

export default function DetectedProductPagesSection({ productDiscovery }) {
  const pages = productDiscovery?.productPages || []
  const summary = productDiscovery?.summary

  if (!pages.length) return null

  return (
    <Card className="mt-6 border-brand-100" data-testid="detected-product-pages">
      <h2 className="text-lg font-semibold text-gray-900">Detected Product Pages</h2>
      <p className="mt-1 text-sm text-gray-500">
        Product URLs discovered from crawled internal links. Full product analysis is not included yet.
      </p>

      {summary && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Detected Products</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{summary.total}</p>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">High Confidence</p>
            <p className="mt-1 text-2xl font-bold text-emerald-900">{summary.highConfidence}</p>
          </div>
          <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Medium Confidence</p>
            <p className="mt-1 text-2xl font-bold text-amber-900">{summary.mediumConfidence}</p>
          </div>
        </div>
      )}

      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-xs uppercase tracking-wide text-gray-500">
              <th className="py-2 pr-4 font-semibold">URL</th>
              <th className="py-2 pr-4 font-semibold">Confidence</th>
              <th className="py-2 pr-4 font-semibold">Detection Reason</th>
            </tr>
          </thead>
          <tbody>
            {pages.map((page) => (
              <tr key={page.url} className="border-b border-gray-100 align-top">
                <td className="py-3 pr-4">
                  <a
                    href={page.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-brand-700 hover:underline"
                  >
                    {page.url}
                  </a>
                  {page.signals?.length > 0 && (
                    <p className="mt-1 text-xs text-gray-500">{page.signals.join(' · ')}</p>
                  )}
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">
                  <span
                    className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${getConfidenceBadgeStyle(page.confidence)}`}
                  >
                    {page.confidence || 'low'} ({formatConfidence(page.score)})
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-700">{page.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
