const MAX_PRODUCT_PAGES = 5
const DEFAULT_PAGE_TIMEOUT_MS = 10_000
const USER_AGENT = 'EcomCheck/0.3 (Website Audit Bot)'

const PRODUCT_PATH_PATTERNS = [
  /\/products\/[^/?#]+/i,
  /\/product\/[^/?#]+/i,
  /\/collections\/[^/?#]+\/products\/[^/?#]+/i,
]

const PRODUCT_PATH_LOOSE = /\/product/i

const PRODUCT_TEXT_PATTERNS = [
  /\bproduct\b/i,
  /\bbuy\b/i,
  /\bshop\b/i,
  /add to cart/i,
  /add-to-cart/i,
]

function scoreProductLink(link) {
  let score = 0
  const path = link.path || ''

  for (const pattern of PRODUCT_PATH_PATTERNS) {
    if (pattern.test(path) || pattern.test(link.url)) {
      score += 10
      break
    }
  }

  if (score === 0 && PRODUCT_PATH_LOOSE.test(path)) {
    score += 5
  }

  for (const pattern of PRODUCT_TEXT_PATTERNS) {
    if (pattern.test(link.text || '')) {
      score += 2
      break
    }
  }

  if (/\/collections\//i.test(path) && !/\/products\//i.test(path)) {
    score -= 5
  }

  return score
}

/**
 * Discover candidate product page URLs from crawled links.
 * @param {Array<{ url: string, path?: string, text?: string, isInternal?: boolean }>} links
 * @param {number} [maxPages]
 */
export function discoverProductUrls(links, maxPages = MAX_PRODUCT_PAGES) {
  const seen = new Set()
  const candidates = []

  for (const link of links) {
    if (!link.isInternal) continue

    const score = scoreProductLink(link)
    if (score <= 0) continue
    if (seen.has(link.url)) continue

    seen.add(link.url)
    candidates.push({ url: link.url, score })
  }

  return candidates
    .sort((a, b) => b.score - a.score)
    .slice(0, maxPages)
    .map(({ url }) => url)
}

async function fetchPageHtml(url, timeout) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })

    if (!response.ok) {
      return { error: `HTTP ${response.status}`, finalUrl: url }
    }

    const html = await response.text()
    return { html, finalUrl: response.url || url }
  } catch (err) {
    const message =
      err.name === 'AbortError' ? 'Request timed out' : err.message || 'Fetch failed'
    return { error: message, finalUrl: url }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Scan product pages and extract Product JSON-LD.
 * @param {Array} links - Links from homepage crawl
 * @param {{ maxPages?: number, timeout?: number, extractProducts: (html: string) => import('./adsDetect.js').ProductAnalysis[] }} options
 */
export async function scanProductPages(links, options = {}) {
  const maxPages = options.maxPages ?? MAX_PRODUCT_PAGES
  const timeout = options.timeout ?? DEFAULT_PAGE_TIMEOUT_MS
  const extractProducts = options.extractProducts

  if (!extractProducts) {
    throw new Error('extractProducts function is required')
  }

  const urls = discoverProductUrls(links, maxPages)

  if (urls.length === 0) {
    return {
      productPages: [],
      audit: {
        scannedPages: 0,
        productPages: [],
        detectedProducts: 0,
        validProducts: 0,
        missingFields: [],
      },
    }
  }

  const results = await Promise.all(
    urls.map(async (url) => {
      const fetchResult = await fetchPageHtml(url, timeout)

      if (fetchResult.error || !fetchResult.html) {
        return {
          url,
          fetched: false,
          error: fetchResult.error,
          products: [],
          hasProductSchema: false,
          valid: false,
          missingFields: [],
        }
      }

      const products = extractProducts(fetchResult.html)
      const best = products[0]
      const hasProductSchema = products.length > 0
      const valid = products.some((p) => p.valid)

      const missingFields = [
        ...new Set(products.flatMap((p) => p.missingRequired || [])),
      ]

      return {
        url: fetchResult.finalUrl || url,
        fetched: true,
        error: null,
        products,
        hasProductSchema,
        valid,
        missingFields,
        productName: best?.name || null,
      }
    })
  )

  const detectedProducts = results.reduce(
    (sum, page) => sum + (page.products?.length || 0),
    0
  )
  const validProducts = results.reduce(
    (sum, page) => sum + (page.products?.filter((p) => p.valid).length || 0),
    0
  )
  const missingFields = [
    ...new Set(results.flatMap((page) => page.missingFields || [])),
  ]

  return {
    productPages: results,
    audit: {
      scannedPages: results.length,
      productPages: results.map(({ url, fetched, hasProductSchema, valid, missingFields: mf, error }) => ({
        url,
        fetched,
        hasProductSchema,
        valid,
        missingFields: mf,
        error,
      })),
      detectedProducts,
      validProducts,
      missingFields,
    },
  }
}
