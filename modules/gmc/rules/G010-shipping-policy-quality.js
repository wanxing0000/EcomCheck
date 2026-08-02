/** @type {import('../../_shared/types.js').Rule} */
export const shippingPolicyQualityRule = {
  id: 'G010',
  name: 'Shipping Policy Quality',
  category: 'gmc',
  severity: 'medium',
  description:
    'Shipping policy should include delivery timeframes, regions, and cost information for Google Merchant Center.',
  check(auditData) {
    const page = auditData.pages?.shippingPolicy
    const content = auditData.pageContent?.shippingPolicy
    const policyQuality =
      content?.policyQuality ||
      (content?.fetched
        ? {
            textLength: content.textLength || 0,
            checks: { sufficientLength: (content.textLength || 0) >= 80 },
            qualityScore: 0,
            missing: ['policy analysis unavailable'],
            risks: [],
          }
        : null)

    if (!page?.found || !page.url) {
      return {
        passed: false,
        message: 'No shipping policy page detected for quality review.',
        recommendation:
          'Add a shipping policy page covering delivery regions, costs, and timelines.',
        policyQuality: policyQuality || {
          textLength: 0,
          checks: {},
          qualityScore: 0,
          missing: ['shipping policy page'],
          risks: ['No shipping policy page detected.'],
        },
      }
    }

    if (!content?.fetched) {
      return {
        passed: false,
        message: `Shipping policy page found at ${page.url} but content could not be fetched.`,
        recommendation: 'Ensure your shipping policy page is publicly accessible.',
        policyQuality,
      }
    }

    const quality = policyQuality || {}
    const checks = quality.checks || {}
    const qualityScore = quality.qualityScore ?? 0

    if (!checks.sufficientLength) {
      return {
        passed: false,
        message: `Shipping policy page is too short (${quality.textLength || 0} characters, minimum 80).`,
        recommendation:
          'Expand your shipping policy with delivery timeframes, regions, carriers, and shipping costs.',
        policyQuality: quality,
      }
    }

    if (!checks.shippingKeywords) {
      return {
        passed: false,
        message: `Shipping policy at ${page.url} lacks clear shipping or delivery language (quality score: ${qualityScore}/100).`,
        recommendation:
          'Add explicit shipping and delivery terms including regions served and estimated delivery times.',
        policyQuality: quality,
      }
    }

    const gaps = (quality.missing || []).filter(
      (item) => item !== 'sufficient content length' && item !== 'shipping keywords'
    )

    if (gaps.length > 0) {
      return {
        passed: true,
        message: `Shipping policy found at ${page.url} (quality score: ${qualityScore}/100). Missing: ${gaps.join(', ')}.`,
        policyQuality: quality,
      }
    }

    return {
      passed: true,
      message: `Shipping policy meets quality checks at ${page.url} (quality score: ${qualityScore}/100).`,
      policyQuality: quality,
    }
  },
}
