import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import RelatedSeoLinks from '../components/RelatedSeoLinks'
import SeoBreadcrumbs from '../components/SeoBreadcrumbs'
import SeoMetadata from '../components/SeoMetadata'
import SeoStructuredData from '../components/SeoStructuredData'
import {
  GMC_AUDIT_PRODUCT,
  GMC_LANDING,
  HERO_GMC_CTA,
  getAuditProductForMode,
} from '../data/auditProducts.js'
import { SEO_GUIDE_LINKS, SEO_AUDIT_TOOL_PAGES } from '../data/seoPages.js'
import {
  buildBreadcrumbListSchema,
  buildSoftwareApplicationSchema,
  compactSchemaList,
} from '../utils/seoStructuredData.js'
import { fetchUsageStatus, formatUsageLabel } from '../utils/usageLimit.js'

function CheckIcon({ className = 'text-emerald-500' }) {
  return (
    <svg className={`h-5 w-5 shrink-0 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function UrlAuditForm({ url, onUrlChange, onSubmit, usageLabel, idPrefix = 'gmc' }) {
  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-xl">
      <label htmlFor={`${idPrefix}-audit-url`} className="sr-only">
        Store URL
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          id={`${idPrefix}-audit-url`}
          type="url"
          value={url}
          onChange={(e) => onUrlChange(e.target.value)}
          placeholder="https://your-store.com"
          required
          className="w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
        />
        <Button type="submit" size="lg" className="whitespace-nowrap bg-emerald-600 hover:bg-emerald-700">
          {GMC_LANDING.hero.cta}
        </Button>
      </div>
      {usageLabel && <p className="mt-3 text-sm text-emerald-700">{usageLabel}</p>}
      <p className="mt-2 text-xs text-gray-400">{GMC_LANDING.hero.urlHint}</p>
    </form>
  )
}

export default function GmcAudit() {
  const navigate = useNavigate()
  const location = useLocation()
  const [url, setUrl] = useState(location.state?.url || '')
  const [gmcUsage, setGmcUsage] = useState(null)

  useEffect(() => {
    fetchUsageStatus('gmc').then(setGmcUsage)
  }, [])

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    navigate('/scan', {
      state: {
        url: trimmed,
        mode: 'gmc',
        auditProduct: getAuditProductForMode('gmc'),
      },
    })
  }

  const usageLabel = gmcUsage ? formatUsageLabel(gmcUsage) : null
  const toolPage = SEO_AUDIT_TOOL_PAGES.gmc
  const structuredData = compactSchemaList([
    buildSoftwareApplicationSchema({
      name: toolPage.name,
      description: toolPage.metaDescription,
      path: toolPage.path,
    }),
    buildBreadcrumbListSchema(toolPage.breadcrumbs),
  ])

  return (
    <>
      <SeoMetadata
        title={toolPage.title}
        description={toolPage.metaDescription}
        keywords={toolPage.keywords}
        canonicalPath={toolPage.path}
      />
      <SeoStructuredData schemas={structuredData} />
      <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-white">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-emerald-100/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl px-4 py-14 text-center sm:px-6 sm:py-20 lg:px-8">
          <div className="text-left">
            <SeoBreadcrumbs items={toolPage.breadcrumbs} />
          </div>

          <p className="mt-8 text-sm font-semibold uppercase tracking-wide text-emerald-700">
            {GMC_AUDIT_PRODUCT.name}
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            {GMC_LANDING.hero.title}
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
            {GMC_LANDING.hero.subtitle}
          </p>

          <div className="mt-10">
            <UrlAuditForm
              url={url}
              onUrlChange={setUrl}
              onSubmit={handleSubmit}
              usageLabel={usageLabel}
            />
          </div>

          <p className="mt-6 text-sm text-gray-500">
            URL → scan → <span className="font-medium text-gray-700">GMC Readiness Report</span>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              {GMC_LANDING.features.title}
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-600">{GMC_LANDING.features.subtitle}</p>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {GMC_LANDING.features.items.map((item) => (
              <Card key={item} className="border-emerald-100 bg-emerald-50/20">
                <div className="flex items-start gap-3">
                  <CheckIcon />
                  <p className="text-sm font-medium text-gray-900">{item}</p>
                </div>
              </Card>
            ))}
          </div>

          <p className="mt-8 text-center text-sm text-gray-500">
            Plus bundled ads, technical, and trust & policy checks included in every GMC audit.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="border-y border-gray-100 bg-gray-50/60 py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900">
            {GMC_LANDING.plans.title}
          </h2>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <Card className="border-emerald-200 ring-2 ring-emerald-100">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{GMC_LANDING.plans.free.name}</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                  Current
                </span>
              </div>
              <ul className="mt-5 space-y-3">
                {GMC_LANDING.plans.free.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <CheckIcon />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="border-dashed border-gray-300 bg-white/80">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{GMC_LANDING.plans.pro.name}</h3>
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Coming soon
                </span>
              </div>
              <ul className="mt-5 space-y-3">
                {GMC_LANDING.plans.pro.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <CheckIcon className="text-gray-400" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-500"
              >
                Pro upgrade — coming soon
              </button>
            </Card>
          </div>
        </div>
      </section>

      {/* Why GMC Audit */}
      <section className="py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold tracking-tight text-gray-900">{GMC_LANDING.why.title}</h2>
            <p className="mx-auto mt-3 max-w-2xl text-gray-600">{GMC_LANDING.why.subtitle}</p>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            {GMC_LANDING.why.audiences.map((audience) => (
              <span
                key={audience}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800"
              >
                {audience}
              </span>
            ))}
          </div>

          <Card className="mt-10 border-emerald-100 bg-gradient-to-r from-emerald-50/80 to-white">
            <p className="text-sm leading-relaxed text-gray-700">
              Google Merchant Center rejects stores for policy gaps, mismatched product data, and missing
              business information — often before you spend a dollar on ads. EcomCheck surfaces those risks
              in plain language so you can fix blockers before review or suspension.
            </p>
          </Card>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="border-t border-emerald-100 bg-emerald-600 py-16">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">Ready to check your store?</h2>
          <p className="mx-auto mt-3 max-w-xl text-emerald-100">
            {HERO_GMC_CTA.hint}
          </p>
          <div className="mt-8 rounded-2xl bg-white/95 p-6 shadow-lg">
            <UrlAuditForm
              url={url}
              onUrlChange={setUrl}
              onSubmit={handleSubmit}
              usageLabel={usageLabel}
              idPrefix="gmc-bottom"
            />
          </div>
        </div>
      </section>

      <RelatedSeoLinks
        relatedTools={['shopify-gmc', 'woocommerce-gmc', 'seo']}
        relatedGuides={Object.keys(SEO_GUIDE_LINKS)}
      />
      </div>
    </>
  )
}
