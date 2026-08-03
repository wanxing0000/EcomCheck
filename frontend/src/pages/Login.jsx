import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { useAuth } from '../context/AuthContext'
import { trackLogin } from '../lib/analytics.js'

export default function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signIn, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = location.state?.from || '/dashboard'

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      await signIn(email.trim(), password)
      trackLogin()
      navigate(redirectTo, { replace: true })
    } catch (err) {
      setError(err.message || 'Login failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Log in</h1>
        <p className="mt-2 text-sm text-gray-600">Access your audit history and saved reports.</p>
      </div>

      {!isConfigured && (
        <Card className="mt-8 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            Supabase is not configured. Add <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to enable login.
          </p>
        </Card>
      )}

      <Card className="mt-8">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button type="submit" className="w-full" disabled={submitting || !isConfigured}>
            {submitting ? 'Signing in...' : 'Log in'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          No account?{' '}
          <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">
            Register
          </Link>
        </p>
      </Card>
    </div>
  )
}
