/** @type {import('../../_shared/types.js').Rule} */
export const metaDescriptionRule = {
  id: 'S002',
  name: 'Meta Description',
  category: 'seo',
  severity: 'medium',
  description: 'Homepage should have a meta description within recommended length limits.',
  check(auditData) {
    const description = auditData.meta?.description?.trim() || auditData.description?.trim() || ''
    const length = auditData.seo?.homepage?.descriptionLength ?? description.length

    if (!description) {
      return {
        passed: false,
        message: 'Meta description tag is missing.',
        recommendation:
          'Add a meta description summarizing your store value proposition and key products.',
      }
    }

    if (length < 120) {
      return {
        passed: false,
        message: `Meta description is too short (${length} characters). Recommended minimum is 120 characters.`,
        recommendation:
          'Expand your meta description to at least 120 characters to improve search snippet quality.',
      }
    }

    if (length > 160) {
      return {
        passed: false,
        message: `Meta description is too long (${length} characters). Recommended maximum is 160 characters.`,
        recommendation:
          'Shorten your meta description to 160 characters or fewer to avoid truncation in search results.',
      }
    }

    return {
      passed: true,
      message: `Meta description is present and within recommended length (${length} characters).`,
    }
  },
}
