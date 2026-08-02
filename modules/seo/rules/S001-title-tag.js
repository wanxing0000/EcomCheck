/** @type {import('../../_shared/types.js').Rule} */
export const titleTagRule = {
  id: 'S001',
  name: 'Title Tag',
  category: 'seo',
  severity: 'medium',
  description: 'Homepage should have a descriptive title tag within recommended length limits.',
  check(auditData) {
    const title = auditData.meta?.title?.trim() || auditData.title?.trim() || ''
    const length = auditData.seo?.homepage?.titleLength ?? title.length

    if (!title) {
      return {
        passed: false,
        message: 'Page title tag is missing.',
        recommendation:
          'Add a unique <title> tag to your homepage that describes your store and primary products.',
      }
    }

    if (length < 30) {
      return {
        passed: false,
        message: `Page title is too short (${length} characters). Recommended minimum is 30 characters.`,
        recommendation:
          'Expand your title tag to at least 30 characters with brand name and primary keywords.',
      }
    }

    if (length > 60) {
      return {
        passed: false,
        message: `Page title is too long (${length} characters). Recommended maximum is 60 characters.`,
        recommendation:
          'Shorten your title tag to 60 characters or fewer so it displays fully in search results.',
      }
    }

    return {
      passed: true,
      message: `Page title tag is present and within recommended length (${length} characters).`,
    }
  },
}
