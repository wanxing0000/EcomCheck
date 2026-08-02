/** @type {import('../../_shared/types.js').Rule} */
export const organizationSchemaRule = {
  id: 'S006',
  name: 'Organization Schema',
  category: 'seo',
  severity: 'low',
  description: 'Homepage should include Organization structured data for brand entity signals.',
  check(auditData) {
    const organization = auditData.seo?.structuredData?.organization

    if (organization?.found) {
      return {
        passed: true,
        message: `Organization JSON-LD found (source: ${organization.source || 'json-ld'}).`,
      }
    }

    return {
      passed: false,
      message: 'No Organization JSON-LD structured data found on the homepage.',
      recommendation:
        'Add Organization or LocalBusiness JSON-LD with your brand name, logo, and contact details.',
    }
  },
}
