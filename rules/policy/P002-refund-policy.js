/** @type {import('../types.js').Rule} */
export const refundPolicyRule = {
  id: 'P002',
  name: 'Refund Policy',
  category: 'policy',
  severity: 'high',
  description:
    'Website must have a return/refund policy page, required by Google Merchant Center for e-commerce stores.',
  check(auditData) {
    const page = auditData.pages?.refundPolicy
    const content = auditData.pageContent?.refundPolicy

    if (page?.found && page.url) {
      const hasContent = content?.fetched && content.textLength > 50
      return {
        passed: true,
        message: hasContent
          ? `Refund/return policy page found at ${page.url} (${content.textLength} characters).`
          : `Refund/return policy page found at ${page.url}.`,
      }
    }

    return {
      passed: false,
      message: 'No refund or return policy page detected on the website.',
      recommendation:
        'Add a clear return and refund policy page covering return windows, conditions, and refund timelines. Link it in your footer and checkout flow. Required for Google Merchant Center.',
    }
  },
}
