/** @type {import('../types.js').Rule} */
export const aboutUsRule = {
  id: 'T002',
  name: 'About Us',
  category: 'trust',
  severity: 'medium',
  description:
    'Website should have an About Us page to establish business identity and trust for advertising platforms.',
  check(auditData) {
    const page = auditData.pages?.aboutUs
    const content = auditData.pageContent?.aboutUs

    if (page?.found && page.url) {
      const hasContent = content?.fetched && content.textLength > 100
      return {
        passed: true,
        message: hasContent
          ? `About Us page found at ${page.url} (${content.textLength} characters).`
          : `About Us page found at ${page.url}.`,
      }
    }

    return {
      passed: false,
      message: 'No About Us page detected on the website.',
      recommendation:
        'Add an About Us page describing your business, mission, and team. This builds customer trust and is recommended for Google Merchant Center and Meta Ads verification.',
    }
  },
}
