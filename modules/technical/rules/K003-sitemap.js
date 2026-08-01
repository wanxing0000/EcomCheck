/** @type {import('../../_shared/types.js').Rule} */
export const sitemapRule = {
  id: 'K003',
  name: 'Sitemap',
  category: 'technical',
  severity: 'low',
  description: 'Website should have a sitemap.xml to help search engines discover pages.',
  check(auditData) {
    const sitemap = auditData.seo?.sitemap

    if (sitemap?.exists) {
      return {
        passed: true,
        message: `Sitemap found at ${sitemap.url}.`,
      }
    }

    return {
      passed: false,
      message: 'sitemap.xml not found',
      recommendation:
        'Add a sitemap.xml at your site root and reference it in robots.txt to improve search engine indexing.',
    }
  },
}
