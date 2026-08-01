import { extractContactInfo, mergeContactInfo, parsePageContent, analyzeReturnPolicyQuality, getBodyTextFromHtml } from './pageContent.js'
import { detectAdsData } from './adsDetect.js'
import { scanProductPages } from './productCrawler.js'
import * as cheerio from 'cheerio'

export const CrawlerErrorCode = {
  INVALID_URL: 'INVALID_URL',
  UNREACHABLE: 'UNREACHABLE',
  TIMEOUT: 'TIMEOUT',
}

export class CrawlerError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'CrawlerError'
    this.code = code
  }
}

const DEFAULT_TIMEOUT_MS = 30_000
const PAGE_FETCH_TIMEOUT_MS = 12_000
const MAX_HTML_BYTES = 5 * 1024 * 1024
const USER_AGENT = 'EcomCheck/0.3 (Website Audit Bot)'

const PAGE_TYPES = [
  'aboutUs',
  'contactUs',
  'privacyPolicy',
  'refundPolicy',
  'shippingPolicy',
]

const PAGE_PATTERNS = {
  aboutUs: {
    url: [
      /\/about(?:-us|-our-company|-company)?(?:\/|$|\?)/i,
      /\/pages\/about(?:-us)?(?:\/|$|\?)/i,
      /\/our-story(?:\/|$|\?)/i,
      /\/who-we-are(?:\/|$|\?)/i,
      /\/company(?:\/|$|\?)/i,
    ],
    text: [/about\s*us/i, /about\s*our/i, /who\s*we\s*are/i, /our\s*story/i, /our\s*company/i],
  },
  contactUs: {
    url: [
      /\/contact(?:-us|-page)?(?:\/|$|\?)/i,
      /\/pages\/contact(?:-us)?(?:\/|$|\?)/i,
      /\/get-in-touch(?:\/|$|\?)/i,
      /\/support(?:\/|$|\?)/i,
    ],
    text: [/contact\s*us/i, /get\s*in\s*touch/i, /reach\s*us/i, /customer\s*service/i],
  },
  privacyPolicy: {
    url: [
      /\/privacy(?:-policy)?(?:\/|$|\?)/i,
      /\/policies\/privacy(?:-policy)?(?:\/|$|\?)/i,
      /\/pages\/privacy(?:-policy)?(?:\/|$|\?)/i,
      /\/legal\/privacy(?:\/|$|\?)/i,
    ],
    text: [/privacy\s*policy/i, /data\s*protection/i, /cookie\s*policy/i],
  },
  refundPolicy: {
    url: [
      /\/refund[_-]returns?(?:\/|$|\?)/i,
      /\/refund(?:[_-]policy)?(?:\/|$|\?)/i,
      /\/return(?:[_-]policy)?(?:\/|$|\?)/i,
      /\/returns(?:[_-]policy)?(?:\/|$|\?)/i,
      /\/policies\/refund(?:-policy)?(?:\/|$|\?)/i,
      /\/policies\/return(?:-policy)?(?:\/|$|\?)/i,
      /\/pages\/refund(?:-policy)?(?:\/|$|\?)/i,
      /\/money-back(?:\/|$|\?)/i,
    ],
    text: [
      /refund\s*(?:&|and)\s*returns?\s*policy/i,
      /returns?\s*(?:&|and)\s*refunds?\s*policy/i,
      /refund\s*policy/i,
      /return\s*policy/i,
      /returns?\s*policy/i,
      /refund\s*(?:&|and)\s*returns?/i,
      /returns?\s*(?:&|and)\s*refunds?/i,
      /money\s*back/i,
    ],
  },
  shippingPolicy: {
    url: [
      /\/shipping(?:-policy|-info|-information)?(?:\/|$|\?)/i,
      /\/policies\/shipping(?:-policy)?(?:\/|$|\?)/i,
      /\/pages\/shipping(?:-policy)?(?:\/|$|\?)/i,
      /\/delivery(?:-policy|-info)?(?:\/|$|\?)/i,
    ],
    text: [/shipping\s*policy/i, /delivery\s*policy/i, /shipping\s*(&|and)\s*delivery/i],
  },
}

