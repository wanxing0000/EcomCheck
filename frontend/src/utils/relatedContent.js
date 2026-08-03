import {
  SEO_BLOG_POSTS,
  SEO_GUIDE_LINKS,
  SEO_GUIDE_PAGES,
  SEO_LANDING_PAGES,
  SEO_TOOL_LINKS,
  resolveGuideCategories,
  resolveRelatedGuides,
  resolveRelatedTools,
} from '../data/seoPages.js'
import { GMC_CONTENT_ROADMAP, SEO_CONTENT_STATUS, getRoadmapEntry } from '../data/seoContentRoadmap.js'

const PRIORITY_WEIGHT = { high: 3, medium: 2, low: 1 }

function scoreGuideCandidate(source, guideSlug, roadmapEntry) {
  if (guideSlug === source.slug) return -1

  let score = 0

  if (source.relatedGuides?.includes(guideSlug)) score += 100
  if (roadmapEntry?.status === SEO_CONTENT_STATUS.published) score += 10
  score += PRIORITY_WEIGHT[roadmapEntry?.priority] || 1

  const sourceCategories = resolveGuideCategories(source)
  const targetPage = SEO_GUIDE_PAGES[guideSlug]
  const targetCategories = resolveGuideCategories(targetPage || { categories: roadmapEntry?.categories })

  const sharedCategories = sourceCategories.filter((cat) => targetCategories.includes(cat))
  score += sharedCategories.length * 8

  if (source.relatedAudit && targetPage?.relatedAudit === source.relatedAudit) score += 5
  if (source.relatedAudit && roadmapEntry?.relatedAudit === source.relatedAudit) score += 3

  return score
}

function scoreToolCandidate(source, toolId) {
  let score = 0

  if (source.relatedTools?.includes(toolId)) score += 100

  const roadmapMatch = GMC_CONTENT_ROADMAP.find(
    (entry) => entry.slug === toolId && entry.status === SEO_CONTENT_STATUS.published,
  )
  if (roadmapMatch) score += 10
  score += PRIORITY_WEIGHT[roadmapMatch?.priority] || 1

  if (source.relatedAudit === 'gmc' && ['gmc', 'shopify-gmc', 'woocommerce-gmc'].includes(toolId)) score += 5
  if (source.relatedAudit === 'seo' && toolId === 'seo') score += 5

  const sourceCategories = resolveGuideCategories(source)
  if (sourceCategories.includes('Shopify') && toolId === 'shopify-gmc') score += 8
  if (sourceCategories.includes('WooCommerce') && toolId === 'woocommerce-gmc') score += 8

  return score
}

function rankGuideSlugs(source, candidateSlugs, limit) {
  return candidateSlugs
    .map((slug) => ({
      slug,
      score: scoreGuideCandidate(source, slug, getRoadmapEntry(slug)),
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.slug)
}

function rankToolIds(source, limit) {
  const toolIds = Object.keys(SEO_TOOL_LINKS).filter((id) => !SEO_TOOL_LINKS[id].comingSoon)

  return toolIds
    .map((id) => ({ id, score: scoreToolCandidate(source, id) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.id)
}

/**
 * Recommend related tools and guides for a content document.
 */
export function getRelatedContentRecommendations(source, { toolLimit = 3, guideLimit = 3 } = {}) {
  if (!source) {
    return { tools: [], guides: [], source: null }
  }

  const explicitToolIds = source.relatedTools || []
  const explicitGuideSlugs = source.relatedGuides || []

  const allGuideSlugs = [
    ...new Set([
      ...explicitGuideSlugs,
      ...Object.keys(SEO_GUIDE_PAGES),
      ...GMC_CONTENT_ROADMAP.filter(
        (entry) => entry.contentType === 'guide' && entry.status === SEO_CONTENT_STATUS.published,
      ).map((entry) => entry.slug),
    ]),
  ]

  const rankedGuideSlugs = rankGuideSlugs(source, allGuideSlugs, guideLimit)
  const mergedGuideSlugs = [...new Set([...explicitGuideSlugs, ...rankedGuideSlugs])].slice(0, guideLimit)

  const rankedToolIds = rankToolIds(source, toolLimit)
  const mergedToolIds = [...new Set([...explicitToolIds, ...rankedToolIds])]
    .filter((id) => !SEO_TOOL_LINKS[id]?.comingSoon)
    .slice(0, toolLimit)

  return {
    source: source.slug,
    tools: resolveRelatedTools(mergedToolIds),
    guides: resolveRelatedGuides(mergedGuideSlugs),
  }
}

/**
 * Broader related published content list (tools + guides + roadmap matches).
 */
export function getRelatedPublishedContent(source, { limit = 6 } = {}) {
  const recommendations = getRelatedContentRecommendations(source, {
    toolLimit: Math.ceil(limit / 2),
    guideLimit: Math.ceil(limit / 2),
  })

  const items = [
    ...recommendations.tools.map((tool) => ({ type: 'tool', ...tool })),
    ...recommendations.guides.map((guide) => ({ type: 'guide', ...guide })),
  ]

  const sourceCategories = resolveGuideCategories(source)
  const extras = GMC_CONTENT_ROADMAP.filter(
    (entry) =>
      entry.status === SEO_CONTENT_STATUS.published &&
      entry.slug !== source.slug &&
      entry.categories?.some((cat) => sourceCategories.includes(cat)),
  )
    .slice(0, 2)
    .map((entry) => ({
      type: entry.contentType,
      id: entry.slug,
      label: entry.keyword,
      description: `${entry.intent} · ${entry.priority} priority`,
      path: entry.path || SEO_LANDING_PAGES[entry.slug]?.path,
    }))
    .filter((item) => item.path)

  return [...items, ...extras].slice(0, limit)
}

export function resolveContentPlan(slug) {
  const roadmap = getRoadmapEntry(slug)

  return {
    roadmap,
    published: Boolean(SEO_GUIDE_PAGES[slug] || SEO_LANDING_PAGES[slug] || SEO_BLOG_POSTS[slug]),
    document: SEO_GUIDE_PAGES[slug] || SEO_LANDING_PAGES[slug] || SEO_BLOG_POSTS[slug] || null,
  }
}
