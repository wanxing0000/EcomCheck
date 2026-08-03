import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Button from './Button'
import Card from './Card'
import RelatedSeoLinks from './RelatedSeoLinks'
import SeoBreadcrumbs from './SeoBreadcrumbs'
import SeoMetadata from './SeoMetadata'
import SeoStructuredData from './SeoStructuredData'
import { getAuditProductForMode } from '../data/auditProducts.js'
import { getLandingBreadcrumbs } from '../data/seoPages.js'
import {
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildSoftwareApplicationSchema,
  compactSchemaList,
} from '../utils/seoStructuredData.js'
import { fetchUsageStatus, formatUsageLabel } from '../utils/usageLimit.js'

function CheckIcon() {
  return (
    <svg className="h-5 w-5 shrink-0 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

export default function SeoLandingPage({ page }) {
  const navigate = useNavigate()
  const [url, setUrl] = useState('')
  const [usage, setUsage] = useState(null)
  const auditMode = page.relatedAudit || 'gmc'
  const breadcrumbs = getLandingBreadcrumbs(page)

  useEffect(() => {
    if (auditMode === 'gmc') {
      fetchUsageStatus('gmc').then(setUsage)
    }
  }, [auditMode])

  const structuredData = useMemo(
    () =>
      compactSchemaList([
        buildSoftwareApplicationSchema({
          name: page.h1,
          description: page.metaDescription,
          path: page.path,
        }),
        buildFaqPageSchema(page.faq?.items),
        buildBreadcrumbListSchema(breadcrumbs),
      ]),
    [page, breadcrumbs],
  )

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    navigate('/scan', {
      state: {
        url: trimmed,
        mode: auditMode,
        auditProduct: getAuditProductForMode(auditMode),
      },
    })
  }

  const usageLabel = auditMode === 'gmc' && usage ? formatUsageLabel(usage) : null
  const accent = auditMode === 'seo' ? 'blue' : 'emerald'

  return (
    <>
      <SeoMetadata
        title={page.title}
        description={page.metaDescription}
        keywords={page.keywords}
        canonicalPath={page.path}
      />
      <SeoStructuredData schemas={structuredData} />

      <div>
        <section
          className={`relative overflow-hidden border-b ${
            accent === 'emerald'
              ? 'border-emerald-100 bg-gradient-to-b from-emerald-50/70 to-white'
              : 'border-blue-100 bg-gradient-to-b from-blue-50/70 to-white'
          }`}
        >
          <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20 lg:px-8">
            <SeoBreadcrumbs items={breadcrumbs} />
            <div className="mt-6 text-center">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl lg:text-5xl">{page.h1}</h1>
              <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-gray-600">{page.hero?.subtitle}</p>

              <form onSubmit={handleSubmit} className="mx-auto mt-10 max-w-xl text-left">
                <label htmlFor={`${page.slug}-url`} className="sr-only">
                  Store URL
                </label>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    id={`${page.slug}-url`}
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://your-store.com"
                    required
                    className={`w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 ${
                      accent === 'emerald'
                        ? 'focus:border-emerald-500 focus:ring-emerald-500/20'
                        : 'focus:border-blue-500 focus:ring-blue-500/20'
                    }`}
                  />
                  <Button
                    type="submit"
                    size="lg"
                    className={`whitespace-nowrap ${
                      accent === 'emerald' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-blue-600 hover:bg-blue-700'
                    }`}
                  >
                    {page.hero?.cta || 'Start Free Audit'}
                  </Button>
                </div>
                {usageLabel && <p className="mt-3 text-sm text-emerald-700">{usageLabel}</p>}
                {page.hero?.urlHint && <p className="mt-2 text-xs text-gray-400">{page.hero.urlHint}</p>}
              </form>
            </div>
          </div>
        </section>

        {page.problem && (
          <section className="py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-2xl">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">{page.problem.title}</h2>
                {page.problem.subtitle && <p className="mt-3 text-gray-600">{page.problem.subtitle}</p>}
              </div>
              <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                {page.problem.items.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-lg border border-gray-100 bg-white p-4 shadow-sm">
                    <CheckIcon />
                    <span className="text-sm text-gray-700">{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {page.platformContext && (
          <section className="border-t border-gray-100 bg-white py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <div className="max-w-3xl">
                <h2 className="text-2xl font-bold tracking-tight text-gray-900">{page.platformContext.title}</h2>
                <p className="mt-3 text-gray-600">{page.platformContext.intro}</p>
                {page.platformContext.paragraphs?.map((paragraph) => (
                  <p key={paragraph} className="mt-4 text-sm leading-relaxed text-gray-700">
                    {paragraph}
                  </p>
                ))}
              </div>
              {page.platformContext.checklist?.length > 0 && (
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                  {page.platformContext.checklist.map((item) => (
                    <li key={item} className="rounded-lg border border-emerald-100 bg-emerald-50/40 px-4 py-3 text-sm text-gray-700">
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        )}

        {page.features && (
          <section className="border-t border-gray-100 bg-gray-50/50 py-16">
            <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">{page.features.title}</h2>
              <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {page.features.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {page.workflow?.steps?.length > 0 && (
          <section className="py-16">
            <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">{page.workflow.title}</h2>
              <ol className="mt-8 space-y-6">
                {page.workflow.steps.map((step, index) => (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                      {index + 1}
                    </span>
                    <div>
                      <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-600">{step.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        )}

        <section className="border-t border-gray-100 py-16">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Card
              className={`border-0 text-white ${
                accent === 'emerald'
                  ? 'bg-gradient-to-br from-emerald-600 to-emerald-700'
                  : 'bg-gradient-to-br from-blue-600 to-blue-700'
              }`}
            >
              <h2 className="text-xl font-bold sm:text-2xl">
                {page.auditCta?.title || 'Ready to scan your store?'}
              </h2>
              <p className="mt-3 max-w-lg text-sm opacity-90">
                {page.auditCta?.body ||
                  `Enter your URL above or open the main ${auditMode === 'gmc' ? 'GMC' : 'SEO'} audit page for the full product experience.`}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  className="border-0 bg-white text-gray-900 hover:bg-gray-50"
                  onClick={() => document.getElementById(`${page.slug}-url`)?.focus()}
                >
                  {page.hero?.cta || 'Start Free Audit'}
                </Button>
                <Link
                  to={auditMode === 'gmc' ? '/audit/gmc' : '/audit/seo'}
                  className="inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  Open full audit page →
                </Link>
              </div>
            </Card>
          </div>
        </section>

        {page.faq?.items?.length > 0 && (
          <section className="border-t border-gray-100 bg-white py-16">
            <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900">{page.faq.title}</h2>
              <dl className="mt-8 space-y-6">
                {page.faq.items.map((item) => (
                  <div key={item.q} className="rounded-lg border border-gray-100 bg-gray-50/50 p-5">
                    <dt className="text-sm font-semibold text-gray-900">{item.q}</dt>
                    <dd className="mt-2 text-sm leading-relaxed text-gray-600">{item.a}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>
        )}

        <RelatedSeoLinks relatedTools={page.relatedTools} relatedGuides={page.relatedGuides} />
      </div>
    </>
  )
}
