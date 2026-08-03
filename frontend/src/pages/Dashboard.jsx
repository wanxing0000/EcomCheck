import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { GMC_AUDIT_PRODUCT, SEO_AUDIT_PRODUCT } from '../data/auditProducts.js'
import { useAuth } from '../context/AuthContext'
import { useUserReports } from '../hooks/useUserReports.js'
import { formatAuditMode, formatReportDate, formatReportScore } from '../utils/dashboardFormat.js'

function StatCard({ label, value, hint }) {
  return (
    <Card className="text-center">
      <p className="text-2xl font-bold tabular-nums text-gray-900">{value}</p>
      <p className="mt-1 text-sm font-medium text-gray-700">{label}</p>
      {hint && <p className="mt-1 text-xs text-gray-500">{hint}</p>}
    </Card>
  )
}

export default function Dashboard() {
  const { user } = useAuth()
  const { reports, stats, loading, error } = useUserReports()
  const recentReports = useMemo(() => reports.slice(0, 5), [reports])

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Dashboard</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-600">{user?.email}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to={GMC_AUDIT_PRODUCT.landingPath}>
            <Button>Start GMC Audit</Button>
          </Link>
          <Link to={SEO_AUDIT_PRODUCT.landingPath}>
            <Button variant="secondary">Start SEO Audit</Button>
          </Link>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="sr-only">Audit statistics</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Total Audits" value={loading ? '…' : stats.totalAudits} hint="All completed scans" />
          <StatCard label="GMC Audits" value={loading ? '…' : stats.gmcAudits} />
          <StatCard label="SEO Audits" value={loading ? '…' : stats.seoAudits} />
          <StatCard
            label="Saved Reports"
            value={loading ? '…' : stats.savedReports}
            hint="Stored in your account"
          />
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent reports</h2>
          {reports.length > 0 && (
            <Link to="/dashboard/reports" className="text-sm font-medium text-brand-600 hover:text-brand-700">
              View all reports →
            </Link>
          )}
        </div>

        {loading && <p className="mt-4 text-sm text-gray-500">Loading reports...</p>}
        {error && (
          <Card className="mt-4 border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        {!loading && !error && recentReports.length === 0 && (
          <Card className="mt-4 border-dashed border-gray-200 bg-gray-50/80">
            <p className="text-sm text-gray-600">No saved reports yet. Run your first audit to see results here.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link to={GMC_AUDIT_PRODUCT.landingPath}>
                <Button size="sm">Start GMC Audit</Button>
              </Link>
              <Link to={SEO_AUDIT_PRODUCT.landingPath}>
                <Button size="sm" variant="secondary">
                  Start SEO Audit
                </Button>
              </Link>
            </div>
          </Card>
        )}

        {!loading && !error && recentReports.length > 0 && (
          <ul className="mt-4 space-y-3">
            {recentReports.map((report) => (
              <li key={report.id}>
                <Link to={`/report/${report.id}`} className="block group">
                  <Card hover className="transition-colors group-hover:border-brand-300">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-gray-900 group-hover:text-brand-700">
                          {report.url}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">
                          {formatAuditMode(report.auditMode)} · Score {formatReportScore(report)} ·{' '}
                          {formatReportDate(report.createdAt)}
                        </p>
                      </div>
                      <span className="shrink-0 text-sm font-medium text-brand-600 group-hover:text-brand-700">
                        View report →
                      </span>
                    </div>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
