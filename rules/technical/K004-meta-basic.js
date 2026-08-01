/** @type {import('../types.js').Rule} */
export const metaBasicRule = {
  id: 'K004',
  name: 'Meta Basic',
  category: 'technical',
  severity: 'medium',
  description:
    'Website should have essential meta tags: title, description, and og:image for SEO and social sharing.',
  check(auditData) {
    const meta = auditData.meta || {}
    const missing = []

    if (!meta.title?.trim()) missing.push('title')
    if (!meta.description?.trim()) missing.push('description')
    if (!meta.ogImage?.trim()) missing.push('ogImage')

    if (missing.length === 0) {
      return {
        passed: true,
        message: 'All basic meta tags present: title, description, ogImage.',
      }
    }

    const missingLabels = {
      title: 'page title',
      description: 'meta description',
      ogImage: 'og:image',
    }

    const missingList = missing.map((key) => missingLabels[key] || key).join(', ')

    return {
      passed: false,
      message: `Missing meta tags: ${missingList}.`,
      recommendation:
        'Add a descriptive page title, meta description, and og:image tag to improve SEO and ad preview quality on Google and social platforms.',
    }
  },
}
