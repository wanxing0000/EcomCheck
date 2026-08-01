import { countPagesWithSignal, getScannedProductPages, pagesWithSchema } from './_helpers.js'

/** @type {import('../../_shared/types.js').Rule} */
export const productAvailabilityRule = {
  id: 'G002',
  name: 'Product Availability',
  category: 'gmc',
  severity: 'high',
  description: 'Product JSON-LD must include offers.availability for Google Merchant Center.',
  check(auditData) {
    const scanned = getScannedProductPages(auditData)

    if (scanned.length === 0) {
      return {
        passed: false,
        message: 'No product pages scanned to verify offers.availability.',
        recommendation: 'Link product detail pages from your homepage and include offers.availability in Product JSON-LD.',
      }
    }

    const withSchema = pagesWithSchema(auditData)
    if (withSchema.length === 0) {
      return {
        passed: false,
        message: 'No Product JSON-LD found on scanned product pages.',
        recommendation: 'Add Product schema with offers.availability (e.g. InStock) to product pages.',
      }
    }

    const withAvailability = countPagesWithSignal(auditData, 'availability')

    if (withAvailability > 0) {
      return {
        passed: true,
        message: `offers.availability detected on ${withAvailability}/${withSchema.length} product page(s) with schema.`,
      }
    }

    return {
      passed: false,
      message: 'Product JSON-LD is missing offers.availability on scanned product pages.',
      recommendation: 'Add offers.availability (schema.org InStock/OutOfStock) to Product JSON-LD on all product pages.',
    }
  },
}
