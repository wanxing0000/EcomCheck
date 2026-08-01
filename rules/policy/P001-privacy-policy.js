/** @type {import('../types.js').Rule} */
export const privacyPolicyRule = {
  id: 'P001',
  name: 'Privacy Policy',
  category: 'policy',
  severity: 'high',
  description:
    'Website must have a publicly accessible privacy policy page, required by Google Merchant Center.',
  check(auditData) {
    const page = auditData.pages?.privacyPolicy
    const content = auditData.pageContent?.privacyPolicy

    if (page?.found && page.url) {
      const hasContent = content?.fetched && content.textLength > 100
      return {
        passed: true,
        message: hasContent
          ? `Privacy policy page found at ${page.url} (${content.textLength} characters).`
          : `Privacy policy page found at ${page.url}.`,
      }
    }

    return {
      passed: false,
      message: 'No privacy policy page detected on the website.',
      recommendation:
        'Create a dedicated privacy policy page explaining how you collect, use, and protect customer data. Link it in your website footer. Required for Google Merchant Center listing.',
    }
  },
}
