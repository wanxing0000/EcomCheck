/** @type {import('../../_shared/types.js').Rule} */
export const h1StructureRule = {
  id: 'S003',
  name: 'H1 Structure',
  category: 'seo',
  severity: 'medium',
  description: 'Homepage should have exactly one H1 heading for clear page structure.',
  check(auditData) {
    const h1Count = auditData.seo?.homepage?.h1Count ?? 0

    if (h1Count === 0) {
      return {
        passed: false,
        message: 'No H1 heading found on the homepage.',
        recommendation:
          'Add a single H1 heading that clearly describes the main topic of your homepage.',
      }
    }

    if (h1Count > 1) {
      return {
        passed: false,
        message: `Multiple H1 headings found (${h1Count}). Use a single primary H1 per page.`,
        recommendation:
          'Keep one H1 for the main page topic and use H2/H3 for subsections to improve SEO structure.',
      }
    }

    return {
      passed: true,
      message: 'Homepage has a single H1 heading.',
    }
  },
}
