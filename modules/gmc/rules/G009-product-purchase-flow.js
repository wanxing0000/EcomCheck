import { isEcommerceSite, getPurchaseFlowSummary } from './_helpers.js'

/** @type {import('../../_shared/types.js').Rule} */
export const productPurchaseFlowRule = {
  id: 'G009',
  name: 'Product Purchase Flow',
  category: 'gmc',
  severity: 'medium',
  description:
    'E-commerce product pages should expose an Add to Cart or Buy button so customers can complete a purchase.',
  check(auditData) {
    const purchaseFlow = getPurchaseFlowSummary(auditData)

    if (!isEcommerceSite(auditData)) {
      return {
        passed: true,
        message: 'Not an e-commerce site — purchase flow check skipped.',
        purchaseFlow,
      }
    }

    if (purchaseFlow.scannedPages === 0) {
      return {
        passed: false,
        message: 'No product pages scanned to verify purchase flow.',
        recommendation:
          'Link product detail pages from your homepage and ensure each page has an Add to Cart or Buy button.',
        purchaseFlow,
      }
    }

    if (purchaseFlow.withPurchaseAction > 0) {
      const parts = []
      if (purchaseFlow.withAddToCart > 0) {
        parts.push(`Add to Cart on ${purchaseFlow.withAddToCart} page(s)`)
      }
      if (purchaseFlow.withBuyNow > 0) {
        parts.push(`Buy Now on ${purchaseFlow.withBuyNow} page(s)`)
      }

      return {
        passed: true,
        message: `Purchase action detected: ${parts.join('; ')}.`,
        purchaseFlow,
      }
    }

    return {
      passed: false,
      message: `No Add to Cart or Buy button detected on ${purchaseFlow.scannedPages} scanned product page(s).`,
      recommendation:
        'Add a working Add to Cart or Buy Now button on product detail pages to avoid misrepresentation issues in Google Shopping.',
      purchaseFlow,
    }
  },
}
