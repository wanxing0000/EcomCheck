/** @type {import('../../_shared/types.js').Rule} */
export const openGraphRule = {
  id: 'S005',
  name: 'Open Graph Tags',
  category: 'seo',
  severity: 'low',
  description: 'Homepage should include Open Graph tags for social sharing previews.',
  check(auditData) {
    const meta = auditData.meta || {}
    const missing = []

    if (!meta.ogTitle?.trim()) missing.push('og:title')
    if (!meta.ogDescription?.trim()) missing.push('og:description')
    if (!meta.ogImage?.trim()) missing.push('og:image')

    if (missing.length === 0) {
      return {
        passed: true,
        message: 'Open Graph tags present: og:title, og:description, og:image.',
      }
    }

    return {
      passed: false,
      message: `Missing Open Graph tags: ${missing.join(', ')}.`,
      recommendation:
        'Add og:title, og:description, and og:image meta tags so links shared on social platforms display rich previews.',
    }
  },
}
