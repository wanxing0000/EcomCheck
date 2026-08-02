import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

const HERO_MODULES = ['GMC', 'SEO', 'Ads', 'Technical', 'Trust & Policy']

const auditModules = [
  {
    id: 'gmc',
    name: 'GMC Audit',
    tagline: 'Launch Google Shopping without feed disapprovals or policy surprises.',
    checks: [
      'Product pricing & availability accuracy',
      'Return, shipping & payment policy quality',
      'Business contact & purchase flow signals',
      'Schema vs display price consistency',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
      </svg>
    ),
    accent: 'bg-emerald-100 text-emerald-700',
  },
  {
    id: 'seo',
    name: 'SEO Audit',
    tagline: 'Improve organic visibility with a clear picture of on-page SEO health.',
    checks: [
      'Title tags & meta descriptions',
      'H1 structure & canonical URLs',
      'Open Graph & structured data coverage',
      'Robots.txt & sitemap readiness',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
    accent: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'ads',
    name: 'Ads Audit',
    tagline: 'Make sure your tracking and product pages are ready before you scale spend.',
    checks: [
      'Meta Pixel & Google Tag detection',
      'Product JSON-LD on key pages',
      'Add-to-cart & buy-now signals',
      'Product schema completeness',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
    accent: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'technical',
    name: 'Technical Audit',
    tagline: 'Catch foundational issues that hurt performance, crawlability, and trust.',
    checks: [
      'HTTPS & secure connection',
      'Robots.txt accessibility',
      'XML sitemap discovery',
      'Core meta tag coverage',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z" />
      </svg>
    ),
    accent: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'trust',
    name: 'Trust & Policy Audit',
    tagline: 'Build buyer confidence with visible policies and reachable business details.',
    checks: [
      'Contact email, phone & address',
      'About Us & Contact page coverage',
      'Privacy, refund & shipping policies',
      'Policy page content quality',
    ],
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
    accent: 'bg-rose-100 text-rose-700',
  },
]

const proofPoints = [
  {
    title: 'One URL, full picture',
    description: 'Run a single scan and get separate compliance and SEO scores in one report.',
  },
  {
    title: 'Prioritized fixes',
    description: 'See what to fix first — ranked by business impact, not alphabetically.',
  },
  {
    title: 'Built for sellers',
    description: 'Plain-language findings your team can act on without a developer on call.',
  },
]

export default function Home() {
  const [url, setUrl] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return
    navigate('/scan', { state: { url: trimmed } })
  }

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-brand-50/50 to-white" />
          <div className="absolute left-1/2 top-0 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-brand-100/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-500" />
            </span>
            Ecommerce Website Audit Platform
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Audit your store for{' '}
            <span className="gradient-text">compliance & growth</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            EcomCheck scans your ecommerce site across GMC, SEO, Ads, Technical, and Trust & Policy —
            so you can fix blockers before they cost you sales, rankings, or ad spend.
          </p>

          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            {HERO_MODULES.map((label) => (
              <span
                key={label}
                className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-700 shadow-sm"
              >
                {label}
              </span>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-xl">
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
                  className="w-full rounded-lg border border-gray-300 bg-white py-3 pl-11 pr-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  required
                />
              </div>
              <Button type="submit" size="lg" className="whitespace-nowrap">
                Run Free Audit
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </div>
            <p className="mt-3 text-sm text-gray-400">
              Free instant scan · No account required · Results in minutes
            </p>
          </form>
        </div>
      </section>

      {/* Audit Modules */}
      <section id="audit-modules" className="border-t border-gray-100 bg-gray-50/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Audit Modules</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Five audits. One complete store health check.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Each module targets a different revenue risk — from Google Shopping disapprovals to
              missing trust signals that quietly kill conversions.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {auditModules.map((module) => (
              <Card key={module.id} hover className="flex h-full flex-col">
                <div className={`inline-flex h-11 w-11 items-center justify-center rounded-lg ${module.accent}`}>
                  {module.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{module.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{module.tagline}</p>
                <ul className="mt-5 space-y-2 border-t border-gray-100 pt-5">
                  {module.checks.map((check) => (
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
              </Card>
            ))}
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
          <Card className="border-0 bg-gradient-to-br from-brand-600 to-brand-700 text-white">
            <h2 className="text-2xl font-bold sm:text-3xl">
              See your store the way platforms do
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-brand-100">
              Enter your URL and get a full ecommerce audit — GMC, SEO, Ads, Technical, and Trust &
              Policy — with scores and prioritized next steps.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-8 border-0 bg-white text-brand-700 hover:bg-brand-50"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Audit My Store
            </Button>
          </Card>
        </div>
      </section>
    </div>
  )
}
