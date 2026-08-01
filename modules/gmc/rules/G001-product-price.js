import { countPagesWithSignal, getScannedProductPages, pagesWithSchema } from './_helpers.js'

/** @type {import('../../_shared/types.js').Rule} */
export const productPriceRule = {
  id: 'G001',
  name: 'Product Price',
  category: 'gmc',
  severity: 'high',
  description: 'Product JSON-LD must include offers.price for Google Merchant Center listings.',
  check(auditData) {
    const scanned = getScannedProductPages(auditData)

    if (scanned.length === 0) {
      return {
        passed: false,
        message: 'No product pages scanned to verify offers.price.',
        recommendation: 'Ensure product detail pages are linked from the homepage and include Product JSON-LD with offers.price.',
      }
    }

    const withSchema = pagesWithSchema(auditData)
    if (withSchema.length === 0) {
      return {
        passed: false,
        message: 'No Product JSON-LD found on scanned product pages.',
        recommendation: 'Add Product schema with offers.price to product detail pages.',
      }
    }

    const withPrice = countPagesWithSignal(auditData, 'price')

    if (withPrice > 0) {
      return {
        passed: true,
        message: `offers.price detected on ${withPrice}/${withSchema.length} product page(s) with schema.`,
      }
    }

    return {
      passed: false,
      message: 'Product JSON-LD is missing offers.price on scanned product pages.',
      recommendation: 'Add offers.price to your Product JSON-LD schema on all product detail pages.',
    }
  },
}
