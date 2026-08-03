/** @type {import('../../_shared/types.js').Rule} */
export const metaPixelRule = {
  id: 'A001',
  name: 'Meta Pixel Detection',
  category: 'ads',
  severity: 'medium',
  /** Excluded from GMC Compliance via modules/ads/rules/resolveAdsRules() */
  metaAdsOnly: true,
  description:
    'Website should have Meta (Facebook) Pixel installed for Meta Ads conversion tracking.',
  check(auditData) {
    const metaPixel = auditData.ads?.metaPixel

    if (metaPixel?.detected) {
      return {
        passed: true,
        message: `Meta Pixel signals detected: ${metaPixel.signals.join(', ')}.`,
      }
    }

    return {
      passed: false,
      message: 'Meta Pixel not detected on the website.',
      recommendation:
        'Install Meta Pixel on your store to track conversions and enable Meta Ads retargeting. Look for fbq() or connect.facebook.net scripts.',
    }
  },
}
