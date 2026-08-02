/** @type {import('../../_shared/types.js').Rule} */
export const paymentInformationRule = {
  id: 'G008',
  name: 'Payment Information',
  category: 'gmc',
  severity: 'medium',
  description:
    'Website should disclose accepted payment methods and billing terms for Google Merchant Center trust requirements.',
  check(auditData) {
    const page = auditData.pages?.paymentPolicy
    const content = auditData.pageContent?.paymentPolicy
    const pageSource = page?.policySource || content?.policySource || 'dedicated'
    const policyQuality =
      content?.policyQuality ||
      (content?.fetched
        ? {
            textLength: content.textLength || 0,
            checks: {},
            qualityScore: 0,
            missing: ['policy analysis unavailable'],
            risks: [],
            pageSource,
          }
        : null)

    if (!page?.found || !page.url) {
      return {
        passed: false,
        message: 'No payment policy or terms page detected.',
        recommendation:
          'Publish a payment policy or terms of sale page listing accepted payment methods and billing terms.',
        policyQuality: policyQuality || {
          textLength: 0,
          checks: {},
          qualityScore: 0,
          missing: ['payment policy page'],
          risks: ['No payment information page detected.'],
          pageSource: 'none',
        },
      }
    }

    if (!content?.fetched) {
      return {
        passed: false,
        message: `Payment page found at ${page.url} but content could not be fetched.`,
        recommendation: 'Ensure your payment or terms page is publicly accessible.',
        policyQuality,
      }
    }

    const quality = { ...policyQuality, pageSource: policyQuality?.pageSource || pageSource }
    const checks = quality.checks || {}
    const qualityScore = quality.qualityScore ?? 0

    if (!checks.sufficientLength) {
      return {
        passed: false,
        message: `Payment page content is too short (${quality.textLength || 0} characters, minimum 80).`,
        recommendation:
          'Expand your payment or terms page with accepted payment methods and billing details.',
        policyQuality: quality,
      }
    }

    if (checks.hasPaymentSignals) {
      const sourceNote =
        pageSource === 'terms-of-service'
          ? ' (via Terms of Service fallback with payment details)'
          : ''
      const gaps = (quality.missing || []).filter((item) => item !== 'actionable payment information')

      if (gaps.length > 0) {
        return {
          passed: true,
          message: `Payment information detected at ${page.url}${sourceNote} (quality score: ${qualityScore}/100). Missing: ${gaps.join(', ')}.`,
          policyQuality: quality,
        }
      }

      return {
        passed: true,
        message: `Payment information detected at ${page.url}${sourceNote} (quality score: ${qualityScore}/100).`,
        policyQuality: quality,
      }
    }

    if (pageSource === 'terms-of-service') {
      return {
        passed: false,
        severity: 'warning',
        message: `Terms of Service page found at ${page.url} but no actionable payment information detected (quality score: ${qualityScore}/100).`,
        recommendation:
          'Add accepted payment methods (credit card, PayPal, etc.) to your terms page or create a dedicated payment policy.',
        policyQuality: quality,
      }
    }

    return {
      passed: false,
      message: `Payment page at ${page.url} lacks clear payment methods or billing terms (quality score: ${qualityScore}/100).`,
      recommendation:
        'List accepted payment methods and billing terms on your payment policy page.',
      policyQuality: quality,
    }
  },
}
