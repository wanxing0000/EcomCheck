import { Link } from 'react-router-dom'
import Button from './Button'
import Card from './Card'
import { useAuth } from '../context/AuthContext'

/**
 * Guest conversion CTA or logged-in save confirmation on the report page.
 */
export default function ReportSaveCta({ reportId, placement = 'top' }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (user && reportId) {
    return (
      <div
        className={[
          'flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3',
          placement === 'top' ? 'mb-6' : 'mt-6',
        ].join(' ')}
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-800">
          <svg className="h-5 w-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Saved to dashboard
        </span>
        <Link to="/dashboard/reports" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          View all reports →
        </Link>
      </div>
    )
  }

  if (user) return null

  return (
    <Card
      className={[
        'border-brand-100 bg-gradient-to-br from-brand-50 via-white to-white',
        placement === 'top' ? 'mb-6' : 'mt-6',
      ].join(' ')}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Save your audit report</h2>
          <p className="mt-1 text-sm text-gray-600">
            Create a free account to keep this report, track scores over time, and revisit fixes anytime.
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:items-end">
          <Link to="/register">
            <Button>Create free account</Button>
          </Link>
          <Link to="/login" className="text-center text-sm font-medium text-brand-600 hover:text-brand-700">
            Already have an account? Log in
          </Link>
        </div>
      </div>
    </Card>
  )
}