const PLATFORM_SIGNATURES = {
  shopify: [
    { pattern: /cdn\.shopify\.com/i, weight: 3 },
    { pattern: /shopify\.theme/i, weight: 3 },
    { pattern: /Shopify\.shop/i, weight: 3 },
    { pattern: /shopify-section/i, weight: 2 },
    { pattern: /\/cart\.js/i, weight: 2 },
    { pattern: /myshopify\.com/i, weight: 3 },
    { pattern: /"platform"\s*:\s*"shopify"/i, weight: 2 },
    { pattern: /<meta[^>]+shopify/i, weight: 2 },
  ],
  woocommerce: [
    { pattern: /woocommerce/i, weight: 3 },
    { pattern: /wp-content\/plugins\/woocommerce/i, weight: 3 },
    { pattern: /class="[^"]*woocommerce/i, weight: 2 },
    { pattern: /wc-add-to-cart/i, weight: 2 },
    { pattern: /\/wc-api\//i, weight: 2 },
  ],
  wordpress: [
    { pattern: /wp-content\//i, weight: 2 },
    { pattern: /wp-includes\//i, weight: 2 },
    { pattern: /\/wp-json\//i, weight: 2 },
    { pattern: /<meta[^>]+name=["']generator["'][^>]+content=["']WordPress/i, weight: 3 },
    { pattern: /wordpress/i, weight: 1 },
  ],
}

function validateUrl(input) {
  if (!input || typeof input !== 'string') {
    throw new CrawlerError(CrawlerErrorCode.INVALID_URL, 'URL is required')
  }

  const trimmed = input.trim()
  if (!trimmed) {
    throw new CrawlerError(CrawlerErrorCode.INVALID_URL, 'URL is required')
  }

  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed
  try {
    parsed = new URL(withProtocol)
  } catch {
    throw new CrawlerError(CrawlerErrorCode.INVALID_URL, 'Invalid URL format')
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new CrawlerError(CrawlerErrorCode.INVALID_URL, 'URL must use http or https protocol')
  }

  if (!parsed.hostname) {
    throw new CrawlerError(CrawlerErrorCode.INVALID_URL, 'Invalid URL hostname')
  }

  return parsed
}

function decodeHtmlEntities(text) {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function extractMetaTag(html, matchers) {
  for (const matcher of matchers) {
    const match = html.match(matcher)
    if (match?.[1]) return decodeHtmlEntities(match[1])
  }
  return ''
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  if (!match) return ''
  return decodeHtmlEntities(match[1])
}

function extractMeta(html) {
  return {
    title: extractTitle(html),
    description: extractMetaTag(html, [
      /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i,
    ]),
    ogTitle: extractMetaTag(html, [
      /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']*)["']/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:title["']/i,
    ]),
    ogDescription: extractMetaTag(html, [
      /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:description["']/i,
    ]),
    ogImage: extractMetaTag(html, [
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']*)["']/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:image["']/i,
    ]),
    ogSiteName: extractMetaTag(html, [
      /<meta[^>]+property=["']og:site_name["'][^>]+content=["']([^"']*)["']/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+property=["']og:site_name["']/i,
    ]),
    canonical: extractMetaTag(html, [
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']*)["']/i,
      /<link[^>]+href=["']([^"']*)["'][^>]+rel=["']canonical["']/i,
    ]),
    viewport: extractMetaTag(html, [
      /<meta[^>]+name=["']viewport["'][^>]+content=["']([^"']*)["']/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']viewport["']/i,
    ]),
    robots: extractMetaTag(html, [
      /<meta[^>]+name=["']robots["'][^>]+content=["']([^"']*)["']/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']robots["']/i,
    ]),
    charset: (() => {
      const match =
        html.match(/<meta[^>]+charset=["']([^"']+)["']/i) ||
        html.match(/<meta[^>]+content=["'][^"']*charset=([^"';]+)/i)
      return match?.[1]?.trim() || ''
    })(),
    generator: extractMetaTag(html, [
      /<meta[^>]+name=["']generator["'][^>]+content=["']([^"']*)["']/i,
      /<meta[^>]+content=["']([^"']*)["'][^>]+name=["']generator["']/i,
    ]),
  }
}

function extractLinks(html, baseUrl) {
  const $ = cheerio.load(html)
  const base = new URL(baseUrl)
  const links = []
  const seen = new Set()

  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').trim()
    if (
      !href ||
      href.startsWith('#') ||
      href.startsWith('javascript:') ||
      href.startsWith('mailto:') ||
      href.startsWith('tel:')
    ) {
      return
    }

    let absolute
    try {
      absolute = new URL(href, base).href
    } catch {
      return
    }

    if (seen.has(absolute)) return
    seen.add(absolute)

    const anchorText = decodeHtmlEntities($(el).text().replace(/\s+/g, ' ').trim())
    const ariaLabel = decodeHtmlEntities(($(el).attr('aria-label') || '').trim())
    const title = decodeHtmlEntities(($(el).attr('title') || '').trim())
    const combinedText = [anchorText, ariaLabel, title].filter(Boolean).join(' ').trim()
    const parsed = new URL(absolute)

    links.push({
      url: absolute,
      text: anchorText || combinedText,
      combinedText: combinedText || anchorText,
      path: parsed.pathname,
      isInternal: parsed.hostname === base.hostname,
      inFooter: $(el).closest('footer, [role="contentinfo"], .site-footer, #footer, .footer').length > 0,
      inNav: $(el).closest('nav, [role="navigation"], .menu, .navigation').length > 0,
    })
  })

  return links
}

function scorePageMatch(pageType, link) {
  const patterns = PAGE_PATTERNS[pageType]
  let score = 0
  let matchedKeyword = null
  const textToMatch = link.combinedText || link.text || ''

  for (const urlPattern of patterns.url) {
    if (urlPattern.test(link.path) || urlPattern.test(link.url)) {
      score += 3
      matchedKeyword = urlPattern.source
      break
    }
  }

  for (const textPattern of patterns.text) {
    if (textPattern.test(textToMatch) || textPattern.test(link.text || '')) {
      score += 2
      matchedKeyword = matchedKeyword || textPattern.source
      break
    }
  }

  if (score > 0 && link.inFooter) {
    score += 1
    matchedKeyword = matchedKeyword || 'footer-link'
  }

  return { score, matchedKeyword }
}

function collectPolicyCandidates(links) {
  const policyTypes = ['privacyPolicy', 'refundPolicy', 'shippingPolicy']
  const candidates = []

  for (const link of links) {
    for (const pageType of policyTypes) {
      const { score, matchedKeyword } = scorePageMatch(pageType, link)
      if (score > 0) {
        candidates.push({
          pageType,
          url: link.url,
          text: (link.combinedText || link.text || '').slice(0, 120),
          matchedKeyword: matchedKeyword || '',
          score,
        })
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score)
}

function classifyPages(links) {
  const pages = {}

  for (const pageType of PAGE_TYPES) {
    let bestMatch = null
    let bestScore = 0
    let bestKeyword = null

    for (const link of links) {
      const { score, matchedKeyword } = scorePageMatch(pageType, link)
      if (score > bestScore) {
        bestScore = score
        bestMatch = link
        bestKeyword = matchedKeyword
      }
    }

    pages[pageType] = {
      found: bestScore > 0,
      url: bestMatch?.url || null,
      confidence: bestScore >= 5 ? 'high' : bestScore >= 3 ? 'medium' : bestScore > 0 ? 'low' : 'none',
      matchedKeyword: bestKeyword,
    }
  }

  return pages
}

const SHOPIFY_POLICY_PATHS = {
  privacyPolicy: '/policies/privacy-policy',
  refundPolicy: '/policies/refund-policy',
  shippingPolicy: '/policies/shipping-policy',
}

const WOOCOMMERCE_POLICY_PATHS = {
  refundPolicy: [
    '/refund_returns/',
    '/refund-returns/',
    '/refund-policy/',
    '/return-policy/',
    '/returns/',
    '/returns-policy/',
  ],
  shippingPolicy: [
    '/shipping-policy/',
    '/shipping-delivery-policy/',
    '/delivery-policy/',
  ],
  privacyPolicy: ['/privacy-policy/', '/privacy/'],
}

async function enrichShopifyPages(pages, origin, timeout) {
  for (const [pageType, path] of Object.entries(SHOPIFY_POLICY_PATHS)) {
    if (pages[pageType]?.found) continue

    const policyUrl = `${origin}${path}`
    const result = await fetchResource(policyUrl, timeout)
    if (result.ok) {
      pages[pageType] = {
        found: true,
        url: result.url || policyUrl,
        confidence: 'high',
      }
    }
  }

  return pages
}

async function enrichWooCommercePages(pages, origin, timeout) {
  for (const [pageType, paths] of Object.entries(WOOCOMMERCE_POLICY_PATHS)) {
    if (pages[pageType]?.found) continue

    for (const path of paths) {
      const policyUrl = `${origin}${path}`
      const result = await fetchResource(policyUrl, timeout)
      if (result.ok) {
        pages[pageType] = {
          found: true,
          url: result.url || policyUrl,
          confidence: 'high',
          matchedKeyword: `woocommerce:${path}`,
        }
        break
      }
    }
  }

  return pages
}

function detectPlatform(html) {
  const scores = { shopify: 0, woocommerce: 0, wordpress: 0 }
  const signals = { shopify: [], woocommerce: [], wordpress: [] }

  for (const [platform, signatures] of Object.entries(PLATFORM_SIGNATURES)) {
    for (const { pattern, weight } of signatures) {
      if (pattern.test(html)) {
        scores[platform] += weight
        signals[platform].push(pattern.source)
      }
    }
  }

  if (scores.shopify >= 3) {
    return { name: 'shopify', confidence: scores.shopify >= 6 ? 'high' : 'medium', signals: signals.shopify }
  }

  if (scores.woocommerce >= 3) {
    return {
      name: 'woocommerce',
      confidence: scores.woocommerce >= 6 ? 'high' : 'medium',
      signals: signals.woocommerce,
      cms: scores.wordpress >= 2 ? 'wordpress' : null,
    }
  }

  if (scores.wordpress >= 3) {
    return { name: 'wordpress', confidence: scores.wordpress >= 5 ? 'high' : 'medium', signals: signals.wordpress }
  }

  return { name: null, confidence: 'none', signals: [] }
}

async function fetchResource(url, timeout) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': USER_AGENT,
        Accept: '*/*',
      },
    })

    return {
      ok: response.ok,
      status: response.status,
      url: response.url,
      contentType: response.headers.get('content-type') || '',
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      return { ok: false, status: 0, url, error: 'timeout' }
    }
    return { ok: false, status: 0, url, error: err.message }
  } finally {
    clearTimeout(timer)
  }
}

async function checkSeoFiles(origin, timeout) {
  const robotsUrl = `${origin}/robots.txt`
  const sitemapCandidates = [
    `${origin}/sitemap.xml`,
    `${origin}/sitemap_index.xml`,
    `${origin}/sitemap-index.xml`,
  ]

  const [robotsResult, ...sitemapResults] = await Promise.all([
    fetchResource(robotsUrl, timeout),
    ...sitemapCandidates.map((url) => fetchResource(url, timeout)),
  ])

  let sitemapResult = sitemapResults.find((r) => r.ok)
  if (!sitemapResult) {
    sitemapResult = sitemapResults[0]
  }

  let sitemapFromRobots = null
  if (robotsResult.ok) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)
      const res = await fetch(robotsUrl, {
        signal: controller.signal,
        headers: { 'User-Agent': USER_AGENT },
      })
      clearTimeout(timer)
      if (res.ok) {
        const text = await res.text()
        const sitemapMatch = text.match(/^Sitemap:\s*(.+)$/im)
        if (sitemapMatch) {
          sitemapFromRobots = sitemapMatch[1].trim()
          const robotsSitemapCheck = await fetchResource(sitemapFromRobots, timeout)
          if (robotsSitemapCheck.ok) {
            sitemapResult = { ...robotsSitemapCheck, url: sitemapFromRobots }
          }
        }
      }
    } catch {
      // ignore robots.txt parse errors
    }
  }

  return {
    robotsTxt: {
      exists: robotsResult.ok,
      url: robotsUrl,
      statusCode: robotsResult.status || null,
    },
    sitemap: {
      exists: sitemapResult?.ok || false,
      url: sitemapResult?.url || sitemapCandidates[0],
      statusCode: sitemapResult?.status || null,
      discoveredFromRobots: Boolean(sitemapFromRobots),
    },
  }
}

async function fetchHtml(url, timeout) {
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
      throw new CrawlerError(
        CrawlerErrorCode.UNREACHABLE,
        `Website returned HTTP ${response.status}`
      )
    }

    const contentType = response.headers.get('content-type') || ''
    if (contentType && !contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      throw new CrawlerError(CrawlerErrorCode.UNREACHABLE, 'URL did not return an HTML page')
    }

    const html = await response.text()

    if (html.length > MAX_HTML_BYTES) {
      throw new CrawlerError(CrawlerErrorCode.UNREACHABLE, 'Page HTML exceeds maximum allowed size')
    }

    return { html, finalUrl: response.url || url }
  } catch (err) {
    if (err instanceof CrawlerError) throw err

    if (err.name === 'AbortError') {
      throw new CrawlerError(
        CrawlerErrorCode.TIMEOUT,
        `Request timed out after ${timeout / 1000} seconds`
      )
    }

    const message =
      err.cause?.code === 'ENOTFOUND'
        ? 'Domain not found'
        : err.cause?.code === 'ECONNREFUSED'
          ? 'Connection refused'
          : err.message || 'Unable to access website'

    throw new CrawlerError(CrawlerErrorCode.UNREACHABLE, message)
  } finally {
    clearTimeout(timer)
  }
}

async function fetchHtmlSafe(url, timeout) {
  try {
    return await fetchHtml(url, timeout)
  } catch (err) {
    return {
      error: err instanceof CrawlerError ? err.message : err.message || 'Fetch failed',
      finalUrl: url,
    }
  }
}

async function fetchKeyPageContents(pages, homepageHtml) {
  const pageContent = {}
  const contactSources = [extractContactInfo(homepageHtml)]
  const htmlCache = new Map()

  const fetchJobs = PAGE_TYPES.map(async (pageType) => {
    const page = pages[pageType]

    if (!page?.found || !page.url) {
      pageContent[pageType] = {
        url: page?.url || null,
        fetched: false,
        title: '',
        h1: '',
        textLength: 0,
        keywords: [],
      }
      return
    }

    let html
    let finalUrl = page.url

    if (htmlCache.has(page.url)) {
      const cached = htmlCache.get(page.url)
      html = cached.html
      finalUrl = cached.finalUrl
    } else {
      const result = await fetchHtmlSafe(page.url, PAGE_FETCH_TIMEOUT_MS)

      if (result.error || !result.html) {
        pageContent[pageType] = {
          url: page.url,
          fetched: false,
          title: '',
          h1: '',
          textLength: 0,
          keywords: [],
          error: result.error,
        }
        return
      }

      html = result.html
      finalUrl = result.finalUrl || page.url
      htmlCache.set(page.url, { html, finalUrl })
    }

    pageContent[pageType] = parsePageContent(html, finalUrl)

    if (pageType === 'refundPolicy') {
      const bodyText = getBodyTextFromHtml(html)
      const pageContact = extractContactInfo(html)
      pageContent[pageType].policyQuality = analyzeReturnPolicyQuality(bodyText, pageContact)
    }

    contactSources.push(extractContactInfo(html))
  })

  await Promise.all(fetchJobs)

  return {
    pageContent,
    contactInfo: mergeContactInfo(contactSources),
  }
}

/**
 * Crawl a URL and perform basic website structure analysis.
 * @param {string} url
 * @param {{ timeout?: number }} [options]
 */
export async function crawl(url, options = {}) {
  const parsed = validateUrl(url)
  const timeout = options.timeout ?? DEFAULT_TIMEOUT_MS
  const origin = parsed.origin

  const { html, finalUrl } = await fetchHtml(parsed.href, timeout)

  const meta = extractMeta(html)
  const allLinks = extractLinks(html, finalUrl)
  const internalLinks = allLinks.filter((l) => l.isInternal)
  const platform = detectPlatform(html)
  const policyCandidates = collectPolicyCandidates(allLinks)
  let pages = classifyPages(allLinks)

  const platformEnrich =
    platform.name === 'shopify'
      ? enrichShopifyPages(pages, origin, Math.min(timeout, 8_000))
      : platform.name === 'woocommerce'
        ? enrichWooCommercePages(pages, origin, Math.min(timeout, 8_000))
        : Promise.resolve(pages)

  const [enrichedPages, seo] = await Promise.all([
    platformEnrich,
    checkSeoFiles(origin, Math.min(timeout, 10_000)),
  ])

  pages = enrichedPages

  const { pageContent, contactInfo } = await fetchKeyPageContents(pages, html)

  const productScan = await scanProductPages(allLinks, {
    maxPages: 5,
    timeout: PAGE_FETCH_TIMEOUT_MS,
  })

  const ads = detectAdsData(html, productScan)

  return {
    url: finalUrl,
    title: meta.title,
    description: meta.description,
    htmlLength: html.length,
    linksCount: allLinks.length,
    platform,
    pages,
    seo,
    meta,
    pageContent,
    contactInfo,
    ads,
    productsAudit: productScan.audit,
    policyCandidates: policyCandidates.map(({ url, text, matchedKeyword }) => ({
      url,
      text,
      matchedKeyword,
    })),
    links: {
      total: allLinks.length,
      internal: internalLinks.length,
      external: allLinks.length - internalLinks.length,
      discovered: internalLinks.slice(0, 20).map(({ url: linkUrl, text, path }) => ({
        url: linkUrl,
        text: text.slice(0, 100),
        path,
      })),
    },
  }
}
