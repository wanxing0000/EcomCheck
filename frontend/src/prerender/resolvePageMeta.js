import {
  SEO_AUDIT_TOOL_PAGES,
  SEO_BLOG_INDEX,
  SEO_GUIDE_PAGES,
  SEO_LANDING_PAGES,
  SEO_SITE,
  formatSeoTitle,
  getGuideBreadcrumbs,
  getLandingBreadcrumbs,
} from '../data/seoPages.js'
import {
  buildArticleSchema,
  buildBreadcrumbListSchema,
  buildFaqPageSchema,
  buildSoftwareApplicationSchema,
  compactSchemaList,
} from '../utils/seoStructuredData.js'

function findGuideByPath(path) {
  return Object.values(SEO_GUIDE_PAGES).find((page) => page.path === path) || null
}

function findLandingByPath(path) {
  return Object.values(SEO_LANDING_PAGES).find((page) => page.path === path) || null
}

/**
 * Resolve head metadata + JSON-LD for a prerendered route (mirrors client SeoMetadata + SeoStructuredData).
 * @param {string} path
 */
export function buildPageMeta(path) {
  if (path === '/') {
    return {
      title: SEO_SITE.defaultTitle,
      description: SEO_SITE.defaultDescription,
      keywords: [],
      canonicalPath: '/',
      ogType: 'website',
      schemas: [],
    }
  }

  if (path === SEO_AUDIT_TOOL_PAGES.gmc.path) {
    const page = SEO_AUDIT_TOOL_PAGES.gmc
    return {
      title: formatSeoTitle(page.title),
      description: page.metaDescription,
      keywords: page.keywords,
      canonicalPath: page.path,
      ogType: 'website',
      schemas: compactSchemaList([
        buildSoftwareApplicationSchema({
          name: page.name,
          description: page.metaDescription,
          path: page.path,
        }),
        buildBreadcrumbListSchema(page.breadcrumbs),
      ]),
    }
  }

  if (path === SEO_AUDIT_TOOL_PAGES.seo.path) {
    const page = SEO_AUDIT_TOOL_PAGES.seo
    return {
      title: formatSeoTitle(page.title),
      description: page.metaDescription,
      keywords: page.keywords,
      canonicalPath: page.path,
      ogType: 'website',
      schemas: compactSchemaList([
        buildSoftwareApplicationSchema({
          name: page.name,
          description: page.metaDescription,
          path: page.path,
        }),
        buildBreadcrumbListSchema(page.breadcrumbs),
      ]),
    }
  }

  const landing = findLandingByPath(path)
  if (landing) {
    const breadcrumbs = getLandingBreadcrumbs(landing)
    return {
      title: formatSeoTitle(landing.title),
      description: landing.metaDescription,
      keywords: landing.keywords,
      canonicalPath: landing.path,
      ogType: 'website',
      schemas: compactSchemaList([
        buildSoftwareApplicationSchema({
          name: landing.h1,
          description: landing.metaDescription,
          path: landing.path,
        }),
        buildFaqPageSchema(landing.faq?.items),
        buildBreadcrumbListSchema(breadcrumbs),
      ]),
    }
  }

  const guide = findGuideByPath(path)
  if (guide) {
    const auditMode = guide.relatedAudit || 'gmc'
    const auditPath = auditMode === 'seo' ? SEO_AUDIT_TOOL_PAGES.seo.path : SEO_AUDIT_TOOL_PAGES.gmc.path
    const breadcrumbs = getGuideBreadcrumbs(guide)
    const description = guide.description || guide.metaDescription
    return {
      title: formatSeoTitle(guide.title),
      description,
      keywords: guide.keywords,
      canonicalPath: guide.path,
      ogType: 'article',
      schemas: compactSchemaList([
        buildArticleSchema({
          title: guide.title,
          description,
          path: guide.path,
        }),
        buildSoftwareApplicationSchema({
          name: SEO_AUDIT_TOOL_PAGES[auditMode]?.name || 'EcomCheck Audit',
          description,
          path: auditPath,
        }),
        buildBreadcrumbListSchema(breadcrumbs),
        buildFaqPageSchema(guide.faq?.items),
      ]),
    }
  }

  if (path === SEO_BLOG_INDEX.path) {
    return {
      title: formatSeoTitle(SEO_BLOG_INDEX.title),
      description: SEO_BLOG_INDEX.metaDescription,
      keywords: [],
      canonicalPath: SEO_BLOG_INDEX.path,
      ogType: 'website',
      schemas: compactSchemaList([
        buildBreadcrumbListSchema([
          { label: 'Home', path: '/' },
          { label: SEO_BLOG_INDEX.h1, path: SEO_BLOG_INDEX.path },
        ]),
      ]),
    }
  }

  return null
}

export function buildHeadInjection(meta) {
  if (!meta) return ''

  const origin = SEO_SITE.baseUrl
  const canonicalUrl = `${origin}${meta.canonicalPath}`
  const ogImage = `${origin}${SEO_SITE.ogImagePath || '/favicon.svg'}`

  const lines = [
    `<meta name="description" content="${escapeAttr(meta.description)}" />`,
    `<meta name="robots" content="index, follow" />`,
    meta.keywords?.length
      ? `<meta name="keywords" content="${escapeAttr(meta.keywords.join(', '))}" />`
      : '',
    `<link rel="canonical" href="${escapeAttr(canonicalUrl)}" />`,
    `<meta property="og:site_name" content="${escapeAttr(SEO_SITE.name)}" />`,
    `<meta property="og:title" content="${escapeAttr(meta.title)}" />`,
    `<meta property="og:description" content="${escapeAttr(meta.description)}" />`,
    `<meta property="og:type" content="${escapeAttr(meta.ogType || 'website')}" />`,
    `<meta property="og:url" content="${escapeAttr(canonicalUrl)}" />`,
    `<meta property="og:locale" content="${escapeAttr(SEO_SITE.locale)}" />`,
    `<meta property="og:image" content="${escapeAttr(ogImage)}" />`,
    `<meta name="twitter:card" content="summary" />`,
    `<meta name="twitter:title" content="${escapeAttr(meta.title)}" />`,
    `<meta name="twitter:description" content="${escapeAttr(meta.description)}" />`,
    `<meta name="twitter:url" content="${escapeAttr(canonicalUrl)}" />`,
    `<meta name="twitter:image" content="${escapeAttr(ogImage)}" />`,
  ].filter(Boolean)

  if (meta.schemas?.length) {
    lines.push(
      `<script type="application/ld+json">${JSON.stringify(meta.schemas.length === 1 ? meta.schemas[0] : meta.schemas)}</script>`,
    )
  }

  return lines.join('\n    ')
}

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
}
