import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import {
  FUTURE_AUDIT_OPTIONS,
  GMC_AUDIT_PRODUCT,
  HERO_GMC_CTA,
  MAIN_AUDIT_OPTIONS,
  SEO_AUDIT_PRODUCT,
  getAuditProductForMode,
} from '../data/auditProducts.js'
import {
  GMC_DETECTION_SCOPE,
  GMC_DAILY_FREE_LIMIT,
  GMC_PRO_PLACEHOLDER,
} from '../data/gmcProduct.js'
import { fetchUsageStatus, formatUsageLabel } from '../utils/usageLimit.js'

const proofPoints = [
  {
    title: 'GMC-first compliance',
    description: 'Catch Merchant Center blockers before they stop your Shopping campaigns.',
  },
  {
    title: 'Free SEO growth',
    description: 'Run SEO Health Audit anytime to improve organic visibility at no cost.',
  },
  {
    title: 'Built for sellers',
    description: 'Plain-language findings your team can act on without a developer on call.',
  },
]

export default function Home() {
  const [url, setUrl] = useState('')
  const [chooseUrl, setChooseUrl] = useState('')
  const [gmcUsage, setGmcUsage] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsageStatus('gmc').then(setGmcUsage)
  }, [])

  function startAudit(mode, targetUrl) {
    const trimmed = targetUrl.trim()
    if (!trimmed) return false
    navigate('/scan', {
      state: {
        url: trimmed,
        mode,
        auditProduct: getAuditProductForMode(mode),
      },
    })
    return true
  }

  const handleHeroSubmit = (e) => {
    e.preventDefault()
    startAudit(HERO_GMC_CTA.mode, url)
  }

  const handleChooseAudit = (mode) => {
    const targetUrl = chooseUrl.trim() || url.trim()
    if (!startAudit(mode, targetUrl)) {
      document.getElementById('choose-audit-url')?.focus()
    }
  }

  const gmcOption = MAIN_AUDIT_OPTIONS.find((option) => option.mode === 'gmc')
  const seoOption = MAIN_AUDIT_OPTIONS.find((option) => option.mode === 'seo')

  return (
    <div>
      {/* Hero — GMC default entry */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/60 to-white" />
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-emerald-100/50 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-800">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            GMC Compliance Audit — Core Product
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Pass Google Merchant Center{' '}
            <span className="gradient-text">before you launch ads</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            EcomCheck is built around GMC readiness — scan your store for Shopping disapprovals, policy gaps,
            and compliance risks. SEO Health Audit is free and unlimited as your growth entry.
          </p>

          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
              {GMC_AUDIT_PRODUCT.name}
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 shadow-sm">
              {SEO_AUDIT_PRODUCT.name} · Free
            </span>
          </div>

          <form onSubmit={handleHeroSubmit} className="mx-auto mt-10 max-w-xl">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-store.com"
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  required
                />
              </div>
              <Button type="submit" size="lg" className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-700">
                {HERO_GMC_CTA.label}
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </div>
            <p className="mt-3 text-sm text-gray-500">
              {formatUsageLabel(gmcUsage)} · {HERO_GMC_CTA.hint}
            </p>
          </form>
        </div>
      </section>

      {/* GMC Audit landing */}
      <section id="gmc-audit" className="border-t border-emerald-100 bg-white py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-2 lg:items-start">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-emerald-700">GMC Readiness Checker</p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-gray-900">
                Your Merchant Center compliance command center
              </h2>
              <p className="mt-4 text-base leading-relaxed text-gray-600">
                One scan covers GMC product rules, ads readiness, technical foundations, and trust & policy signals —
                everything you need before scaling Google Shopping.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">
                <span className="font-semibold">Free daily quota:</span>
                {formatUsageLabel(gmcUsage)}
              </div>

              <Button
                size="lg"
                className="mt-8 bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  const target = url.trim() || chooseUrl.trim()
                  if (!startAudit('gmc', target)) {
                    document.getElementById('gmc-landing-url')?.focus()
                  }
                }}
              >
                Run GMC Compliance Audit
              </Button>
            </div>

            <div className="space-y-6">
              <Card className="border-emerald-100 bg-emerald-50/30">
                <h3 className="text-sm font-semibold text-gray-900">Detection scope</h3>
                <div className="mt-4 space-y-4">
                  {GMC_DETECTION_SCOPE.map((group) => (
                    <div key={group.id}>
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{group.label}</p>
                      <ul className="mt-2 space-y-1.5">
                        {group.items.map((item) => (
                          <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </Card>

              <Card className="border-dashed border-emerald-200 bg-gradient-to-br from-emerald-50/50 to-white">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                      {GMC_PRO_PLACEHOLDER.title}
                    </p>
                    <h3 className="mt-1 text-lg font-semibold text-gray-900">{GMC_PRO_PLACEHOLDER.headline}</h3>
                  </div>
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                    Coming soon
                  </span>
                </div>
                <ul className="mt-4 space-y-2">
                  {GMC_PRO_PLACEHOLDER.benefits.map((benefit) => (
                    <li key={benefit} className="text-sm text-gray-600">
                      · {benefit}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled
                  className="mt-5 w-full cursor-not-allowed rounded-lg border border-emerald-200 bg-white px-4 py-2 text-sm font-semibold text-emerald-700 opacity-80"
                >
                  {GMC_PRO_PLACEHOLDER.cta}
                </button>
              </Card>
            </div>
          </div>

          <div className="mx-auto mt-10 max-w-xl lg:max-w-none">
            <label htmlFor="gmc-landing-url" className="sr-only">
              Store URL for GMC Audit
            </label>
            <input
              id="gmc-landing-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://your-store.com"
              className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            />
            <p className="mt-2 text-xs text-gray-400">
              {GMC_DAILY_FREE_LIMIT} free GMC scans per day · Resets at midnight UTC
            </p>
          </div>
        </div>
      </section>

      {/* Audit Products */}
      <section id="choose-audit" className="border-t border-gray-100 bg-gray-50/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Audit Products</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              GMC first. SEO free. More audits on the way.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Start with GMC Compliance Audit — our core paid product. SEO Health Audit is your free growth entry.
            </p>
          </div>

          <div className="mx-auto mt-8 max-w-xl">
            <label htmlFor="choose-audit-url" className="sr-only">
              Store URL
            </label>
            <input
              id="choose-audit-url"
              type="url"
              value={chooseUrl}
              onChange={(e) => setChooseUrl(e.target.value)}
              placeholder="https://your-store.com"
              className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
            />
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[gmcOption, seoOption].filter(Boolean).map((option, index) => (
              <button
                key={option.mode}
                type="button"
                onClick={() => handleChooseAudit(option.mode)}
                className={`group h-full text-left ${index === 0 ? 'md:order-1' : 'md:order-2'}`}
              >
                <Card
                  hover
                  className={`flex h-full flex-col transition-colors ${
                    option.mode === 'gmc'
                      ? 'border-emerald-200 ring-2 ring-emerald-100 group-hover:border-emerald-300'
                      : 'group-hover:border-brand-300'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${option.accent}`}>
                        {option.name}
                      </div>
                      {option.badge && (
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                            option.mode === 'gmc' ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                          }`}
                        >
                          {option.badge}
                        </span>
                      )}
                    </div>
                    <svg
                      className="h-5 w-5 text-gray-300 transition-colors group-hover:text-brand-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-gray-600">{option.tagline}</p>
                  {option.mode === 'gmc' && (
                    <p className="mt-2 text-xs font-medium text-emerald-700">{formatUsageLabel(gmcUsage)}</p>
                  )}
                  <ul className="mt-5 space-y-2 border-t border-gray-100 pt-5">
                    {option.checks.map((check) => (
                      <li key={check} className="flex items-start gap-2 text-sm text-gray-700">
                        <svg
                          className="mt-0.5 h-4 w-4 shrink-0 text-brand-500"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span>{check}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-5 text-sm font-medium text-brand-600 group-hover:text-brand-700">
                    Run {option.name} →
                  </p>
                </Card>
              </button>
            ))}
          </div>

          <div className="mt-10">
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-gray-500">
              Future Audit Products
            </p>
            <div className="mt-6 grid gap-6 md:grid-cols-2">
              {FUTURE_AUDIT_OPTIONS.map((option) => (
                <Card key={option.id} className="relative border-dashed border-gray-200 bg-white/80 opacity-80">
                  <div className="flex items-start justify-between gap-3">
                    <div className={`inline-flex rounded-lg px-2.5 py-1 text-xs font-semibold ${option.accent}`}>
                      {option.name}
                    </div>
                    <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500">
                      Coming soon
                    </span>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-gray-500">{option.tagline}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Proof points */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Stop guessing. Start fixing.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              EcomCheck turns a manual checklist into an actionable audit your whole team can use.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {proofPoints.map((point) => (
              <Card key={point.title} hover>
                <h3 className="text-lg font-semibold text-gray-900">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{point.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="pb-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Card className="border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white">
            <h2 className="text-2xl font-bold sm:text-3xl">Ready for Google Shopping?</h2>
            <p className="mx-auto mt-4 max-w-lg text-emerald-100">
              Start with a free GMC compliance scan today, or run the unlimited SEO Health Audit to grow organic traffic.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-8 border-0 bg-white text-emerald-700 hover:bg-emerald-50"
              onClick={() => document.getElementById('gmc-audit')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Start Free GMC Audit
            </Button>
          </Card>
        </div>
      </section>
    </div>
  )
}
