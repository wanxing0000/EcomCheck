const META_PIXEL_PATTERNS = [
  { pattern: /\bfbq\s*\(/i, label: 'fbq(' },
  { pattern: /facebook\.com\/tr/i, label: 'facebook.com/tr' },
  { pattern: /connect\.facebook\.net/i, label: 'connect.facebook.net' },
]

const GOOGLE_TAG_PATTERNS = [
  { pattern: /\bgtag\s*\(/i, label: 'gtag(' },
  { pattern: /googletagmanager\.com/i, label: 'googletagmanager.com' },
  { pattern: /\bAW-/i, label: 'AW-' },
  { pattern: /\bG-/i, label: 'G-' },
]

const REQUIRED_FIELDS = ['name', 'image', 'price', 'availability']
const RECOMMENDED_FIELDS = ['brand', 'sku', 'gtin', 'mpn']

function isProductType(typeValue) {
  if (!typeValue) return false
  if (Array.isArray(typeValue)) return typeValue.some((t) => /product/i.test(String(t)))
  return /product/i.test(String(typeValue))
}

function extractJsonLdBlocks(html) {
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

function collectProducts(node, products) {
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

/**
 * Analyze a single Product JSON-LD object.
 * @param {object} product
 */
export function analyzeProductSchema(product) {
  const offer = getOffer(product)
  const brand = product.brand?.name || product.brand

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

function detectSignals(html, patterns) {
  const signals = []
  for (const { pattern, label } of patterns) {
    if (pattern.test(html)) signals.push(label)
  }
  return signals
}

function mergeProductSummaries(homepageProducts, productScan) {
  const deepItems = (productScan?.productPages || []).flatMap((page) => page.products || [])
  const allItems = [...homepageProducts, ...deepItems]
  const validItems = allItems.filter((p) => p.valid)
  const completeItems = allItems.filter((p) => p.complete)

  return {
    count: allItems.length,
    completeCount: completeItems.length,
    validCount: validItems.length,
    items: allItems.slice(0, 10),
    source: {
      homepage: homepageProducts.length,
      productPages: deepItems.length,
    },
  }
}

/**
 * Extract ads-related signals from homepage HTML and optional product page scan.
 * @param {string} html - Homepage HTML
 * @param {{ audit?: object, productPages?: Array } | null} [productScan]
 */
export function detectAdsData(html, productScan = null) {
  const metaPixelSignals = detectSignals(html, META_PIXEL_PATTERNS)
  const googleTagSignals = detectSignals(html, GOOGLE_TAG_PATTERNS)

  const homepageProducts = extractProductsFromHtml(html)
  const products = mergeProductSummaries(homepageProducts, productScan)

  return {
    metaPixel: {
      detected: metaPixelSignals.length > 0,
      signals: metaPixelSignals,
    },
    googleTag: {
      detected: googleTagSignals.length > 0,
      signals: googleTagSignals,
    },
    products,
  }
}
