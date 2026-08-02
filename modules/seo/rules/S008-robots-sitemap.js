/** @type {import('../../_shared/types.js').Rule} */
export const robotsSitemapRule = {
  id: 'S008',
  name: 'Robots & Sitemap',
  category: 'seo',
  severity: 'medium',
  description: 'Site should be crawlable with robots.txt and an XML sitemap for search indexing.',
  check(auditData) {
    const robots = auditData.seo?.robotsTxt
    const sitemap = auditData.seo?.sitemap
    const problems = []
    const advisories = []

    if (!robots?.exists) {
      problems.push('robots.txt not found')
    }

    if (robots?.blocksAll) {
      problems.push('robots.txt blocks all crawlers (Disallow: /)')
    }

    if (!sitemap?.exists) {
      advisories.push('sitemap not found')
    }

    if (problems.length === 0 && advisories.length === 0) {
      return {
        passed: true,
        message: 'robots.txt and sitemap are configured for search engine crawling.',
      }
    }

    const messages = [...problems, ...advisories.map((item) => `Advisory: ${item}`)]

    return {
      passed: false,
      message: messages.join('; '),
      recommendation:
        problems.length > 0
          ? 'Publish a robots.txt that allows crawling and remove Disallow: / rules unless intentional. Declare your sitemap location.'
          : 'Generate sitemap.xml and submit it via Google Search Console to help search engines discover pages.',
    }
  },
}
