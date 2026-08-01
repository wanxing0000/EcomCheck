/** @type {import('../types.js').Rule} */
export const returnPolicyRule = {
  id: 'G003',
  name: 'Return Policy',
  category: 'gmc',
  severity: 'high',
  description:
    'Website must have a return/refund policy page with sufficient quality for Google Merchant Center.',
  check(auditData) {
    const page = auditData.pages?.refundPolicy
    const content = auditData.pageContent?.refundPolicy
    const policyQuality =
      content?.policyQuality ||
      (content?.fetched
        ? {
            textLength: content.textLength || 0,
            checks: { sufficientLength: (content.textLength || 0) >= 100 },
            qualityScore: 0,
            missing: ['policy analysis unavailable'],
            risks: [],
          }
        : null)

    if (!page?.found || !page.url) {
      return {
        passed: false,
        message: 'No return or refund policy page detected.',
        recommendation:
          'Create a clear return/refund policy page and link it in your footer. Required for Google Merchant Center.',
        policyQuality: policyQuality || {
          textLength: 0,
          checks: {},
          qualityScore: 0,
          missing: ['return policy page'],
          risks: ['No return or refund policy page detected.'],
        },
      }
    }

    if (!content?.fetched) {
      return {
        passed: false,
        message: `Return policy page found at ${page.url} but content could not be fetched.`,
        recommendation: 'Ensure your return policy page is publicly accessible and contains detailed policy text.',
        policyQuality,
      }
    }

    const quality = policyQuality || {}
    const checks = quality.checks || {}
    const qualityScore = quality.qualityScore ?? 0

    if (!checks.sufficientLength) {
      return {
        passed: false,
        message: `Return policy page found but content is too short (${quality.textLength || 0} characters, minimum 100).`,
        recommendation:
          'Expand your return/refund policy with return windows, conditions, refund timelines, and contact details.',
        policyQuality: quality,
      }
    }

    if (!checks.refundKeywords && !checks.returnKeywords) {
      return {
        passed: false,
        message: `Return policy page at ${page.url} lacks clear refund or return language (quality score: ${qualityScore}/100).`,
        recommendation:
          'Add explicit refund and return terms including time limits, item conditions, and how to initiate a return.',
        policyQuality: quality,
      }
    }

    const gaps = (quality.missing || []).filter(
      (item) => item !== 'sufficient content length' && item !== 'refund keywords' && item !== 'return keywords'
    )

    if (gaps.length > 0) {
      return {
        passed: true,
        message: `Return/refund policy found at ${page.url} (quality score: ${qualityScore}/100). Missing: ${gaps.join(', ')}.`,
        policyQuality: quality,
      }
    }

    return {
      passed: true,
      message: `Return/refund policy found at ${page.url} (quality score: ${qualityScore}/100).`,
      policyQuality: quality,
    }
  },
}
