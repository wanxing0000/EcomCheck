import { extractProductsFromHtml } from './structuredData.js'

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

export { analyzeProductSchema, extractProductsFromHtml } from './structuredData.js'

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
