const REQUIRED_FIELDS = ['name', 'image', 'price', 'availability']
const RECOMMENDED_FIELDS = ['brand', 'sku', 'gtin', 'mpn']

export function extractJsonLdBlocks(html) {
  const blocks = []
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  let match

  while ((match = regex.exec(html)) !== null) {
    try {
      blocks.push(JSON.parse(match[1]))
    } catch {
      // skip invalid JSON-LD
    }
  }

  return blocks
}

export function isProductType(typeValue) {
  if (!typeValue) return false
  if (Array.isArray(typeValue)) return typeValue.some((t) => /product/i.test(String(t)))
  return /product/i.test(String(typeValue))
}

export function collectProducts(node, products) {
  if (!node || typeof node !== 'object') return

  if (Array.isArray(node)) {
    node.forEach((item) => collectProducts(item, products))
    return
  }

  if (isProductType(node['@type'])) {
    products.push(node)
  }

  if (node['@graph']) collectProducts(node['@graph'], products)
  if (node.mainEntity) collectProducts(node.mainEntity, products)
  if (node.itemListElement) collectProducts(node.itemListElement, products)
}

export function isOrganizationType(typeValue) {
  if (!typeValue) return false
  const types = Array.isArray(typeValue) ? typeValue : [typeValue]
  return types.some((t) => /Organization|LocalBusiness|Store|OnlineStore/i.test(String(t)))
}

export function collectOrganizations(node, organizations) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((item) => collectOrganizations(item, organizations))
    return
  }
  if (isOrganizationType(node['@type'])) organizations.push(node)
  if (node['@graph']) collectOrganizations(node['@graph'], organizations)
}

export function isBreadcrumbType(typeValue) {
  if (!typeValue) return false
  const types = Array.isArray(typeValue) ? typeValue : [typeValue]
  return types.some((t) => /BreadcrumbList/i.test(String(t)))
}

export function collectBreadcrumbs(node, breadcrumbs) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((item) => collectBreadcrumbs(item, breadcrumbs))
    return
  }
  if (isBreadcrumbType(node['@type'])) breadcrumbs.push(node)
  if (node['@graph']) collectBreadcrumbs(node['@graph'], breadcrumbs)
  if (node.itemListElement) collectBreadcrumbs(node.itemListElement, breadcrumbs)
}

function getOffer(product) {
  const offers = product.offers
  if (!offers) return null
  return Array.isArray(offers) ? offers[0] : offers
}

function hasValue(value) {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function parsePriceNumber(value) {
  if (value == null) return null
  const num = parseFloat(String(value).replace(/[^\d.]/g, ''))
  return Number.isFinite(num) ? num : null
}

function extractOfferValues(offer) {
  if (!offer) return { price: null, currency: null, source: null }

  let source = null
  let rawPrice = null

  if (offer.price != null && offer.price !== '') {
    rawPrice = offer.price
    source = 'offers.price'
  } else if (offer.priceSpecification?.price != null && offer.priceSpecification?.price !== '') {
    rawPrice = offer.priceSpecification.price
    source = 'offers.priceSpecification.price'
  } else if (offer.lowPrice != null && offer.lowPrice !== '') {
    rawPrice = offer.lowPrice
    source = 'offers.lowPrice'
  } else if (offer.highPrice != null && offer.highPrice !== '') {
    rawPrice = offer.highPrice
    source = 'offers.highPrice'
  }

  const price = parsePriceNumber(rawPrice)
  const currency =
    offer.priceCurrency ||
    offer.priceSpecification?.priceCurrency ||
    offer.priceSpecification?.currency ||
    null

  return { price, currency, source }
}

/**
 * Analyze a single Product JSON-LD object.
 * @param {object} product
 */
export function analyzeProductSchema(product) {
  const offer = getOffer(product)
  const brand = product.brand?.name || product.brand
  const offerValues = extractOfferValues(offer)

  const fields = {
    name: hasValue(product.name),
    image: hasValue(product.image),
    price: hasValue(offer?.price ?? offer?.priceSpecification?.price ?? offer?.lowPrice),
    availability: hasValue(offer?.availability),
    brand: hasValue(brand),
    sku: hasValue(product.sku),
    gtin: hasValue(product.gtin ?? product.gtin8 ?? product.gtin12 ?? product.gtin13 ?? product.gtin14),
    mpn: hasValue(product.mpn),
  }

  const missingRequired = REQUIRED_FIELDS.filter((key) => !fields[key])
  const missingRecommended = RECOMMENDED_FIELDS.filter((key) => !fields[key])
  const missingFields = [...missingRequired, ...missingRecommended]

  return {
    name: product.name || null,
    fields,
    values: offerValues,
    missingRequired,
    missingRecommended,
    missingFields,
    valid: missingRequired.length === 0,
    complete: missingFields.length === 0,
  }
}

/**
 * Extract and analyze Product JSON-LD from HTML.
 * @param {string} html
 */
export function extractProductsFromHtml(html) {
  const jsonLdBlocks = extractJsonLdBlocks(html)
  const rawProducts = []
  jsonLdBlocks.forEach((block) => collectProducts(block, rawProducts))
  return rawProducts.map(analyzeProductSchema)
}

/**
 * Summarize structured data signals for SEO module input.
 * Product counts come from productsAudit; Organization/Breadcrumb from homepage JSON-LD.
 * @param {string} html
 * @param {object|null} productsAudit
 */
export function summarizeStructuredData(html, productsAudit = null) {
  const organizations = []
  const breadcrumbs = []

  for (const block of extractJsonLdBlocks(html)) {
    collectOrganizations(block, organizations)
    collectBreadcrumbs(block, breadcrumbs)
  }

  const schemaCount = productsAudit?.summary?.withSchema ?? 0
  const validCount = productsAudit?.validProducts ?? 0
  const detectedCount = productsAudit?.detectedProducts ?? 0
  const productCount = validCount || schemaCount || detectedCount

  return {
    organization: {
      found: organizations.length > 0,
      source: organizations.length > 0 ? 'json-ld' : null,
    },
    product: {
      found: productCount > 0,
      count: productCount,
    },
    breadcrumb: {
      found: breadcrumbs.length > 0,
      count: breadcrumbs.length,
    },
  }
}
