/**
 * Product Page Discovery — detect likely product URLs from crawled internal links.
 * Presentation/discovery layer only; does not modify compliance rules.
 */

import { discoverProductCandidates, scoreProductUrl } from './productScorer.js'

const MAX_DISCOVERY_RESULTS = 50

/** Additional positive URL patterns beyond productScorer */
const EXTRA_URL_POSITIVE = [
  { pattern: /\/p\/[^/?#]+/i, score: 26, signal: '/p/', reason: 'Matched /p/ pattern' },
]

/** Non-product page patterns (blog, policy, navigation hubs) */
const NON_PRODUCT_PATTERNS = [
  { pattern: /\/blog(?:\/|$)/i, reason: 'Blog page' },
  { pattern: /\/news(?:\/|$)/i, reason: 'News/blog page' },
  { pattern: /\/articles?(?:\/|$)/i, reason: 'Article page' },
  { pattern: /\/privacy(?:-policy)?(?:\/|$)/i, reason: 'Privacy policy page' },
  { pattern: /\/refund(?:-policy)?(?:\/|$)/i, reason: 'Refund policy page' },
  { pattern: /\/return(?:-policy)?(?:\/|$)/i, reason: 'Return policy page' },
  { pattern: /\/shipping(?:-policy)?(?:\/|$)/i, reason: 'Shipping policy page' },
  { pattern: /\/payment(?:-policy)?(?:\/|$)/i, reason: 'Payment policy page' },
  { pattern: /\/terms(?:-of-service|-and-conditions)?(?:\/|$)/i, reason: 'Terms page' },
  { pattern: /\/about(?:-us)?(?:\/|$)/i, reason: 'About page' },
  { pattern: /\/contact(?:-us)?(?:\/|$)/i, reason: 'Contact page' },
  { pattern: /\/faq(?:\/|$)/i, reason: 'FAQ page' },
  { pattern: /\/cart(?:\/|$)/i, reason: 'Cart page' },
  { pattern: /\/checkout(?:\/|$)/i, reason: 'Checkout page' },
  { pattern: /\/account(?:\/|$)/i, reason: 'Account page' },
  { pattern: /\/category(?:\/|$)/i, reason: 'Category page' },
  { pattern: /\/categories(?:\/|$)/i, reason: 'Category page' },
  { pattern: /\/collections\/?$/i, reason: 'Collection listing page' },
]

const PLATFORM_URL_HINTS = {
  shopify: [
    { pattern: /\/products\/[^/?#]+/i, signal: 'Shopify /products/ pattern', boost: 4 },
    { pattern: /\/collections\/[^/?#]+\/products\/[^/?#]+/i, signal: 'Shopify collection product URL', boost: 4 },
  ],
  woocommerce: [
    { pattern: /\/product\/[^/?#]+/i, signal: 'WooCommerce /product/ pattern', boost: 4 },
    { pattern: /\/product-category\//i, signal: 'WooCommerce category (excluded)', boost: -100 },
  ],
  wordpress: [{ pattern: /\/shop\/[^/?#]+/i, signal: 'WordPress shop product URL', boost: 2 }],
}

const HTML_SIGNAL_WEIGHTS = {
  schema: { points: 35, label: 'Product schema present' },
  price: { points: 15, label: 'Price detected' },
  addToCart: { points: 15, label: 'Add-to-cart button detected' },
  availability: { points: 10, label: 'Availability detected' },
  productName: { points: 8, label: 'Product name detected' },
}

const MAX_RAW_SCORE = 95

export function normalizeProductPageUrl(url) {
  if (!url || typeof url !== 'string') return ''
  try {
    const parsed = new URL(url)
    parsed.hash = ''
    const path = parsed.pathname.replace(/\/+$/, '') || '/'
    return `${parsed.origin}${path}${parsed.search}`
  } catch {
    return url.trim()
  }
}

function matchNonProductPage(url) {
  let pathname = ''
  try {
    pathname = new URL(url).pathname
  } catch {
    return null
  }

  for (const entry of NON_PRODUCT_PATTERNS) {
    if (entry.pattern.test(pathname) || entry.pattern.test(url)) {
      return entry.reason
    }
  }

  return null
}

function scoreExtraUrlPatterns(url) {
  let pathname = ''
  try {
    pathname = new URL(url).pathname
  } catch {
    return null
  }

  for (const entry of EXTRA_URL_POSITIVE) {
    if (entry.pattern.test(pathname) || entry.pattern.test(url)) {
      return {
        urlScore: entry.score,
        urlSignals: [entry.signal],
        reason: entry.reason,
      }
    }
  }

  return null
}

function applyPlatformHints(url, platform, urlScore, urlSignals, reason) {
  const platformName = platform?.name?.toLowerCase?.()
  const hints = PLATFORM_URL_HINTS[platformName] || []
  let score = urlScore
  const signals = [...urlSignals]
  let primaryReason = reason

  for (const hint of hints) {
    if (!hint.pattern.test(url)) continue
    if (hint.boost <= -50) return null
    score += hint.boost
    if (hint.signal && !signals.includes(hint.signal)) signals.push(hint.signal)
    if (!primaryReason) primaryReason = hint.signal
  }

  return { urlScore: score, urlSignals: signals, reason: primaryReason }
}

function evaluateProductUrl(url, platform) {
  const excludedReason = matchNonProductPage(url)
  if (excludedReason) return null

  let evaluation = scoreProductUrl(url)
  if (evaluation.excluded) {
    const extra = scoreExtraUrlPatterns(url)
    if (!extra) return null
    evaluation = { ...extra, excluded: false }
  }

  const reason =
    evaluation.urlSignals?.length > 0
      ? `Matched ${evaluation.urlSignals[0]} pattern`
      : 'Matched product URL pattern'

  const withPlatform = applyPlatformHints(url, platform, evaluation.urlScore, evaluation.urlSignals || [], reason)
  if (!withPlatform) return null

  return withPlatform
}

function normalizeConfidence(rawScore) {
  const clamped = Math.max(0, Math.min(rawScore, MAX_RAW_SCORE))
  return Math.round((clamped / MAX_RAW_SCORE) * 100) / 100
}

export function getConfidenceTier(score) {
  if (score >= 0.7) return 'high'
  if (score >= 0.4) return 'medium'
  return 'low'
}

function buildHtmlSignalEntries(pageScore = {}) {
  const entries = []
  const signals = pageScore.signals || {}

  if (signals.schema) entries.push(HTML_SIGNAL_WEIGHTS.schema)
  if (signals.price) entries.push(HTML_SIGNAL_WEIGHTS.price)
  if (signals.addToCart) entries.push(HTML_SIGNAL_WEIGHTS.addToCart)
  if (signals.availability) entries.push(HTML_SIGNAL_WEIGHTS.availability)

  const productName = pageScore.products?.find?.((item) => item?.name)?.name
  if (productName) entries.push(HTML_SIGNAL_WEIGHTS.productName)

  return entries
}

function buildDiscoveryEntry(url, evaluation, pageScore = null) {
  let rawScore = evaluation.urlScore
  const signals = [...(evaluation.urlSignals || [])]
  let reason = evaluation.reason || 'Matched product URL pattern'

  if (pageScore) {
    for (const entry of buildHtmlSignalEntries(pageScore)) {
      rawScore += entry.points
      signals.push(entry.label)
    }

    if ((pageScore.htmlScore ?? 0) > 0 && signals.length === evaluation.urlSignals?.length) {
      signals.push('Product page HTML signals')
    }

    if (pageScore.signals?.schema && !reason.includes('schema')) {
      reason = 'Product schema increases confidence'
    }
  }

  const score = normalizeConfidence(rawScore)

  return {
    url,
    score,
    confidence: getConfidenceTier(score),
    reason,
    signals: [...new Set(signals)],
  }
}

function buildSummary(productPages) {
  return {
    total: productPages.length,
    highConfidence: productPages.filter((page) => page.confidence === 'high').length,
    mediumConfidence: productPages.filter((page) => page.confidence === 'medium').length,
    lowConfidence: productPages.filter((page) => page.confidence === 'low').length,
  }
}

/**
 * Discover likely product pages from crawled internal links.
 * @param {{
 *   links?: Array<{ url: string, isInternal?: boolean }>,
 *   platform?: { name?: string|null }|null,
 *   pageScores?: Array<{ url: string, signals?: object, htmlScore?: number, products?: object[] }>,
 *   maxResults?: number,
 * }} input
 */
export function discoverProductPages({
  links = [],
  platform = null,
  pageScores = [],
  maxResults = MAX_DISCOVERY_RESULTS,
} = {}) {
  const pageScoreByUrl = new Map(
    (pageScores || []).map((entry) => [normalizeProductPageUrl(entry.url), entry])
  )

  const seen = new Set()
  const productPages = []

  for (const link of links || []) {
    if (!link?.url || link.isInternal === false) continue

    const normalized = normalizeProductPageUrl(link.url)
    if (!normalized || seen.has(normalized)) continue

    const evaluation = evaluateProductUrl(link.url, platform)
    if (!evaluation) continue

    seen.add(normalized)
    productPages.push(buildDiscoveryEntry(link.url, evaluation, pageScoreByUrl.get(normalized) || null))
  }

  // Include URL-scored candidates that may not appear in the primary links array ordering
  for (const candidate of discoverProductCandidates(links || [])) {
    const normalized = normalizeProductPageUrl(candidate.url)
    if (!normalized || seen.has(normalized)) continue

    const evaluation = evaluateProductUrl(candidate.url, platform)
    if (!evaluation) continue

    seen.add(normalized)
    productPages.push(
      buildDiscoveryEntry(candidate.url, evaluation, pageScoreByUrl.get(normalized) || null)
    )
  }

  productPages.sort((a, b) => b.score - a.score)

  const limited = productPages.slice(0, maxResults)

  return {
    productPages: limited,
    summary: buildSummary(limited),
  }
}

export { MAX_DISCOVERY_RESULTS, NON_PRODUCT_PATTERNS, EXTRA_URL_POSITIVE }
