import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'

const features = [
  {
    title: 'Google Merchant Center',
    description:
      'Check product feed compliance, policy violations, and listing quality for Google Shopping ads.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
    ),
  },
  {
    title: 'Meta Ads Readiness',
    description:
      'Evaluate your store for Facebook and Instagram advertising requirements and best practices.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    ),
  },
  {
    title: 'Actionable Insights',
    description:
      'Get clear, prioritized recommendations to fix issues before launching your ad campaigns.',
    icon: (
      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
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
            Advertising readiness audit
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Is your store ready for{' '}
            <span className="gradient-text">paid advertising?</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            EcomCheck analyzes your e-commerce website for Google Merchant Center
            and Meta Ads compliance — so you can launch campaigns with confidence.
          </p>

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
                Start Audit
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Button>
            </div>
            <p className="mt-3 text-sm text-gray-400">
              Free instant scan. No account required.
            </p>
          </form>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-gray-100 bg-gray-50/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Everything you need before spending on ads
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Avoid costly disapprovals and wasted ad spend by fixing compliance
              issues upfront.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <Card key={feature.title} hover>
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                  {feature.icon}
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">
                  {feature.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Card className="bg-gradient-to-br from-brand-600 to-brand-700 border-0 text-white">
            <h2 className="text-2xl font-bold sm:text-3xl">
              Ready to audit your store?
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-brand-100">
              Enter your store URL above and get a comprehensive advertising
              readiness report in minutes.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-8 border-0 bg-white text-brand-700 hover:bg-brand-50"
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              Get Started
            </Button>
          </Card>
        </div>
      </section>
    </div>
  )
}
