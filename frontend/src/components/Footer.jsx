import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <svg
                  className="h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="text-lg font-semibold text-gray-900">EcomCheck</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-500">
              Website compliance and advertising readiness audit tool for
              e-commerce stores. Optimize your store for Google Merchant Center
              and Meta Ads.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Product</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link to="/" className="text-sm text-gray-500 hover:text-gray-900">
                  Audit
                </Link>
              </li>
              <li>
                <Link to="/report" className="text-sm text-gray-500 hover:text-gray-900">
                  Sample Report
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Platforms</h3>
            <ul className="mt-4 space-y-3">
              <li className="text-sm text-gray-500">Google Merchant Center</li>
              <li className="text-sm text-gray-500">Meta Ads</li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} EcomCheck. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
