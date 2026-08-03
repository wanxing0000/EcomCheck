/**
 * GMC / ecommerce SEO content roadmap — planning layer (no database).
 * Links target keywords to content types, audit products, and publish status.
 */

export const SEO_CONTENT_INTENTS = {
  commercial: 'commercial',
  informational: 'informational',
  transactional: 'transactional',
}

export const SEO_CONTENT_TYPES = {
  guide: 'guide',
  blog: 'blog',
  landing: 'landing',
}

export const SEO_CONTENT_PRIORITIES = {
  high: 'high',
  medium: 'medium',
  low: 'low',
}

export const SEO_CONTENT_STATUS = {
  published: 'published',
  planned: 'planned',
  draft: 'draft',
}

/** @typedef {import('./seoPages.js').SeoContentCategoryId} SeoContentCategoryId */

/**
 * GMC-focused content roadmap.
 * Published entries must match a slug in SEO_GUIDE_PAGES, SEO_LANDING_PAGES, or SEO_BLOG_POSTS.
 */
export const GMC_CONTENT_ROADMAP = [
  {
    slug: 'google-merchant-center-requirements',
    keyword: 'google merchant center requirements',
    intent: SEO_CONTENT_INTENTS.informational,
    contentType: SEO_CONTENT_TYPES.guide,
    relatedAudit: 'gmc',
    categories: ['GMC', 'Ecommerce'],
    priority: SEO_CONTENT_PRIORITIES.high,
    status: SEO_CONTENT_STATUS.published,
    path: '/guides/google-merchant-center-requirements',
  },
  {
    slug: 'google-merchant-center-misrepresentation',
    keyword: 'google merchant center misrepresentation',
    intent: SEO_CONTENT_INTENTS.informational,
    contentType: SEO_CONTENT_TYPES.guide,
    relatedAudit: 'gmc',
    categories: ['GMC', 'Ecommerce'],
    priority: SEO_CONTENT_PRIORITIES.high,
    status: SEO_CONTENT_STATUS.published,
    path: '/guides/google-merchant-center-misrepresentation',
  },
  {
    slug: 'google-merchant-center-suspension',
    keyword: 'google merchant center suspension',
    intent: SEO_CONTENT_INTENTS.commercial,
    contentType: SEO_CONTENT_TYPES.guide,
    relatedAudit: 'gmc',
    categories: ['GMC', 'Ecommerce'],
    priority: SEO_CONTENT_PRIORITIES.high,
    status: SEO_CONTENT_STATUS.published,
    path: '/guides/google-merchant-center-suspension',
  },
  {
    slug: 'shopify-gmc',
    keyword: 'shopify google merchant center audit',
    intent: SEO_CONTENT_INTENTS.commercial,
    contentType: SEO_CONTENT_TYPES.landing,
    relatedAudit: 'gmc',
    categories: ['GMC', 'Shopify'],
    priority: SEO_CONTENT_PRIORITIES.high,
    status: SEO_CONTENT_STATUS.published,
    path: '/audit/shopify-gmc',
  },
  {
    slug: 'woocommerce-gmc',
    keyword: 'woocommerce google merchant center audit',
    intent: SEO_CONTENT_INTENTS.commercial,
    contentType: SEO_CONTENT_TYPES.landing,
    relatedAudit: 'gmc',
    categories: ['GMC', 'WooCommerce'],
    priority: SEO_CONTENT_PRIORITIES.high,
    status: SEO_CONTENT_STATUS.published,
    path: '/audit/woocommerce-gmc',
  },
  {
    slug: 'shopify-gmc-return-policy',
    keyword: 'shopify gmc return policy requirements',
    intent: SEO_CONTENT_INTENTS.informational,
    contentType: SEO_CONTENT_TYPES.guide,
    relatedAudit: 'gmc',
    categories: ['GMC', 'Shopify', 'Ecommerce'],
    priority: SEO_CONTENT_PRIORITIES.medium,
    status: SEO_CONTENT_STATUS.planned,
  },
  {
    slug: 'woocommerce-gmc-product-schema',
    keyword: 'woocommerce gmc product schema mismatch',
    intent: SEO_CONTENT_INTENTS.informational,
    contentType: SEO_CONTENT_TYPES.guide,
    relatedAudit: 'gmc',
    categories: ['GMC', 'WooCommerce', 'Ecommerce'],
    priority: SEO_CONTENT_PRIORITIES.medium,
    status: SEO_CONTENT_STATUS.planned,
  },
  {
    slug: 'gmc-price-consistency-guide',
    keyword: 'google merchant center price mismatch fix',
    intent: SEO_CONTENT_INTENTS.informational,
    contentType: SEO_CONTENT_TYPES.guide,
    relatedAudit: 'gmc',
    categories: ['GMC', 'Ecommerce'],
    priority: SEO_CONTENT_PRIORITIES.medium,
    status: SEO_CONTENT_STATUS.planned,
  },
  {
    slug: 'ecommerce-seo-audit-checklist',
    keyword: 'ecommerce seo audit checklist',
    intent: SEO_CONTENT_INTENTS.commercial,
    contentType: SEO_CONTENT_TYPES.blog,
    relatedAudit: 'seo',
    categories: ['SEO', 'Ecommerce'],
    priority: SEO_CONTENT_PRIORITIES.medium,
    status: SEO_CONTENT_STATUS.planned,
  },
]

export function getRoadmapEntry(slug) {
  return GMC_CONTENT_ROADMAP.find((entry) => entry.slug === slug) || null
}

export function getRoadmapByStatus(status) {
  return GMC_CONTENT_ROADMAP.filter((entry) => entry.status === status)
}

export function getRoadmapByCategory(categoryId) {
  return GMC_CONTENT_ROADMAP.filter((entry) => entry.categories?.includes(categoryId))
}

export function getRoadmapByPriority(priority) {
  return GMC_CONTENT_ROADMAP.filter((entry) => entry.priority === priority)
}

export function getPublishedRoadmap() {
  return getRoadmapByStatus(SEO_CONTENT_STATUS.published)
}

export function getPlannedRoadmap() {
  return getRoadmapByStatus(SEO_CONTENT_STATUS.planned)
}

/** Map published roadmap slugs to registry content type */
export function getRoadmapContentType(slug) {
  return getRoadmapEntry(slug)?.contentType || null
}
