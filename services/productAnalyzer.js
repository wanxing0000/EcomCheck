/**
 * Product Page Analyzer — extract product-level compliance signals from discovered pages.
 * Foundation layer only; does not modify compliance rules or Fix Assistant logic.
 */

import * as cheerio from 'cheerio'
import {
  collectProducts,
  extractBrandFromProduct,
  extractGtinFromProduct,
  extractJsonLdBlocks,
  extractProductsFromHtml,
  extractSkuFromProduct,
} from './structuredData.js'
import {
  buildAvailabilityConsistency,
  buildPriceConsistency,
  extractHtmlProductMetadata,
  extractProductPageTrustContent,
  extractVisibleAvailability,
  scoreProductPage,
} from './productScorer.js'
import { getConfidenceTier, normalizeProductPageUrl } from './productDiscovery.js'

const MAX_ANALYZED_PAGES = 5
const MIN_TITLE_LENGTH = 10

const PLACEHOLDER_TITLE_PATTERNS = [
  /^product$/i,
  /^untitled/i,
  /^sample product/i,
  /^test product/i,
  /^default title/i,
  /^new product/i,
  /^product title$/i,
]

const STRUCTURED_DATA_FIELDS = [
  'name',
  'image',
  'description',
  'sku',
  'brand',
  'offers',
  'price',
  'availability',
]

const ISSUE_LABELS = {
  name: 'Missing product name',
  image: 'Missing product image',
  description: 'Missing product description',
  sku: 'Missing SKU',
  brand: 'Missing brand',
  offers: 'Missing offers block',
  price: 'Missing price',
  availability: 'Missing availability',
  gtin: 'Missing GTIN',
  mpn: 'Missing MPN',
  title: 'Missing product title',
  visiblePrice: 'Missing visible price',
  addToCart: 'Missing add-to-cart button',
}

