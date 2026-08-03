import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import SeoArticleLayout from '../../components/seo/SeoArticleLayout'
import SeoMetadata from '../../components/SeoMetadata'
import SeoStructuredData from '../../components/SeoStructuredData'
import { SEO_AUDIT_TOOL_PAGES, getSeoBlogPost } from '../../data/seoPages.js'
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildSoftwareApplicationSchema,
  compactSchemaList,
} from '../../utils/seoStructuredData.js'

export default function BlogPost() {
  const { slug } = useParams()
  const post = slug ? getSeoBlogPost(slug) : null

  if (!post) {
    return (
      <>
        <SeoMetadata title="Blog post not found" noIndex />
        <div className="mx-auto max-w-3xl px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-gray-900">Post not found</h1>
          <p className="mt-2 text-sm text-gray-500">
            Blog posts are registered in <code className="text-xs">SEO_BLOG_POSTS</code> inside{' '}
            <code className="text-xs">seoPages.js</code>.
          </p>
          <Link to="/blog" className="mt-6 inline-block text-brand-600 hover:text-brand-700">
            ← Back to blog
          </Link>
        </div>
      </>
    )
  }

  const auditMode = post.relatedAudit || 'gmc'
  const auditPath = auditMode === 'seo' ? '/audit/seo' : '/audit/gmc'

  const structuredData = useMemo(
    () =>
      compactSchemaList([
        buildArticleSchema({
          title: post.title,
          description: post.description,
          path: post.path,
          datePublished: post.publishedAt,
        }),
        buildSoftwareApplicationSchema({
          name: SEO_AUDIT_TOOL_PAGES[auditMode]?.name || 'AuditPilot Audit',
          description: post.description,
          path: auditPath,
        }),
        buildBreadcrumbListSchema(post.breadcrumbs),
        buildFaqPageSchema(post.faq?.items),
      ]),
    [post, auditMode, auditPath],
  )

  return (
    <>
      <SeoMetadata
        title={post.title}
        description={post.description}
        keywords={post.keywords}
        canonicalPath={post.path}
        ogType="article"
      />
      <SeoStructuredData schemas={structuredData} />
      <SeoArticleLayout page={post} categoryLabel="Blog" />
    </>
  )
}
