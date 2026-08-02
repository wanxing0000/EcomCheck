import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import { DEFAULT_AUDIT_MODE, getAuditProductForMode } from '../data/auditProducts.js'
import { getOrCreateClientId } from '../utils/usageLimit.js'

const SCAN_STEPS = [
  { id: 'connect', label: 'Connecting to website' },
  { id: 'fetch', label: 'Fetching page content' },
  { id: 'parse', label: 'Extracting page metadata' },
  { id: 'analyze', label: 'Analyzing link structure' },
]

export default function Scan() {
  const location = useLocation()
  const navigate = useNavigate()
  const url = location.state?.url
  const mode = location.state?.mode || DEFAULT_AUDIT_MODE
  const auditProduct = location.state?.auditProduct || getAuditProductForMode(mode)

  const [currentStep, setCurrentStep] = useState(0)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState(null)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    if (!url) {
      navigate('/', { replace: true })
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

    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url, mode, clientId: getOrCreateClientId() }),
    })
      .then(async (res) => {
        const json = await res.json()
        if (!res.ok || !json.success) {
          throw new Error(json.error?.message || 'Audit failed')
        }
        return json.data
      })
      .then((crawlResult) => {
        if (cancelled) return
        clearInterval(stepTimer)
        setCurrentStep(SCAN_STEPS.length)
        setProgress(100)
        setIsComplete(true)
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
  }, [url, mode, navigate])

  if (!url) return null

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
          {error ? (
            <svg className="h-8 w-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : isComplete ? (
            <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="h-8 w-8 animate-spin text-brand-600" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          )}
        </div>

        <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">{auditProduct.name}</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
          {error ? 'Scan failed' : isComplete ? 'Scan complete!' : `Running ${auditProduct.name}...`}
        </h1>
        <p className="mt-2 text-gray-500">{url}</p>
        <p className="mx-auto mt-3 max-w-md text-sm text-gray-600">{auditProduct.description}</p>
      </div>

      {error ? (
        <Card className="mt-10 border-red-200 bg-red-50">
          <p className="text-sm font-medium text-red-800">{error}</p>
          <div className="mt-4 flex gap-3">
            <Button variant="primary" onClick={() => navigate('/')}>
              Try Again
            </Button>
          </div>
        </Card>
      ) : (
        <Card className="mt-10">
          <div className="mb-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-gray-700">Progress</span>
              <span className="text-gray-500">{Math.round(progress)}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-brand-600 transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <ul className="space-y-3">
            {SCAN_STEPS.map((step, index) => {
              const isDone = index < currentStep || isComplete
              const isActive = index === currentStep && !isComplete
              const isPending = index > currentStep && !isComplete

              return (
                <li
                  key={step.id}
                  className={[
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive && 'bg-brand-50 text-brand-700',
                    isDone && 'text-green-700',
                    isPending && 'text-gray-400',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                    {isDone && (
                      <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
  )
}
