import { Link } from 'react-router-dom'

const auditTools = [
  { to: '/audit/gmc', label: 'GMC Compliance Audit' },
  { to: '/audit/seo', label: 'SEO Health Audit' },
  { to: '/audit/shopify-gmc', label: 'Shopify GMC Audit' },
  { to: '/audit/woocommerce-gmc', label: 'WooCommerce GMC Audit' },
]

const guideLinks = [
  { to: '/guides/google-merchant-center-requirements', label: 'GMC Requirements' },
  { to: '/guides/google-merchant-center-misrepresentation', label: 'GMC Misrepresentation' },
  { to: '/guides/google-merchant-center-suspension', label: 'GMC Suspension' },
]

export default function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-5">
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
              <span className="text-lg font-semibold text-gray-900">AuditPilot</span>
            </Link>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-gray-500">
              Free ecommerce audit tools for Google Merchant Center compliance and SEO health.
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Audit Tools</h3>
            <ul className="mt-4 space-y-3">
              {auditTools.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-gray-500 hover:text-gray-900">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">GMC Guides</h3>
            <ul className="mt-4 space-y-3">
              {guideLinks.map(({ to, label }) => (
                <li key={to}>
                  <Link to={to} className="text-sm text-gray-500 hover:text-gray-900">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-900">Resources</h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link to="/blog" className="text-sm text-gray-500 hover:text-gray-900">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/report" className="text-sm text-gray-500 hover:text-gray-900">
                  Sample Report
                </Link>
              </li>
              <li>
                <Link to="/scan" className="text-sm text-gray-500 hover:text-gray-900">
                  Scan
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 border-t border-gray-200 pt-8">
          <p className="text-center text-sm text-gray-400">
            &copy; {new Date().getFullYear()} AuditPilot. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
