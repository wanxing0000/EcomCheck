import { Link, useLocation } from 'react-router-dom'
import Button from './Button'
import UserMenu from './UserMenu'
import { useAuth } from '../context/AuthContext'

const navLinks = [
  { to: '/', label: 'Home' },
  { to: '/audit/gmc', label: 'GMC Audit' },
]

export default function Navbar() {
  const location = useLocation()
  const { user, loading } = useAuth()

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200/80 bg-white/90 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-90">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-600 to-brand-700 shadow-sm">
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
          <span className="text-lg font-semibold tracking-tight text-gray-900">AuditPilot</span>
        </Link>

        <nav className="hidden items-center gap-1 sm:flex">
          {navLinks.map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className={[
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                location.pathname === to
                  ? 'bg-brand-50 text-brand-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
              ].join(' ')}
            >
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          {!loading && user ? (
            <UserMenu />
          ) : (
            !loading && (
              <>
                <Link to="/register" className="hidden sm:inline-flex">
                  <Button variant="ghost" size="sm">
                    Register
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="secondary" size="sm">
                    Login
                  </Button>
                </Link>
              </>
            )
          )}

          <Link to="/audit/gmc" className="hidden sm:inline-flex">
            <Button variant="success" size="sm">
              Start Audit
            </Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