function hasText(value) {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function firstNonEmpty(...values) {
  for (const value of values) {
    if (hasText(value)) return value
  }
  return null
}

function extractRawSchemaProducts(html) {
  if (!html) return []
  const rawProducts = []
  for (const block of extractJsonLdBlocks(html)) {
    collectProducts(block, rawProducts)
  }
  return rawProducts
}

function normalizeSchemaProducts(existingPage = null, html = null) {
  if (html) return extractProductsFromHtml(html)

  const schemas = existingPage?.schemas || existingPage?.products || []
  return schemas.map((schema) => ({
    name: schema.name || null,
    description: schema.description || null,
    fields: schema.fields || {},
    values: schema.values || {},
    missingRequired: schema.missingRequired || [],
    missingRecommended: schema.missingRecommended || [],
    missingFields: schema.missingFields || [],
    valid: schema.valid ?? false,
    complete: schema.complete ?? false,
  }))
}

function mergeExistingPage(scoredPage = null, scannedPage = null) {
  if (!scoredPage && !scannedPage) return null
  return {
    ...(scoredPage || {}),
    ...(scannedPage || {}),
    signals: {
      ...(scoredPage?.signals || {}),
      ...(scannedPage?.signals || {}),
    },
    schemas: scannedPage?.schemas || scannedPage?.products || scoredPage?.products || scoredPage?.schemas || [],
    products: scannedPage?.products || scoredPage?.products || [],
    trustContent: scannedPage?.trustContent || scoredPage?.trustContent || null,
  }
}

function determineExtractionConfidence({ html, existingPage }) {
  if (html) return 'high'

  if (existingPage?.fetched === false) return 'low'
  if (existingPage?.trustContent) return 'high'
  if (existingPage?.schemas?.length || existingPage?.products?.length) return 'high'

  return 'low'
}

function mergeSchemaFieldFlags(schemaProducts = [], rawSchemaNodes = []) {
  const merged = {
    name: false,
    image: false,
    description: false,
    sku: false,
    brand: false,
    gtin: false,
    mpn: false,
    price: false,
    availability: false,
  }

  for (const schema of schemaProducts) {
    for (const [key, present] of Object.entries(schema.fields || {})) {
      if (present && Object.prototype.hasOwnProperty.call(merged, key)) {
        merged[key] = true
      }
    }
    if (hasText(schema.description)) merged.description = true
    if (hasText(schema.values?.brand)) merged.brand = true
    if (hasText(schema.values?.sku)) merged.sku = true
    if (hasText(schema.values?.gtin)) merged.gtin = true
    if (hasText(schema.values?.mpn)) merged.mpn = true
  }

  for (const raw of rawSchemaNodes) {
    if (hasText(raw.name)) merged.name = true
    if (hasText(raw.image)) merged.image = true
    if (hasText(raw.description)) merged.description = true
    if (hasText(extractSkuFromProduct(raw))) merged.sku = true
    if (hasText(extractBrandFromProduct(raw))) merged.brand = true
    if (hasText(extractGtinFromProduct(raw))) merged.gtin = true
    if (hasText(raw.mpn)) merged.mpn = true
    const offer = Array.isArray(raw.offers) ? raw.offers[0] : raw.offers
    if (hasText(offer?.price ?? offer?.priceSpecification?.price ?? offer?.lowPrice)) merged.price = true
    if (hasText(offer?.availability)) merged.availability = true
  }

  return merged
}

function mergeExtractedMetadata(schemaProducts = [], rawSchemaNodes = [], htmlMetadata = null, trustContent = null) {
  const merged = mergeSchemaFieldFlags(schemaProducts, rawSchemaNodes)

  if (htmlMetadata) {
    if (hasText(htmlMetadata.brand)) merged.brand = true
    if (hasText(htmlMetadata.sku)) merged.sku = true
    if (hasText(htmlMetadata.gtin)) merged.gtin = true
    if (hasText(htmlMetadata.mpn)) merged.mpn = true
    if ((htmlMetadata.descriptionLength ?? 0) >= 1 || hasText(htmlMetadata.description)) {
      merged.description = true
    }
  }

  if (trustContent) {
    if ((trustContent.descriptionLength ?? 0) >= 1) merged.description = true
  }

  return merged
}

function buildSignalPresence(confidence, detected) {
  if (confidence !== 'high') return null
  return Boolean(detected)
}

function isPlaceholderTitle(value) {
  if (!hasText(value)) return false
  const trimmed = String(value).trim()
  if (trimmed.length < MIN_TITLE_LENGTH) return true
  return PLACEHOLDER_TITLE_PATTERNS.some((pattern) => pattern.test(trimmed))
}

function extractSchemaAvailability(rawSchemaNodes = [], schemaProducts = []) {
  for (const raw of rawSchemaNodes) {
    const offer = Array.isArray(raw.offers) ? raw.offers[0] : raw.offers
    if (hasText(offer?.availability)) return offer.availability
  }

  const primary = schemaProducts.find((product) => product.valid) || schemaProducts[0]
  if (primary?.fields?.availability) return 'present'
  return null
}

function buildProductPriceConsistency({ pricing, productSignals, existingConsistency = null }) {
  if (existingConsistency?.checked != null) {
    return {
      ...existingConsistency,
      missingPrice: productSignals?.price?.found === false,
    }
  }

  if (pricing?.schema || pricing?.display) {
    const built = buildPriceConsistency(pricing)
    return {
      ...built,
      missingPrice: productSignals?.price?.found === false,
    }
  }

  const schemaPrice = productSignals?.price?.schemaPrice ?? null
  const displayPrice = productSignals?.price?.visiblePrice ?? null

  if (schemaPrice == null && displayPrice == null) {
    return {
      schemaPrice: null,
      displayPrice: null,
      currency: productSignals?.currency?.value ?? null,
      consistent: null,
      checked: false,
      missingPrice: productSignals?.price?.found === false,
    }
  }

  return {
    ...buildPriceConsistency({
      schema: { price: schemaPrice, currency: productSignals?.currency?.value ?? null },
      display: { price: displayPrice, currency: productSignals?.currency?.value ?? null },
    }),
    missingPrice: productSignals?.price?.found === false,
  }
}

function extractTitleSignals(html, schemaProduct = null) {
  if (!html) {
    const value = schemaProduct?.name || null
    return {
      value,
      htmlTitle: null,
      h1: null,
      schemaName: schemaProduct?.name || null,
      titleLength: value?.length ?? 0,
      isPlaceholder: isPlaceholderTitle(value),
      found: hasText(value) && !isPlaceholderTitle(value),
    }
  }

  const $ = cheerio.load(html)
  const htmlTitle = $('title').first().text().trim() || null
  const h1 = $('h1').first().text().trim() || null
  const schemaName = schemaProduct?.name || null
  const value = firstNonEmpty(schemaName, h1, htmlTitle)
  const titleLength = value?.length ?? 0

  return {
    value,
    htmlTitle,
    h1,
    schemaName,
    titleLength,
    isPlaceholder: isPlaceholderTitle(value),
    found: hasText(value) && !isPlaceholderTitle(value),
  }
}

function extractDescriptionSignals(html, schemaProduct = null, trustContent = null, htmlMetadata = null) {
  const schemaDescription =
    (typeof schemaProduct?.description === 'string' ? schemaProduct.description : null) || null
  let metaDescription = null
  let pageDescription = null

  if (html) {
    const $ = cheerio.load(html)
    metaDescription =
      $('meta[name="description"]').attr('content')?.trim() ||
      $('meta[property="og:description"]').attr('content')?.trim() ||
      null

    pageDescription = extractProductPageTrustContent(html)
  } else if (trustContent) {
    pageDescription = trustContent
  }

  const visibleDescriptionLength =
    pageDescription?.descriptionLength ?? htmlMetadata?.descriptionLength ?? 0
  const schemaDescriptionLength = schemaDescription?.length ?? 0
  const descriptionLength = Math.max(visibleDescriptionLength, schemaDescriptionLength)
  const value = firstNonEmpty(
    htmlMetadata?.description,
    schemaDescription,
    metaDescription
  )

  return {
    value,
    metaDescription,
    schemaDescription,
    descriptionLength,
    visibleDescriptionLength,
    schemaDescriptionLength,
    found: descriptionLength > 0 || hasText(value) || hasText(schemaDescription),
  }
}

function mapStructuredDataAnalysis(schemaProducts = [], rawSchemaNodes = []) {
  const primary = schemaProducts.find((product) => product.valid) || schemaProducts[0]
  const mergedFields = mergeSchemaFieldFlags(schemaProducts, rawSchemaNodes)

  if (!primary) {
    return {
      found: false,
      missingFields: [...STRUCTURED_DATA_FIELDS, 'gtin', 'mpn'],
      products: [],
      primary: null,
    }
  }

  const missingFields = []
  if (!mergedFields.name) missingFields.push('name')
  if (!mergedFields.image) missingFields.push('image')
  if (!mergedFields.description) missingFields.push('description')
  if (!mergedFields.sku) missingFields.push('sku')
  if (!mergedFields.brand) missingFields.push('brand')
  if (!mergedFields.price) {
    missingFields.push('offers')
    missingFields.push('price')
  }
  if (!mergedFields.availability) missingFields.push('availability')
  if (!mergedFields.gtin) missingFields.push('gtin')
  if (!mergedFields.mpn) missingFields.push('mpn')

  return {
    found: true,
    missingFields: [...new Set(missingFields)],
    products: schemaProducts,
    primary,
  }
}

function buildQualitySignals({ html = null, existingPage = null, scored = null, trustContent = null }) {
  const trust = trustContent || existingPage?.trustContent || (html ? extractProductPageTrustContent(html) : null)
  const signals = scored?.signals || existingPage?.signals || {}

  return {
    descriptionLength: trust?.descriptionLength ?? 0,
    images: trust?.imageCount ?? 0,
    imageCount: trust?.imageCount ?? 0,
    imagesWithAlt: trust?.imagesWithAlt ?? 0,
    hasAltText: Boolean(trust?.hasAltText),
    hasAddToCart: Boolean(signals.addToCart),
    hasReviews: Boolean(trust?.hasReviews),
    hasSpecifications: Boolean(trust?.hasSpecifications),
    hasMaterial: Boolean(trust?.htmlAttributes?.material),
    hasSize: Boolean(trust?.htmlAttributes?.size),
    hasWarranty: Boolean(trust?.hasWarranty ?? trust?.hasGuarantee),
    hasReturnInfo: Boolean(trust?.hasReturnInfo),
  }
}

function buildProductSignals({
  title,
  description,
  schemaProduct,
  pricing,
  priceConsistency,
  scored,
  existingPage,
  mergedFields,
  confidence,
}) {
  const schemaValues = schemaProduct?.values || {}
  const displayPrice =
    pricing?.display?.price ??
    priceConsistency?.displayPrice ??
    scored?.pricing?.display?.price ??
    null
  const schemaPrice = pricing?.schema?.price ?? schemaValues.price ?? priceConsistency?.schemaPrice ?? null
  const currency =
    pricing?.display?.currency ??
    pricing?.schema?.currency ??
    schemaValues.currency ??
    priceConsistency?.currency ??
    null

  return {
    title: {
      found: buildSignalPresence(confidence, title.found),
      length: title.titleLength,
      isPlaceholder: confidence === 'high' ? title.isPlaceholder : null,
      value: title.value,
      sources: {
        htmlTitle: title.htmlTitle,
        h1: title.h1,
        schemaName: title.schemaName,
      },
    },
    description: {
      found: buildSignalPresence(confidence, description.found),
      length: description.descriptionLength,
      visibleLength: description.visibleDescriptionLength,
      schemaLength: description.schemaDescriptionLength,
      value: description.value,
      sources: {
        metaDescription: description.metaDescription,
        schemaDescription: description.schemaDescription,
      },
    },
    price: {
      found: buildSignalPresence(
        confidence,
        displayPrice != null || schemaPrice != null || Boolean(scored?.signals?.price || existingPage?.signals?.price)
      ),
      visiblePrice: displayPrice,
      schemaPrice,
    },
    currency: {
      found: buildSignalPresence(confidence, hasText(currency)),
      value: currency,
    },
    availability: {
      found: buildSignalPresence(
        confidence,
        Boolean(
          mergedFields?.availability ||
            schemaProduct?.fields?.availability ||
            scored?.signals?.availability ||
            existingPage?.signals?.availability
        )
      ),
      value: mergedFields?.availability || schemaProduct?.fields?.availability ? 'present' : null,
    },
    sku: {
      found: buildSignalPresence(confidence, mergedFields?.sku),
      value: mergedFields?.sku ? 'present' : null,
    },
    brand: {
      found: buildSignalPresence(confidence, mergedFields?.brand),
      value: mergedFields?.brand ? 'present' : null,
    },
    gtin: {
      found: buildSignalPresence(confidence, mergedFields?.gtin),
      value: mergedFields?.gtin ? 'present' : null,
    },
    mpn: {
      found: buildSignalPresence(confidence, mergedFields?.mpn),
      value: mergedFields?.mpn ? 'present' : null,
    },
  }
}

function buildIssues(productSignals, structuredData, quality) {
  const issues = []

  if (!productSignals.title.found) issues.push(ISSUE_LABELS.title)
  if (!productSignals.description.found) issues.push(ISSUE_LABELS.description)
  if (!productSignals.price.found) issues.push(ISSUE_LABELS.visiblePrice)
  if (!quality.hasAddToCart) issues.push(ISSUE_LABELS.addToCart)

  for (const field of structuredData.missingFields || []) {
    const label = ISSUE_LABELS[field]
    if (label && !issues.includes(label)) issues.push(label)
  }

  return issues
}

function buildUiSignals(productSignals, structuredData, quality, confidence, title) {
  const present = (signal) => (confidence === 'high' ? Boolean(signal?.found) : null)

  return {
    productSchema: structuredData.found,
    price: present(productSignals.price),
    hasPrice: present(productSignals.price),
    description: present(productSignals.description),
    brand: present(productSignals.brand),
    gtin: present(productSignals.gtin),
    sku: present(productSignals.sku),
    availability: present(productSignals.availability),
    hasAvailability: present(productSignals.availability),
    hasCurrency: present(productSignals.currency),
    addToCart: quality.hasAddToCart,
    reviews: confidence === 'high' ? quality.hasReviews : null,
    imageCount: confidence === 'high' ? quality.imageCount : null,
    hasAltText: confidence === 'high' ? quality.hasAltText : null,
    titleLength: confidence === 'high' ? title.titleLength : null,
  }
}

/**
 * Analyze a single product page.
 * @param {string} url
 * @param {{ html?: string|null, existingPage?: object|null, discovery?: object|null }} context
 */
export function analyzeProductPage(url, { html = null, existingPage = null, discovery = null } = {}) {
  const rawSchemaNodes = extractRawSchemaProducts(html)
  const schemaProducts = normalizeSchemaProducts(existingPage, html)
  const primarySchema = schemaProducts[0] || null
  const scored = html ? scoreProductPage(html, url) : null
  const trustContent = existingPage?.trustContent || scored?.trustContent || null
  const htmlMetadata = html ? extractHtmlProductMetadata(html) : null
  const confidence = determineExtractionConfidence({ html, existingPage })
  const mergedFields = mergeExtractedMetadata(schemaProducts, rawSchemaNodes, htmlMetadata, trustContent)
  const structuredData = mapStructuredDataAnalysis(schemaProducts, rawSchemaNodes)
  const title = extractTitleSignals(html, primarySchema)
  const description = extractDescriptionSignals(html, primarySchema, trustContent, htmlMetadata)
  const quality = buildQualitySignals({ html, existingPage, scored, trustContent })
  const pricing = existingPage?.pricing || scored?.pricing || null
  const existingPriceConsistency = existingPage?.priceConsistency || scored?.priceConsistency || null
  const visibleAvailability = html ? extractVisibleAvailability(html) : null
  const schemaAvailability = extractSchemaAvailability(rawSchemaNodes, schemaProducts)

  const productSignals = buildProductSignals({
    title,
    description,
    schemaProduct: structuredData.primary || primarySchema,
    pricing,
    priceConsistency: existingPriceConsistency,
    scored,
    existingPage,
    mergedFields,
    confidence,
  })

  const priceConsistency = buildProductPriceConsistency({
    pricing,
    productSignals,
    existingConsistency: existingPriceConsistency,
  })

  const availabilityConsistency = buildAvailabilityConsistency({
    schemaAvailability,
    visibleAvailability,
  })

  const issues = confidence === 'high' ? buildIssues(productSignals, structuredData, quality) : []

  return {
    url,
    confidence,
    extractionConfidence: confidence,
    discoveryScore: discovery?.score ?? null,
    productSignals,
    priceConsistency,
    availabilityConsistency,
    extractedData: {
      title: title.value,
      description: description.value,
      descriptionLength: Math.max(description.descriptionLength, quality.descriptionLength),
      price: productSignals.price.visiblePrice ?? productSignals.price.schemaPrice,
      currency: productSignals.currency.value,
      availability: productSignals.availability.value,
      sku: productSignals.sku.found ? 'present' : productSignals.sku.found === false ? null : 'unknown',
      brand: productSignals.brand.found ? 'present' : productSignals.brand.found === false ? null : 'unknown',
      gtin: productSignals.gtin.found ? 'present' : productSignals.gtin.found === false ? null : 'unknown',
      mpn: productSignals.mpn.found ? 'present' : productSignals.mpn.found === false ? null : 'unknown',
      imageCount: quality.imageCount,
      titleLength: title.titleLength,
    },
    structuredData: {
      found: structuredData.found,
      missingFields: structuredData.missingFields,
    },
    quality: {
      ...quality,
      titleLength: title.titleLength,
      hasPlaceholderTitle: title.isPlaceholder,
      descriptionLength: Math.max(quality.descriptionLength, description.descriptionLength),
      hasPrice: productSignals.price.found === true,
      hasCurrency: productSignals.currency.found === true,
      hasAvailability: productSignals.availability.found === true,
    },
    signals: buildUiSignals(productSignals, structuredData, quality, confidence, title),
    issues,
  }
}

function indexPagesByUrl(entries = []) {
  const map = new Map()
  for (const entry of entries) {
    if (!entry?.url) continue
    map.set(normalizeProductPageUrl(entry.url), entry)
  }
  return map
}

/**
 * Analyze high-confidence discovered product pages using existing crawl scan data.
 * @param {{
 *   productDiscovery?: { productPages?: object[] }|null,
 *   productsAudit?: object|null,
 *   maxPages?: number,
 * }} input
 */
export function analyzeDiscoveredProductPages({
  productDiscovery = null,
  productsAudit = null,
  maxPages = MAX_ANALYZED_PAGES,
} = {}) {
  const discovered = productDiscovery?.productPages || []
  const scannedPages = indexPagesByUrl(productsAudit?.productPages)
  const scoredPages = indexPagesByUrl(productsAudit?.pageScores)

  const candidates = discovered
    .filter((page) => page.confidence === 'high' || getConfidenceTier(page.score ?? 0) === 'high')
    .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
    .slice(0, maxPages)

  const products = candidates.map((discovery) => {
    const key = normalizeProductPageUrl(discovery.url)
    const existingPage = mergeExistingPage(scoredPages.get(key), scannedPages.get(key))
    return analyzeProductPage(discovery.url, { existingPage, discovery })
  })

  return {
    products,
    summary: {
      analyzed: products.length,
      withSchema: products.filter((product) => product.structuredData?.found).length,
      withIssues: products.filter((product) => product.issues?.length > 0).length,
    },
  }
}

export { MAX_ANALYZED_PAGES, ISSUE_LABELS, STRUCTURED_DATA_FIELDS, MIN_TITLE_LENGTH, PLACEHOLDER_TITLE_PATTERNS }
