import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Badge from '../components/Badge'
import Card from '../components/Card'
import SectionHeader from '../components/SectionHeader'
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

const heroStats = [
  { label: 'GMC audits', value: '1/day free', accent: 'success' },
  { label: 'SEO audits', value: 'Unlimited', accent: 'brand' },
  { label: 'Product checks', value: 'Included', accent: 'muted' },
]

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
      <section className="relative overflow-hidden bg-white">
        <div className="hero-glow">
          <div className="absolute inset-0 bg-gradient-to-b from-emerald-50/70 via-white to-slate-50" />
          <div className="absolute left-1/2 top-0 h-[520px] w-[900px] -translate-x-1/2 rounded-full bg-gradient-to-r from-emerald-100/60 to-brand-100/40 blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl px-4 py-20 text-center sm:px-6 sm:py-28 lg:px-8">
          <Badge variant="success" size="lg" dot className="mb-6">
            {GMC_AUDIT_PRODUCT.name} — Core Product
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl lg:leading-[1.1]">
            Pass Google Merchant Center{' '}
            <span className="gradient-text">before you launch ads</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600">
            {GMC_LANDING.hero.subtitle} SEO Health Audit remains free and unlimited as your growth entry.
          </p>

          <div className="mx-auto mt-8 flex max-w-2xl flex-wrap items-center justify-center gap-2">
            <Badge variant="success">{GMC_AUDIT_PRODUCT.name}</Badge>
            <Badge variant="brand">{SEO_AUDIT_PRODUCT.name} · Free</Badge>
          </div>

          <div className="mx-auto mt-10 grid max-w-3xl grid-cols-1 gap-3 sm:grid-cols-3">
            {heroStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-gray-200/80 bg-white/80 px-4 py-3 shadow-sm backdrop-blur-sm"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{stat.label}</p>
                <p className="mt-1 text-lg font-bold text-gray-900">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mx-auto mt-10 max-w-xl">
            <Button
              variant="success"
              size="lg"
              className="w-full sm:w-auto"
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
      <section id="choose-audit" className="section-padding border-t border-gray-200/80 bg-slate-50">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            kicker="Audit Tools"
            title="Free Ecommerce Audit Tools"
            description="Start with GMC compliance or free SEO health. Platform-specific GMC pages and guides help you grow organic traffic before programmatic content scales."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {[gmcOption, seoOption].filter(Boolean).map((option, index) => (
              <Link
                key={option.mode}
                to={option.mode === 'gmc' ? '/audit/gmc' : '/audit/seo'}
                className={`group h-full ${index === 0 ? 'md:order-1' : 'md:order-2'}`}
              >
                <Card
                  hover
                  variant={option.mode === 'gmc' ? 'accent' : 'elevated'}
                  className={`flex h-full flex-col ${
                    option.mode === 'gmc' ? 'ring-2 ring-emerald-100' : ''
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={option.mode === 'gmc' ? 'success' : 'brand'}>{option.name}</Badge>
                      {option.badge && (
                        <Badge variant="muted" size="sm">
                          {option.badge}
                        </Badge>
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
              <Card hover variant="elevated" className="h-full">
                <Badge variant="success" size="sm" className="mb-3">
                  Platform
                </Badge>
                <p className="text-base font-semibold text-gray-900 group-hover:text-emerald-700">
                  Shopify GMC Audit
                </p>
                <p className="mt-1 text-sm text-gray-500">GMC compliance scan for Shopify storefronts</p>
              </Card>
            </Link>
            <Link to="/audit/woocommerce-gmc" className="group">
              <Card hover variant="elevated" className="h-full">
                <Badge variant="success" size="sm" className="mb-3">
                  Platform
                </Badge>
                <p className="text-base font-semibold text-gray-900 group-hover:text-emerald-700">
                  WooCommerce GMC Audit
                </p>
                <p className="mt-1 text-sm text-gray-500">GMC compliance scan for WooCommerce stores</p>
              </Card>
            </Link>
          </div>

          <div className="mt-12">
            <SectionHeader kicker="Future" title="Coming Soon" align="center" className="max-w-xl" />
            <div className="mt-8 grid gap-6 md:grid-cols-2">
              {FUTURE_AUDIT_OPTIONS.map((option) => (
                <Card key={option.id} variant="muted" className="border-dashed opacity-90">
                  <div className="flex items-start justify-between gap-3">
                    <Badge variant="muted">{option.name}</Badge>
                    <Badge variant="muted" size="sm">
                      Coming soon
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm leading-relaxed text-gray-500">{option.tagline}</p>
                </Card>
              ))}
            </div>
          </div>

          <div className="mt-12">
            <SectionHeader kicker="Resources" title="GMC Guides" align="center" className="max-w-xl" />
            <ul className="mx-auto mt-6 flex max-w-3xl flex-wrap justify-center gap-3">
              {Object.values(SEO_GUIDE_LINKS).map((guide) => (
                <li key={guide.id}>
                  <Link to={guide.path}>
                    <Badge variant="muted" size="lg" className="hover:border-emerald-300 hover:text-emerald-800">
                      {guide.label}
                    </Badge>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Proof points */}
      <section className="section-padding bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <SectionHeader
            title="Stop guessing. Start fixing."
            description="AuditPilot turns a manual checklist into an actionable audit your whole team can use."
          />

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {proofPoints.map((point, index) => (
              <Card key={point.title} hover variant="elevated">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-sm font-bold text-brand-700">
                  {index + 1}
                </span>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{point.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{point.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="section-padding-sm pb-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <Card variant="accent" padding="lg" className="overflow-hidden border-0 bg-gradient-to-br from-emerald-600 to-emerald-700 text-white shadow-lg">
            <div className="text-center">
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
            </div>
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
