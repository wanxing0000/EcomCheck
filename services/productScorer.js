import { extractProductsFromHtml } from './adsDetect.js'
import * as cheerio from 'cheerio'

const MAX_SCORE_CANDIDATES = 20

const URL_POSITIVE = [
  { pattern: /\/product\/[^/?#]+/i, score: 30, signal: '/product/' },
  { pattern: /\/products\/[^/?#]+/i, score: 30, signal: '/products/' },
  { pattern: /\/item\/[^/?#]+/i, score: 25, signal: '/item/' },
  { pattern: /\/collections\/[^/?#]+\/products\/[^/?#]+/i, score: 30, signal: '/collections/.../products/' },
]

const URL_NEGATIVE = [
  /\/product-category(?:\/|$)/i,
  /\/product-tag(?:\/|$)/i,
  /\/products\/?$/i,
  /\/product\/?$/i,
  /\/product-updates(?:\/|$)/i,
  /\/shop\/?$/i,
  /\/collections\/?$/i,
]

const ADD_TO_CART_PATTERNS = [
  { pattern: /single_add_to_cart_button/i, label: 'woocommerce:single_add_to_cart_button' },
  { pattern: /add-to-cart/i, label: 'woocommerce:add-to-cart' },
  { pattern: /add_to_cart/i, label: 'woocommerce:add_to_cart' },
  { pattern: /product-form/i, label: 'shopify:product-form' },
  { pattern: /name=["']add-to-cart["']/i, label: 'add-to-cart-field' },
  { pattern: />\s*add to cart\s*</i, label: 'text:add-to-cart' },
]

const BUY_NOW_PATTERNS = [
  { pattern: /buy.itnow/i, label: 'buy-it-now' },
  { pattern: /buy_now/i, label: 'buy_now' },
  { pattern: />\s*buy now\s*</i, label: 'text:buy-now' },
  { pattern: /shopify-payment-button/i, label: 'shopify:payment-button' },
]

/**
 * Score a URL path without fetching HTML.
 * @param {string} url
 */
export function scoreProductUrl(url) {
  let pathname
  try {
    pathname = new URL(url).pathname
  } catch {
    return { urlScore: 0, urlSignals: [], excluded: true }
  }

  for (const pattern of URL_NEGATIVE) {
    if (pattern.test(pathname) || pattern.test(url)) {
      return { urlScore: 0, urlSignals: [], excluded: true }
    }
  }

  let urlScore = 0
  const urlSignals = []

  for (const { pattern, score, signal } of URL_POSITIVE) {
    if (pattern.test(pathname) || pattern.test(url)) {
      urlScore = Math.max(urlScore, score)
      urlSignals.push(signal)
      break
    }
  }

  return { urlScore, urlSignals, excluded: urlScore === 0 }
}

function detectHtmlCartSignals(html) {
  const cartSignals = []
  const buySignals = []

  for (const { pattern, label } of ADD_TO_CART_PATTERNS) {
    if (pattern.test(html)) cartSignals.push(label)
  }

  for (const { pattern, label } of BUY_NOW_PATTERNS) {
    if (pattern.test(html)) buySignals.push(label)
  }

  return {
    addToCart: cartSignals.length > 0,
    buyNow: buySignals.length > 0,
    addToCartSignals: cartSignals,
    buyNowSignals: buySignals,
  }
}

function detectJsonLdCurrency(html) {
  return /priceCurrency|"currency"\s*:\s*"[A-Z]{3}"/i.test(html)
}

function parseDisplayPriceString(str) {
  if (!str) return null
  const cleaned = String(str).replace(/[^\d.,]/g, '').replace(/,/g, '')
  const num = parseFloat(cleaned)
  return Number.isFinite(num) ? num : null
}

/**
 * Extract visible product price from HTML (for schema comparison).
 * @param {string} html
 */
export function extractDisplayPrice(html) {
  const $ = cheerio.load(html)
  const candidates = []

  $('[itemprop="price"]').each((_, el) => {
    const value = $(el).attr('content') || $(el).text()
    const price = parseDisplayPriceString(value)
    if (price != null) candidates.push(price)
  })

  $('meta[property="product:price:amount"]').each((_, el) => {
    const price = parseDisplayPriceString($(el).attr('content'))
    if (price != null) candidates.push(price)
  })

  $('.woocommerce-Price-amount, .woocommerce-Price-amount bdi').each((_, el) => {
    const price = parseDisplayPriceString($(el).text())
    if (price != null) candidates.push(price)
  })

  $('[data-product-price], .product__price, .price__regular, .price-item--regular').each((_, el) => {
    const price = parseDisplayPriceString($(el).attr('data-product-price') || $(el).text())
    if (price != null) candidates.push(price)
  })

  return candidates.length > 0 ? candidates[0] : null
}

function buildPriceConsistency(html, products) {
  const best = products.find((p) => p.valid) || products[0]
  const schemaPrice = best?.values?.price ?? null
  const currency = best?.values?.currency ?? null
  const displayPrice = extractDisplayPrice(html)

  if (schemaPrice == null && displayPrice == null) {
    return { schemaPrice: null, displayPrice: null, currency, consistent: null, checked: false }
  }

  if (schemaPrice == null || displayPrice == null) {
    return {
      schemaPrice,
      displayPrice,
      currency,
      consistent: null,
      checked: true,
      note: schemaPrice == null ? 'schema price missing' : 'display price not detected',
    }
  }

  const consistent = Math.abs(schemaPrice - displayPrice) < 0.02

  return {
    schemaPrice,
    displayPrice,
    currency,
    consistent,
    checked: true,
    difference: Math.abs(schemaPrice - displayPrice),
  }
}

/**
 * Score a fetched product page using URL + HTML signals.
 * @param {string} html
 * @param {string} url
 */
export function scoreProductPage(html, url) {
  const urlResult = scoreProductUrl(url)

  if (urlResult.excluded) {
    return {
      score: 0,
      urlScore: 0,
      htmlScore: 0,
      excluded: true,
      signals: {
        schema: false,
        price: false,
        currency: false,
        availability: false,
        addToCart: false,
        buyNow: false,
      },
      urlSignals: [],
      htmlSignals: [],
      products: [],
    }
  }

  const products = extractProductsFromHtml(html)
  const cart = detectHtmlCartSignals(html)
  const best = products.find((p) => p.valid) || products[0]
  const priceConsistency = buildPriceConsistency(html, products)

  const signals = {
    schema: products.length > 0,
    price: Boolean(best?.fields?.price) || /woocommerce-Price-amount|itemprop=["']price["']/i.test(html),
    currency: detectJsonLdCurrency(html),
    availability: Boolean(best?.fields?.availability) || /itemprop=["']availability["']/i.test(html),
    addToCart: cart.addToCart,
    buyNow: cart.buyNow,
  }

  let htmlScore = 0
  const htmlSignals = []

  if (signals.schema) {
    htmlScore += 35
    htmlSignals.push('Product JSON-LD')
  }
  if (signals.price) {
    htmlScore += 15
    htmlSignals.push('price')
  }
  if (signals.currency) {
    htmlScore += 10
    htmlSignals.push('currency')
  }
  if (signals.availability) {
    htmlScore += 10
    htmlSignals.push('availability')
  }
  if (signals.addToCart) {
    htmlScore += 15
    htmlSignals.push(...cart.addToCartSignals)
  }
  if (signals.buyNow) {
    htmlScore += 5
    htmlSignals.push(...cart.buyNowSignals)
  }

  return {
    score: urlResult.urlScore + htmlScore,
    urlScore: urlResult.urlScore,
    htmlScore,
    excluded: false,
    signals,
    urlSignals: urlResult.urlSignals,
    htmlSignals,
    products,
    priceConsistency,
  }
}

/**
 * Discover internal link URLs that look like product page candidates.
 * @param {Array<{ url: string, path?: string, isInternal?: boolean }>} links
 */
export function discoverProductCandidates(links) {
  const seen = new Set()
  const candidates = []

  for (const link of links) {
    if (!link.isInternal) continue

    const urlResult = scoreProductUrl(link.url)
    if (urlResult.excluded) continue
    if (seen.has(link.url)) continue

    seen.add(link.url)
    candidates.push({
      url: link.url,
      urlScore: urlResult.urlScore,
      urlSignals: urlResult.urlSignals,
    })
  }

  return candidates.sort((a, b) => b.urlScore - a.urlScore)
}

export { MAX_SCORE_CANDIDATES }
