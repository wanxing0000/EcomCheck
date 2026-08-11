import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { useAuth } from '../context/AuthContext'
import { formatAuthError } from '../utils/authErrors'
import { trackRegister } from '../lib/analytics.js'
import { claimPendingGuestReport } from '../utils/guestAuditSession.js'

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const { signUp, isConfigured } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [message, setMessage] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fromReport = location.state?.fromReport === true

  async function finishAuthRedirect(accessToken) {
    try {
      const saved = await claimPendingGuestReport(accessToken)
      if (saved?.id) {
        navigate(`/report/${saved.id}`, { replace: true })
        return
      }
    } catch (err) {
      console.error('Failed to save guest report after registration:', err)
    }

    navigate('/dashboard', { replace: true })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    setSubmitting(true)

    try {
      const { session } = await signUp(email.trim(), password)
      trackRegister()

      if (session) {
        await finishAuthRedirect(session.access_token)
        return
      }

      if (fromReport) {
        setMessage('Account created. Confirm your email, then log in to save your report to your dashboard.')
      } else {
        setMessage('Account created. Check your email to confirm, then log in.')
      }
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Create account</h1>
        <p className="mt-2 text-sm text-gray-600">
          {fromReport
            ? 'Register to save your audit report to your dashboard.'
            : 'Save audit history and revisit reports anytime.'}
        </p>
      </div>

      {!isConfigured && (
        <Card className="mt-8 border-amber-200 bg-amber-50">
          <p className="text-sm text-amber-900">
            Supabase is not configured. Add <code className="text-xs">VITE_SUPABASE_URL</code> and{' '}
            <code className="text-xs">VITE_SUPABASE_ANON_KEY</code> to enable registration.
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
              className="input-field mt-1"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={6}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="input-field mt-1"
            />
            <p className="mt-1 text-xs text-gray-500">Minimum 6 characters.</p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          {message && <p className="text-sm text-green-700">{message}</p>}

          <Button type="submit" className="w-full" disabled={submitting || !isConfigured}>
            {submitting ? 'Creating account...' : 'Register'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <Link
            to="/login"
            state={location.state}
            className="font-medium text-brand-600 hover:text-brand-700"
          >
            Log in
          </Link>
        </p>
      </Card>
    </div>
  )
}
