import {
  discoverProductCandidates,
  scoreProductPage,
  MAX_SCORE_CANDIDATES,
} from './productScorer.js'

const MAX_PRODUCT_PAGES = 5
const DEFAULT_PAGE_TIMEOUT_MS = 10_000
const USER_AGENT = 'EcomCheck/0.3 (Website Audit Bot)'

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

function buildEmptyAudit(candidateCount = 0) {
  return {
    candidateCount,
    scannedPages: 0,
    pageScores: [],
    productPages: [],
    detectedProducts: 0,
    validProducts: 0,
    missingFields: [],
    summary: {
      withSchema: 0,
      withPrice: 0,
      withAddToCart: 0,
    },
  }
}

/**
 * Scan product pages: discover → score → rank → top N deep scan.
 * @param {Array} links - Links from homepage crawl
 * @param {{ maxPages?: number, timeout?: number, extractProducts?: Function }} options
 */
export async function scanProductPages(links, options = {}) {
  const maxPages = options.maxPages ?? MAX_PRODUCT_PAGES
  const timeout = options.timeout ?? DEFAULT_PAGE_TIMEOUT_MS

  const candidates = discoverProductCandidates(links)
  const candidateCount = candidates.length

  if (candidateCount === 0) {
    return { productPages: [], audit: buildEmptyAudit(0) }
  }

  const toScore = candidates.slice(0, MAX_SCORE_CANDIDATES)

  const scoredPages = await Promise.all(
    toScore.map(async (candidate) => {
      const fetchResult = await fetchPageHtml(candidate.url, timeout)

      if (fetchResult.error || !fetchResult.html) {
        return {
          url: candidate.url,
          fetched: false,
          error: fetchResult.error,
          score: candidate.urlScore,
          urlScore: candidate.urlScore,
          htmlScore: 0,
          signals: {
            schema: false,
            price: false,
            currency: false,
            availability: false,
            addToCart: false,
            buyNow: false,
          },
          urlSignals: candidate.urlSignals,
          htmlSignals: [],
          products: [],
          selected: false,
        }
      }

      const scored = scoreProductPage(fetchResult.html, fetchResult.finalUrl || candidate.url)

      return {
        url: fetchResult.finalUrl || candidate.url,
        fetched: true,
        error: null,
        ...scored,
        selected: false,
      }
    })
  )

  scoredPages.sort((a, b) => b.score - a.score)

  const selected = scoredPages.filter((p) => p.score > 0).slice(0, maxPages)
  selected.forEach((p) => {
    p.selected = true
  })

  const productPages = selected.map((page) => {
    const products = page.products || []
    const hasProductSchema = products.length > 0
    const valid = products.some((p) => p.valid)
    const missingFields = [...new Set(products.flatMap((p) => p.missingRequired || []))]

    return {
      url: page.url,
      fetched: page.fetched,
      error: page.error,
      score: page.score,
      signals: page.signals,
      hasProductSchema,
      valid,
      missingFields,
      products,
      productName: products[0]?.name || null,
      priceConsistency: page.priceConsistency || null,
    }
  })

  const detectedProducts = productPages.reduce(
    (sum, page) => sum + (page.products?.length || 0),
    0
  )
  const validProducts = productPages.reduce(
    (sum, page) => sum + (page.products?.filter((p) => p.valid).length || 0),
    0
  )
  const missingFields = [...new Set(productPages.flatMap((page) => page.missingFields || []))]

  const pageScores = scoredPages.map((page) => ({
    url: page.url,
    score: page.score,
    urlScore: page.urlScore,
    htmlScore: page.htmlScore,
    fetched: page.fetched,
    selected: page.selected,
    error: page.error,
    signals: page.signals,
    urlSignals: page.urlSignals,
    htmlSignals: page.htmlSignals,
  }))

  return {
    productPages,
    audit: {
      candidateCount,
      scannedPages: productPages.length,
      pageScores,
      productPages: productPages.map(
        ({ url, fetched, hasProductSchema, valid, missingFields, error, score, signals, products, priceConsistency }) => ({
          url,
          fetched,
          hasProductSchema,
          valid,
          missingFields,
          error,
          score,
          signals,
          priceConsistency,
          schemas: (products || []).map((p) => ({
            name: p.name,
            fields: p.fields,
            values: p.values,
            missingRequired: p.missingRequired,
            missingRecommended: p.missingRecommended,
            valid: p.valid,
          })),
        })
      ),
      detectedProducts,
      validProducts,
      missingFields,
      summary: {
        withSchema: productPages.filter((p) => p.signals?.schema).length,
        withPrice: productPages.filter((p) => p.signals?.price).length,
        withAddToCart: productPages.filter((p) => p.signals?.addToCart).length,
      },
    },
  }
}

/** @deprecated Use discoverProductCandidates from productScorer.js */
export function discoverProductUrls(links, maxPages = MAX_PRODUCT_PAGES) {
  return discoverProductCandidates(links)
    .slice(0, maxPages)
    .map((c) => c.url)
}
