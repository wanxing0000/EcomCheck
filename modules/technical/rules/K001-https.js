/** @type {import('../../_shared/types.js').Rule} */
export const httpsRule = {
  id: 'K001',
  name: 'HTTPS',
  category: 'technical',
  severity: 'high',
  description: 'Website must be served over HTTPS for security and advertising platform compliance.',
  check(auditData) {
    const siteUrl = auditData.url || ''

    try {
      const parsed = new URL(siteUrl)
      if (parsed.protocol === 'https:') {
        return {
          passed: true,
          message: `Website is served over HTTPS (${siteUrl}).`,
        }
      }
    } catch {
      // fall through to failure
    }

    return {
      passed: false,
      message: 'Website is not using HTTPS.',
      recommendation:
        'Enable SSL/TLS and redirect all HTTP traffic to HTTPS. Required for Google Merchant Center, Meta Ads, and customer trust.',
    }
  },
}
