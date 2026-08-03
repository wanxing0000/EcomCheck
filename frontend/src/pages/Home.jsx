import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import RelatedSeoLinks from '../components/RelatedSeoLinks'
import SeoMetadata from '../components/SeoMetadata'
import {
  FUTURE_AUDIT_OPTIONS,
  GMC_AUDIT_PRODUCT,
  GMC_LANDING,
  HERO_GMC_CTA,
  MAIN_AUDIT_OPTIONS,
  SEO_AUDIT_PRODUCT,
} from '../data/auditProducts.js'
import { SEO_GUIDE_LINKS, SEO_SITE } from '../data/seoPages.js'
import { fetchUsageStatus, formatUsageLabel } from '../utils/usageLimit.js'
import { trackClickGmcAudit } from '../lib/analytics.js'

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
  const [gmcUsage, setGmcUsage] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    fetchUsageStatus('gmc').then(setGmcUsage)
  }, [])

  const gmcOption = MAIN_AUDIT_OPTIONS.find((option) => option.mode === 'gmc')
  const seoOption = MAIN_AUDIT_OPTIONS.find((option) => option.mode === 'seo')

  return (
    <div>
      <SeoMetadata
        title={SEO_SITE.defaultTitle}
        description={SEO_SITE.defaultDescription}
        canonicalPath="/"
      />

      {/* Hero — routes to GMC product page */}
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
            {GMC_AUDIT_PRODUCT.name} — Core Product
          </div>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl">
            Pass Google Merchant Center{' '}
            <span className="gradient-text">before you launch ads</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            {GMC_LANDING.hero.subtitle} SEO Health Audit remains free and unlimited as your growth entry.
          </p>

          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 shadow-sm">
              {GMC_AUDIT_PRODUCT.name}
            </span>
            <span className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800 shadow-sm">
              {SEO_AUDIT_PRODUCT.name} · Free
            </span>
          </div>

          <div className="mx-auto mt-10 max-w-xl">
            <Button
              size="lg"
              className="w-full bg-emerald-600 hover:bg-emerald-700 sm:w-auto"
              onClick={() => {
                trackClickGmcAudit('home_hero')
                navigate(GMC_AUDIT_PRODUCT.landingPath)
              }}
            >
              {HERO_GMC_CTA.label}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Button>
            <p className="mt-3 text-sm text-gray-500">
              {formatUsageLabel(gmcUsage)} · {HERO_GMC_CTA.hint}
            </p>
          </div>
        </div>
      </section>

      {/* Free Ecommerce Audit Tools */}
      <section id="choose-audit" className="border-t border-gray-100 bg-gray-50/50 py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Audit Tools</p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
              Free Ecommerce Audit Tools
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-gray-600">
              Start with GMC compliance or free SEO health. Platform-specific GMC pages and guides help you grow organic
              traffic before programmatic content scales.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {[gmcOption, seoOption].filter(Boolean).map((option, index) => (
              <Link
                key={option.mode}
                to={option.mode === 'gmc' ? '/audit/gmc' : '/audit/seo'}
                className={`group h-full ${index === 0 ? 'md:order-1' : 'md:order-2'}`}
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
                    Open {option.name} →
                  </p>
                </Card>
              </Link>
            ))}
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Link to="/audit/shopify-gmc" className="group">
              <Card hover className="h-full group-hover:border-emerald-300">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700">
                  Shopify GMC Audit
                </p>
                <p className="mt-1 text-xs text-gray-500">GMC compliance scan for Shopify storefronts</p>
              </Card>
            </Link>
            <Link to="/audit/woocommerce-gmc" className="group">
              <Card hover className="h-full group-hover:border-emerald-300">
                <p className="text-sm font-semibold text-gray-900 group-hover:text-emerald-700">
                  WooCommerce GMC Audit
                </p>
                <p className="mt-1 text-xs text-gray-500">GMC compliance scan for WooCommerce stores</p>
              </Card>
            </Link>
          </div>

          <div className="mt-10">
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-gray-500">Future</p>
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

          <div className="mt-10">
            <p className="text-center text-sm font-semibold uppercase tracking-wide text-gray-500">GMC Guides</p>
            <ul className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-3">
              {Object.values(SEO_GUIDE_LINKS).map((guide) => (
                <li key={guide.id}>
                  <Link
                    to={guide.path}
                    className="inline-flex rounded-full border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:border-emerald-300 hover:text-emerald-800"
                  >
                    {guide.label}
                  </Link>
                </li>
              ))}
            </ul>
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
              AuditPilot turns a manual checklist into an actionable audit your whole team can use.
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
              Open the GMC product page to see features, free quota, and start your compliance scan.
            </p>
            <Button
              variant="secondary"
              size="lg"
              className="mt-8 border-0 bg-white text-emerald-700 hover:bg-emerald-50"
              onClick={() => {
                trackClickGmcAudit('home_hero')
                navigate(GMC_AUDIT_PRODUCT.landingPath)
              }}
            >
              {HERO_GMC_CTA.label}
            </Button>
          </Card>
        </div>
      </section>

      <RelatedSeoLinks
        relatedTools={['gmc', 'seo', 'shopify-gmc', 'woocommerce-gmc']}
        relatedGuides={Object.keys(SEO_GUIDE_LINKS)}
      />
    </div>
  )
}
