import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Card from '../components/Card'
import RelatedSeoLinks from '../components/RelatedSeoLinks'
import SeoBreadcrumbs from '../components/SeoBreadcrumbs'
import SeoMetadata from '../components/SeoMetadata'
import SeoStructuredData from '../components/SeoStructuredData'
import { SEO_AUDIT_PRODUCT, getAuditProductForMode } from '../data/auditProducts.js'
import { SEO_AUDIT_TOOL_PAGES } from '../data/seoPages.js'
import {
  buildBreadcrumbListSchema,
  buildSoftwareApplicationSchema,
  compactSchemaList,
} from '../utils/seoStructuredData.js'

const SEO_SCOPE = [
  'Title',
  'Meta Description',
  'H1',
  'Schema',
  'Sitemap',
  'Robots',
  'Crawlability',
]

export default function SeoAudit() {
  const navigate = useNavigate()
  const location = useLocation()
  const [url, setUrl] = useState(location.state?.url || '')

  function handleSubmit(e) {
    e.preventDefault()
    const trimmed = url.trim()
    if (!trimmed) return

    navigate('/scan', {
      state: {
        url: trimmed,
        mode: 'seo',
        auditProduct: getAuditProductForMode('seo'),
      },
    })
  }

  const toolPage = SEO_AUDIT_TOOL_PAGES.seo
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
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
        <SeoBreadcrumbs items={toolPage.breadcrumbs} />

      <div className="mt-8">
        <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">
          {SEO_AUDIT_PRODUCT.name}
        </p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
          SEO Health Audit
        </h1>
        <p className="mt-4 text-base leading-relaxed text-gray-600">
          Analyze your website SEO health and find optimization opportunities.
        </p>
        <p className="mt-3 text-sm font-medium text-blue-700">Free · Unlimited scans</p>
      </div>

      <Card className="mt-8 border-blue-100">
        <h2 className="text-sm font-semibold text-gray-900">Detection scope</h2>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {SEO_SCOPE.map((item) => (
            <li key={item} className="flex items-center gap-2 text-sm text-gray-700">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
              {item}
            </li>
          ))}
        </ul>
      </Card>

      <Card className="mt-6">
        <form onSubmit={handleSubmit}>
          <label htmlFor="seo-audit-url" className="block text-sm font-medium text-gray-900">
            Store URL
          </label>
          <p className="mt-1 text-sm text-gray-500">
            We will analyze homepage on-page and technical SEO signals.
          </p>
          <input
            id="seo-audit-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://your-store.com"
            required
            className="mt-4 w-full rounded-lg border border-gray-300 bg-white py-3 px-4 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
          <Button type="submit" size="lg" className="mt-6 w-full sm:w-auto">
            Start SEO Health Audit
          </Button>
        </form>
      </Card>
      </div>

      <RelatedSeoLinks relatedTools={['gmc', 'shopify-gmc', 'woocommerce-gmc']} relatedGuides={[]} />
    </>
  )
}
