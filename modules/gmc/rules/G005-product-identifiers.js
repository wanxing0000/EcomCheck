import { getProductSchemas, getScannedProductPages, pagesWithSchema } from './_helpers.js'

const IDENTIFIERS = ['brand', 'sku', 'gtin', 'mpn']

/** @type {import('../../_shared/types.js').Rule} */
export const productIdentifiersRule = {
  id: 'G005',
  name: 'Product Identifiers',
  category: 'gmc',
  severity: 'warning',
  description:
    'Product JSON-LD should include brand, sku, gtin, or mpn identifiers for optimal Google Shopping performance.',
  check(auditData) {
    const scanned = getScannedProductPages(auditData)

    if (scanned.length === 0) {
      return {
        passed: false,
        message: 'No product pages scanned to verify product identifiers.',
        recommendation: 'Add brand, sku, gtin, or mpn to Product JSON-LD on product detail pages.',
      }
    }

    const withSchema = pagesWithSchema(auditData)
    if (withSchema.length === 0) {
      return {
        passed: false,
        message: 'No Product JSON-LD found to verify identifiers.',
        recommendation: 'Add Product schema with brand, sku, gtin, or mpn fields.',
      }
    }

    const schemas = getProductSchemas(auditData)
    const present = {}
    const missing = new Set(IDENTIFIERS)

    for (const id of IDENTIFIERS) {
      const found = schemas.some((s) => s.fields?.[id])
      present[id] = found
      if (found) missing.delete(id)
    }

    if (missing.size === 0) {
      return {
        passed: true,
        message: 'All product identifiers present: brand, sku, gtin, mpn.',
      }
    }

    const presentList = IDENTIFIERS.filter((id) => present[id])
    const missingList = [...missing]

    if (presentList.length > 0) {
      return {
        passed: false,
        message: `Some product identifiers missing: ${missingList.join(', ')}. Present: ${presentList.join(', ')}.`,
        recommendation:
          'Add missing product identifiers (brand, sku, gtin, mpn) to Product JSON-LD for better Google Shopping ad performance.',
      }
    }

    return {
      passed: false,
      message: `Product identifiers missing: ${missingList.join(', ')}.`,
      recommendation:
        'Add brand, sku, gtin, or mpn to your Product JSON-LD. At least one identifier is recommended for GMC listings.',
    }
  },
}
