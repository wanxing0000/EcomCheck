/** @type {import('../types.js').Rule} */
export const shippingInfoRule = {
  id: 'G004',
  name: 'Shipping Information',
  category: 'gmc',
  severity: 'medium',
  description: 'Website must have a shipping policy page for Google Merchant Center compliance.',
  check(auditData) {
    const page = auditData.pages?.shippingPolicy
    const content = auditData.pageContent?.shippingPolicy

    if (!page?.found || !page.url) {
      return {
        passed: false,
        message: 'No shipping policy page detected.',
        recommendation:
          'Add a shipping policy page covering delivery regions, costs, and timelines. Required for Google Shopping.',
      }
    }

    const detail =
      content?.fetched && content.textLength
        ? ` (${content.textLength} characters)`
        : ''

    return {
      passed: true,
      message: `Shipping policy page found at ${page.url}${detail}.`,
    }
  },
}
