import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { GMC_AUDIT_PRODUCT, SEO_AUDIT_PRODUCT } from '../data/auditProducts.js'
import { useUserReports } from '../hooks/useUserReports.js'
import {
  filterReportsByMode,
  formatAuditMode,
  formatReportDate,
  formatReportScore,
} from '../utils/dashboardFormat.js'

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'gmc', label: 'GMC' },
  { id: 'seo', label: 'SEO' },
]

export default function DashboardReports() {
  const { reports, loading, error } = useUserReports()
  const [filter, setFilter] = useState('all')

  const filteredReports = useMemo(
    () => filterReportsByMode(reports, filter),
    [reports, filter]
  )

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Reports</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Audit history</h1>
          <p className="mt-2 text-sm text-gray-600">All saved reports from your account.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={GMC_AUDIT_PRODUCT.landingPath}>
            <Button size="sm">Start GMC Audit</Button>
          </Link>
          <Link to={SEO_AUDIT_PRODUCT.landingPath}>
            <Button size="sm" variant="secondary">
              Start SEO Audit
            </Button>
          </Link>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap gap-2">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              filter === id
                ? 'bg-brand-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200',
            ].join(' ')}
          >
            {label}
          </button>
        ))}
      </div>

      {loading && <p className="mt-6 text-sm text-gray-500">Loading reports...</p>}
      {error && (
        <Card className="mt-6 border-red-200 bg-red-50">
          <p className="text-sm text-red-700">{error}</p>
        </Card>
      )}

      {!loading && !error && filteredReports.length === 0 && (
        <Card className="mt-6 border-dashed border-gray-200 bg-gray-50/80">
          <p className="text-sm text-gray-600">
            {filter === 'all'
              ? 'No saved reports yet.'
              : `No ${filter.toUpperCase()} reports yet.`}
          </p>
          <Link to="/dashboard" className="mt-4 inline-block text-sm font-medium text-brand-600 hover:text-brand-700">
            ← Back to dashboard
          </Link>
        </Card>
      )}

      {!loading && !error && filteredReports.length > 0 && (
        <div className="mt-6 overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">URL</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Audit Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Score</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Created</th>
                <th className="px-4 py-3 text-right font-medium text-gray-600">Report</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReports.map((report) => (
                <tr key={report.id} className="hover:bg-gray-50/80">
                  <td className="max-w-xs truncate px-4 py-3 text-gray-900" title={report.url}>
                    {report.url}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{formatAuditMode(report.auditMode)}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{formatReportScore(report)}</td>
                  <td className="px-4 py-3 text-gray-600">{formatReportDate(report.createdAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      to={`/report/${report.id}`}
                      className="font-medium text-brand-600 hover:text-brand-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
