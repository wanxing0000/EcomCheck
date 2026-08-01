/** @type {import('../types.js').Rule} */
export const robotsRule = {
  id: 'K002',
  name: 'Robots.txt',
  category: 'technical',
  severity: 'low',
  description: 'Website should have a robots.txt file to guide search engine crawlers.',
  check(auditData) {
    const robots = auditData.seo?.robotsTxt

    if (robots?.exists) {
      return {
        passed: true,
        message: `robots.txt found at ${robots.url}.`,
      }
    }

    return {
      passed: false,
      message: 'robots.txt not found',
      recommendation:
        'Create a robots.txt file at your site root to control crawler access and declare your sitemap location.',
    }
  },
}
