import { extractProductsFromHtml } from './adsDetect.js'
import * as cheerio from 'cheerio'

const MAX_SCORE_CANDIDATES = 20

const URL_POSITIVE = [
  { pattern: /\/product\/[^/?#]+/i, score: 30, signal: '/product/' },
  { pattern: /\/products\/[^/?#]+/i, score: 30, signal: '/products/' },
  { pattern: /\/shop\/[^/?#]+/i, score: 28, signal: '/shop/' },
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
  /\/shop\/page(?:\/|$)/i,
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

const DISPLAY_PRICE_SELECTORS = [
  {
    source: 'itemprop:price',
    type: 'regular',
    run($) {
      const items = []
      $('[itemprop="price"]').each((_, el) => {
        const value = parseDisplayPriceString($(el).attr('content') || $(el).text())
        if (value == null) return
        const currency =
          $(el).closest('[itemprop="offers"]').find('[itemprop="priceCurrency"]').attr('content') ||
          $('[itemprop="priceCurrency"]').first().attr('content') ||
          null
        items.push({ value, currency, source: 'itemprop:price', type: 'regular' })
      })
      return items
    },
  },
  {
    source: 'meta:product:price:amount',
    type: 'regular',
    run($) {
      const items = []
      $('meta[property="product:price:amount"]').each((_, el) => {
        const value = parseDisplayPriceString($(el).attr('content'))
        if (value == null) return
        const currency =
          $('meta[property="product:price:currency"]').first().attr('content') ||
          null
        items.push({ value, currency, source: 'meta:product:price:amount', type: 'regular' })
      })
      return items
    },
  },
  {
    source: 'woocommerce:Price-amount',
    type: 'regular',
    run($) {
      const items = []
      const roots = $('.product .summary .price, .single-product .price, .product-type-simple .price')
      const scope = roots.length ? roots : $('.price')
      scope.find('del .woocommerce-Price-amount bdi, del .woocommerce-Price-amount').each((_, el) => {
        const value = parseDisplayPriceString($(el).text())
        if (value == null) return
        items.push({ value, currency: parseCurrencyFromText($(el).text()), source: 'woocommerce:Price-amount', type: 'regular' })
      })
      scope.find('ins .woocommerce-Price-amount bdi, ins .woocommerce-Price-amount').each((_, el) => {
        const value = parseDisplayPriceString($(el).text())
        if (value == null) return
        items.push({ value, currency: parseCurrencyFromText($(el).text()), source: 'woocommerce:Price-amount', type: 'sale' })
      })
      scope.find('.woocommerce-Price-amount bdi, .woocommerce-Price-amount').each((_, el) => {
        if ($(el).closest('del, ins').length) return
        const value = parseDisplayPriceString($(el).text())
        if (value == null) return
        items.push({ value, currency: parseCurrencyFromText($(el).text()), source: 'woocommerce:Price-amount', type: 'regular' })
      })
      return items
    },
  },
  {
    source: 'generic:product-price',
    type: 'regular',
    run($) {
      const items = []
      const roots = $('.product, .product-main, .product__info, .product-single, main')
      const scope = roots.first().length ? roots.first() : $('body')
      scope.find('span.price, .price, [data-testid="sticky-price-display"], .product-price').each((_, el) => {
        if ($(el).find('.price').length) return
        const raw = $(el).attr('data-product-price') || $(el).text()
        const value = parseDisplayPriceString(raw)
        if (value == null) return
        items.push({
          value,
          currency: parseCurrencyFromText(raw),
          source: 'generic:product-price',
          type: 'regular',
        })
      })
      return items
    },
  },
  {
    source: 'shopify:product-price',
    type: 'regular',
    run($) {
      const items = []
      const selectors = [
        { sel: '.price__sale .price-item--sale, .price-item--sale', type: 'sale' },
        { sel: '.price__regular .price-item--regular, .price-item--regular', type: 'regular' },
        { sel: '[data-product-price], .product__price, .product-single__price', type: 'regular' },
      ]
      for (const { sel, type } of selectors) {
        $(sel).each((_, el) => {
          const value = parseDisplayPriceString($(el).attr('data-product-price') || $(el).text())
          if (value == null) return
          items.push({ value, currency: null, source: 'shopify:product-price', type })
        })
      }
      return items
    },
  },
]

const DISPLAY_PICK_PRIORITY = [
  'itemprop:price',
  'meta:product:price:amount',
  'woocommerce:Price-amount',
  'shopify:product-price',
  'generic:product-price',
]

function parseCurrencyFromText(str) {
  if (!str) return null
  if (/£/.test(str)) return 'GBP'
  if (/€/.test(str)) return 'EUR'
  if (/¥/.test(str)) return 'JPY'
  if (/\$/.test(str)) return 'USD'
  return null
}

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

function dedupeCandidates(candidates) {
  const seen = new Set()
  return candidates.filter((item) => {
    if (item.value == null || item.value <= 0) return false
    const key = `${item.source}:${item.value}:${item.type}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pickDisplayPrice(candidates) {
  if (!candidates.length) {
    return { price: null, currency: null, source: null, type: null }
  }

  for (const source of DISPLAY_PICK_PRIORITY) {
    const saleMatch = candidates.find((c) => c.source === source && c.type === 'sale')
    if (saleMatch) {
      return {
        price: saleMatch.value,
        currency: saleMatch.currency,
        source: saleMatch.source,
        type: saleMatch.type,
      }
    }
    const match = candidates.find((c) => c.source === source)
    if (match) {
      return {
        price: match.value,
        currency: match.currency,
        source: match.source,
        type: match.type,
      }
    }
  }

  const first = candidates[0]
  return {
    price: first.value,
    currency: first.currency,
    source: first.source,
    type: first.type,
  }
}

/**
 * Extract all visible product prices from HTML with source metadata.
 * @param {string} html
 */
export function extractDisplayPrices(html) {
  const $ = cheerio.load(html)
  let candidates = []

  for (const selector of DISPLAY_PRICE_SELECTORS) {
    candidates.push(...selector.run($))
  }

  candidates = dedupeCandidates(candidates)
  const display = pickDisplayPrice(candidates)

  return {
    display,
    candidates: candidates.map(({ value, currency, source, type }) => ({
      value,
      currency,
      source,
      type,
    })),
  }
}

/** @deprecated Use extractDisplayPrices().display.price */
export function extractDisplayPrice(html) {
  return extractDisplayPrices(html).display.price
}

function buildSchemaPricing(products) {
  const best = products.find((p) => p.valid) || products[0]

  if (!best?.values) {
    return { price: null, currency: null, source: null }
  }

  return {
    price: best.values.price ?? null,
    currency: best.values.currency ?? null,
    source: best.values.source ?? null,
  }
}

/**
 * Build unified product pricing data for audit output.
 * @param {string} html
 * @param {Array} products
 */
export function buildProductPricing(html, products) {
  const schema = buildSchemaPricing(products)
  const { display, candidates } = extractDisplayPrices(html)

  const saleCandidate = candidates.find((c) => c.type === 'sale')
  const regularCandidate = candidates.find((c) => c.type === 'regular')

  const displayPricing = {
    price: display.price,
    regularPrice: regularCandidate?.value ?? (display.type === 'regular' ? display.price : null),
    salePrice: saleCandidate?.value ?? (display.type === 'sale' ? display.price : null),
    currency: display.currency || schema.currency || regularCandidate?.currency || saleCandidate?.currency,
    source: display.source,
    type: display.type,
  }

  return {
    schema,
    display: displayPricing,
    candidates,
  }
}

function buildPriceConsistency(pricing) {
  const { schema, display } = pricing
  const schemaPrice = schema.price
  const displayPrice = display.price
  const currency = schema.currency || display.currency

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
      pricing: null,
      priceConsistency: null,
    }
  }

  const products = extractProductsFromHtml(html)
  const cart = detectHtmlCartSignals(html)
  const best = products.find((p) => p.valid) || products[0]
  const pricing = buildProductPricing(html, products)
  const priceConsistency = buildPriceConsistency(pricing)

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
    pricing,
    priceConsistency,
    trustContent: extractProductPageTrustContent(html),
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

const PRODUCT_TRUST_SPEC_PATTERNS = [
  /\bmaterial(s)?\b/i,
  /\bfabric\b/i,
  /\bsize(s)?\b/i,
  /\bdimension(s)?\b/i,
  /\bweight\b/i,
  /\bspecification(s)?\b/i,
]

const PRODUCT_DESCRIPTION_SELECTORS = [
  '[itemprop="description"]',
  '.product-description',
  '.product__description',
  '.product-single__description',
  '.woocommerce-product-details__short-description',
  '.product-info',
  '.product-details',
  '#product-description',
  'main',
]

const PRODUCT_IMAGE_SCOPE_SELECTORS = [
  '[itemtype*="Product"]',
  '.product',
  '.product-page',
  '.product-single',
  'main',
  'body',
]

const ATTRIBUTE_HTML_PATTERNS = {
  material: /\bmaterial(s)?\b/i,
  size: /\bsize(s)?\b|\bdimension(s)?\b/i,
  color: /\bcolou?r(s)?\b/i,
  model: /\bmodel\b|\bstyle\b/i,
}

const MARKETING_HEAVY_HTML_PATTERNS = [
  /\bbest ever\b/i,
  /\blimited time\b/i,
  /\bact now\b/i,
  /\b100%\s+(?:satisfaction|guarantee)\b/i,
]

function normalizeProductText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim()
}

function extractScopedProductText($, selectors) {
  for (const selector of selectors) {
    const el = $(selector).first()
    if (el.length) {
      return normalizeProductText(el.text())
    }
  }
  return ''
}

function extractProductImages($) {
  for (const selector of PRODUCT_IMAGE_SCOPE_SELECTORS) {
    const scope = $(selector).first()
    if (!scope.length) continue

    const images = scope.find('img').toArray()
    if (images.length === 0) continue

    let withAlt = 0
    for (const node of images) {
      const alt = $(node).attr('alt')
      if (alt && alt.trim().length > 1) withAlt += 1
    }

    return {
      imageCount: images.length,
      imagesWithAlt: withAlt,
      hasMainImage: images.length > 0,
    }
  }

  return { imageCount: 0, imagesWithAlt: 0, hasMainImage: false }
}

/**
 * Extract explainable product page trust content from HTML.
 * @param {string} html
 */
export function extractProductPageTrustContent(html) {
  if (!html) {
    return {
      descriptionLength: 0,
      hasSpecifications: false,
      marketingHeavy: false,
      factualAttributes: [],
      imageCount: 0,
      imagesWithAlt: 0,
      hasMainImage: false,
      htmlAttributes: {},
      hasReviews: false,
      hasGuarantee: false,
      hasContactOrOrder: false,
    }
  }

  const $ = cheerio.load(html)
  const descriptionText = extractScopedProductText($, PRODUCT_DESCRIPTION_SELECTORS)
  const descriptionLength = descriptionText.length
  const bodyText = normalizeProductText($('body').text())
  const imageSignals = extractProductImages($)
  const hasSpecifications = PRODUCT_TRUST_SPEC_PATTERNS.some((pattern) => pattern.test(bodyText))
  const marketingHeavy =
    descriptionLength < 120 && MARKETING_HEAVY_HTML_PATTERNS.some((pattern) => pattern.test(bodyText))

  const htmlAttributes = {}
  for (const [key, pattern] of Object.entries(ATTRIBUTE_HTML_PATTERNS)) {
    htmlAttributes[key] = pattern.test(bodyText)
  }

  const hasReviews =
    /review|rating|stars/i.test(bodyText) &&
    ($('[itemprop="review"], .reviews, .product-reviews, #reviews').length > 0 ||
      /\b\d(\.\d)?\s*\/\s*5\b/.test(bodyText))

  const hasGuarantee = /\b(guarantee|warranty|money[- ]back|satisfaction guaranteed)\b/i.test(bodyText)
  const hasContactOrOrder =
    /\b(contact us|customer service|shipping|returns)\b/i.test(bodyText) ||
    $('a[href^="mailto:"], a[href^="tel:"]').length > 0 ||
    /add to cart|buy now|add-to-cart/i.test(html)

  return {
    descriptionLength,
    hasSpecifications,
    marketingHeavy,
    factualAttributes: Object.entries(htmlAttributes)
      .filter(([, found]) => found)
      .map(([key]) => key),
    imageCount: imageSignals.imageCount,
    imagesWithAlt: imageSignals.imagesWithAlt,
    hasMainImage: imageSignals.hasMainImage,
    htmlAttributes,
    hasReviews,
    hasGuarantee,
    hasContactOrOrder,
  }
}

export { MAX_SCORE_CANDIDATES }
