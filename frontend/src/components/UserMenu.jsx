import { Link, useLocation } from 'react-router-dom'
import Button from './Button'
import { useAuth } from '../context/AuthContext'

const userLinks = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/dashboard/reports', label: 'Reports' },
]

function isActivePath(pathname, to) {
  if (to === '/dashboard') {
    return pathname === '/dashboard'
  }
  return pathname.startsWith(to)
}

export default function UserMenu() {
  const location = useLocation()
  const { signOut } = useAuth()

  return (
    <div className="flex items-center gap-1">
      {userLinks.map(({ to, label }) => (
        <Link
          key={to}
          to={to}
          className={[
            'rounded-md px-3 py-2 text-sm font-medium transition-colors',
            isActivePath(location.pathname, to)
              ? 'text-brand-600 bg-brand-50'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
          ].join(' ')}
        >
          {label}
        </Link>
      ))}
      <Button variant="ghost" size="sm" onClick={() => signOut()}>
        Logout
      </Button>
    </div>
  )
}
