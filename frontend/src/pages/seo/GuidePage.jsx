import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import SeoArticleLayout from '../../components/seo/SeoArticleLayout'
import SeoMetadata from '../../components/SeoMetadata'
import SeoStructuredData from '../../components/SeoStructuredData'
import { SEO_AUDIT_TOOL_PAGES, getSeoGuidePage } from '../../data/seoPages.js'
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildSoftwareApplicationSchema,
  compactSchemaList,
} from '../../utils/seoStructuredData.js'

export default function GuidePage() {
  const { slug } = useParams()
  const page = slug ? getSeoGuidePage(slug) : null

  if (!page) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <SeoMetadata title="Guide not found" noIndex />
        <h1 className="text-2xl font-bold text-gray-900">Guide not found</h1>
        <Link to="/" className="mt-4 inline-block text-brand-600 hover:text-brand-700">
          Back to home
        </Link>
      </div>
    )
  }

  const auditMode = page.relatedAudit || 'gmc'
  const auditPath = auditMode === 'seo' ? '/audit/seo' : '/audit/gmc'

  const structuredData = useMemo(
    () =>
      compactSchemaList([
        buildArticleSchema({
          title: page.title,
          description: page.description,
          path: page.path,
        }),
        buildSoftwareApplicationSchema({
          name: SEO_AUDIT_TOOL_PAGES[auditMode]?.name || 'EcomCheck Audit',
          description: page.description,
          path: auditPath,
        }),
        buildBreadcrumbListSchema(page.breadcrumbs),
        buildFaqPageSchema(page.faq?.items),
      ]),
    [page, auditMode, auditPath],
  )

  return (
    <>
      <SeoMetadata
        title={page.title}
        description={page.description}
        keywords={page.keywords}
        canonicalPath={page.path}
        ogType="article"
      />
      <SeoStructuredData schemas={structuredData} />
      <SeoArticleLayout page={page} />
    </>
  )
}
