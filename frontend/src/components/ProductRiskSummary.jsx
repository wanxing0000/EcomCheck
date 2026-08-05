import Card from './Card'
import {
  buildProductRiskSummaryFromCompliance,
  getRiskLevelStyle,
} from '../utils/productComplianceDisplay.js'

function SummaryStat({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export default function ProductRiskSummary({ productCompliance, productAnalysis, productRiskSummary }) {
  const summary =
    productRiskSummary ||
    buildProductRiskSummaryFromCompliance(productCompliance, productAnalysis)

  if (!summary?.analyzedProducts && !productCompliance?.products?.length) return null

  return (
    <Card className="mt-6 border-brand-100" data-testid="product-risk-summary">
      <h2 className="text-lg font-semibold text-gray-900">Product Compliance Summary</h2>
      <p className="mt-1 text-sm text-gray-500">
        Risk overview from analyzed product pages.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <SummaryStat label="Analyzed Products" value={summary.analyzedProducts} />
        <SummaryStat label="Products with Issues" value={summary.productsWithIssues} />
        <div className={`rounded-lg border px-4 py-3 ${getRiskLevelStyle(summary.riskLevel)}`}>
          <p className="text-xs font-semibold uppercase tracking-wide opacity-80">Risk Level</p>
          <p className="mt-1 text-2xl font-bold">{summary.riskLevelLabel}</p>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Issues</p>
          <dl className="mt-2 space-y-1 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Critical</dt>
              <dd className="font-semibold text-red-700">{summary.criticalCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">High</dt>
              <dd className="font-semibold text-amber-700">{summary.highCount}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-gray-600">Warnings</dt>
              <dd className="font-semibold text-blue-700">{summary.warningCount}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Fix Available</p>
          <p className="mt-1 text-2xl font-bold text-emerald-900">{summary.fixAvailableCount}</p>
        </div>
      </div>
    </Card>
  )
}
