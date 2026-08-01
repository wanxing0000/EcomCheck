/** @type {import('../types.js').Rule} */
export const productJsonLdRule = {
  id: 'A003',
  name: 'Product JSON-LD Detection',
  category: 'ads',
  severity: 'high',
  description:
    'Product pages should include valid Product structured data (JSON-LD) with name, image, price, and availability for Google Merchant Center.',
  check(auditData) {
    const audit = auditData.productsAudit

    if (!audit || audit.scannedPages === 0) {
      return {
        passed: false,
        message: 'No product pages found.',
        recommendation:
          'Ensure product pages are linked from your homepage with clear URLs (e.g. /products/ or /product/). Product JSON-LD schema should be added to each product detail page.',
      }
    }

    if (audit.detectedProducts === 0) {
      return {
        passed: false,
        message: 'Product pages found but no Product JSON-LD detected.',
        recommendation:
          'Add Product schema (JSON-LD) with @type Product to your product detail pages. Include name, image, offers.price, and offers.availability.',
      }
    }

    if (audit.validProducts > 0) {
      return {
        passed: true,
        message: `Valid Product JSON-LD found on ${audit.validProducts}/${audit.scannedPages} scanned product pages (${audit.detectedProducts} schema(s) total).`,
      }
    }

    const missing = audit.missingFields?.length
      ? audit.missingFields.join(', ')
      : 'name, image, price, availability'

    return {
      passed: false,
      message: `Product schema incomplete. Missing fields: ${missing}`,
      recommendation:
        'Complete required Product JSON-LD fields: name, image, offers.price, offers.availability. Add recommended fields brand, sku, gtin, and mpn for better Google Shopping performance.',
    }
  },
}
