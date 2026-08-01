/** @type {import('../types.js').Rule} */
export const shippingPolicyRule = {
  id: 'P003',
  name: 'Shipping Policy',
  category: 'policy',
  severity: 'medium',
  description:
    'Website should have a shipping policy page with delivery times and costs, required for Google Merchant Center compliance.',
  check(auditData) {
    const page = auditData.pages?.shippingPolicy
    const content = auditData.pageContent?.shippingPolicy

    if (page?.found && page.url) {
      const hasContent = content?.fetched && content.textLength > 50
      return {
        passed: true,
        message: hasContent
          ? `Shipping policy page found at ${page.url} (${content.textLength} characters).`
          : `Shipping policy page found at ${page.url}.`,
      }
    }

    return {
      passed: false,
      message: 'No shipping policy page detected on the website.',
      recommendation:
        'Create a shipping policy page detailing delivery regions, shipping costs, and estimated delivery times. Google Merchant Center requires clear shipping information before approving product listings.',
    }
  },
}
