import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Badge from '../components/Badge'
import Button from '../components/Button'
import Card from '../components/Card'
import { DEFAULT_AUDIT_MODE, getAuditProductForMode } from '../data/auditProducts.js'
import { useAuth } from '../context/AuthContext'
import { getOrCreateClientId } from '../utils/usageLimit.js'
import { trackCompleteAudit, trackStartAudit } from '../lib/analytics.js'

const SCAN_STEPS = [
  { id: 'connect', label: 'Connecting to website' },
  { id: 'fetch', label: 'Fetching page content' },
  { id: 'parse', label: 'Extracting page metadata' },
  { id: 'analyze', label: 'Analyzing link structure' },
]

const SCAN_TITLES = {
  gmc: 'Running GMC Compliance Audit...',
  seo: 'Running SEO Health Audit...',
}

function getAuditEntryPath(mode) {
  if (mode === 'seo') return '/audit/seo'
  if (mode === 'gmc') return '/audit/gmc'
  return '/'
}

export default function Scan() {
  const location = useLocation()
  const navigate = useNavigate()
  const url = location.state?.url
  const mode = location.state?.mode || DEFAULT_AUDIT_MODE
  const auditProduct = location.state?.auditProduct || getAuditProductForMode(mode)
  const { getAccessToken } = useAuth()

  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [isComplete, setIsComplete] = useState(false)

  const runningTitle = SCAN_TITLES[mode] || `Running ${auditProduct.name}...`
  const isGmc = mode === 'gmc'

  useEffect(() => {
    if (!url) {
      navigate(getAuditEntryPath(mode), { replace: true })
      return
    }

    let cancelled = false
    let stepTimer

    const advanceSteps = () => {
      stepTimer = setInterval(() => {
        setCurrentStep((prev) => Math.min(prev + 1, SCAN_STEPS.length - 1))
        setProgress((prev) => Math.min(prev + 8, 90))
      }, 600)
    }

    advanceSteps()
    trackStartAudit({ mode, url })

    const headers = { 'Content-Type': 'application/json' }
    const accessToken = getAccessToken()
    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`
    }

    fetch('/api/audit', {
      method: 'POST',
      headers,
      body: JSON.stringify({ url, mode, clientId: getOrCreateClientId() }),
    })
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok || !json.success) {
          const message =
            json.error?.code === 'USAGE_LIMIT_EXCEEDED'
              ? json.error.message || 'Daily free audit limit reached. Please try again tomorrow.'
              : json.error?.message || 'Audit failed'
          const err = new Error(message)
          err.code = json.error?.code
          err.usage = json.data?.usage
          throw err
        }
        return json.data
      })
      .then((crawlResult) => {
        if (cancelled) return
        clearInterval(stepTimer)
        setCurrentStep(SCAN_STEPS.length)
        setProgress(100)
        setIsComplete(true)
        trackCompleteAudit({ mode, url, reportId: crawlResult.reportId || null })
        setTimeout(() => {
          navigate('/report', { state: { url, crawlResult }, replace: true })
        }, 600)
      })
      .catch((err) => {
        if (cancelled) return
        clearInterval(stepTimer)
        setError(err.message)
        setProgress(0)
      })

    return () => {
      cancelled = true
      clearInterval(stepTimer)
    }
  }, [url, mode, navigate, getAccessToken])

  if (!url) return null

  return (
    <div className="page-shell">
      <div className="relative overflow-hidden">
        <div className="hero-glow">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 via-slate-50 to-slate-50" />
        </div>

        <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl flex-col justify-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="text-center">
            <div
              className={`mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl shadow-sm ${
                error ? 'bg-red-50' : isComplete ? 'bg-emerald-50' : isGmc ? 'bg-emerald-50' : 'bg-brand-50'
              }`}
            >
              {error ? (
                <svg className="h-9 w-9 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : isComplete ? (
                <svg className="h-9 w-9 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <svg className={`h-9 w-9 animate-spin ${isGmc ? 'text-emerald-600' : 'text-brand-600'}`} fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </div>

            <Badge variant={isGmc ? 'success' : 'brand'} className="mb-3">
              {auditProduct.name}
            </Badge>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {error ? 'Scan failed' : isComplete ? 'Scan complete!' : runningTitle}
            </h1>
            <p className="url-pill mx-auto mt-4">{url}</p>
            <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-gray-600">{auditProduct.description}</p>
          </div>

      {error ? (
        <Card variant="muted" className="mt-10 border-red-200 bg-red-50/80">
          <p className="text-sm font-medium text-red-800">{error}</p>
          {error.includes('free GMC audit') && (
            <p className="mt-2 text-xs text-red-700">Free GMC audits reset daily at midnight UTC.</p>
          )}
              <div className="mt-4 flex gap-3">
                <Button variant="primary" onClick={() => navigate(getAuditEntryPath(mode), { state: { url } })}>
                  Try Again
                </Button>
                <Button variant="secondary" onClick={() => navigate('/')}>
                  Back Home
                </Button>
              </div>
            </Card>
          ) : (
            <Card variant="elevated" className="mt-10">
              <div className="mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold text-gray-800">Progress</span>
                  <span className="font-medium text-gray-500">{Math.round(progress)}%</span>
                </div>
                <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ease-out ${
                      isGmc
                        ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                        : 'bg-gradient-to-r from-brand-500 to-brand-600'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>

              <ul className="space-y-2">
                {SCAN_STEPS.map((step, index) => {
                  const isDone = index < currentStep || isComplete
                  const isActive = index === currentStep && !isComplete
                  const isPending = index > currentStep && !isComplete

                  return (
                    <li
                      key={step.id}
                      className={[
                        'flex items-center gap-3 rounded-xl px-4 py-3 text-sm transition-colors',
                        isActive && 'bg-brand-50 font-medium text-brand-800 ring-1 ring-brand-100',
                        isDone && 'bg-emerald-50/60 text-emerald-800',
                        isPending && 'text-gray-400',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current/20">
                        {isDone && (
                          <svg className="h-4 w-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                        {isActive && <span className="h-2 w-2 animate-pulse rounded-full bg-brand-600" />}
                        {isPending && <span className="h-2 w-2 rounded-full bg-gray-300" />}
                      </span>
                      {step.label}
                    </li>
                  )
                })}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
