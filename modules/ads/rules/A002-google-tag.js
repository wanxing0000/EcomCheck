/** @type {import('../../_shared/types.js').Rule} */
export const googleTagRule = {
  id: 'A002',
  name: 'Google Tag Detection',
  category: 'ads',
  severity: 'medium',
  description:
    'Website should have Google Tag (gtag.js / GTM) installed for Google Ads conversion tracking.',
  check(auditData) {
    const googleTag = auditData.ads?.googleTag

    if (googleTag?.detected) {
      return {
        passed: true,
        message: `Google Tag signals detected: ${googleTag.signals.join(', ')}.`,
      }
    }

    return {
      passed: false,
      message: 'Google Tag not detected on the website.',
      recommendation:
        'Install Google Tag Manager or gtag.js with your Google Ads conversion ID (AW-) or GA4 ID (G-). Required for Google Ads conversion tracking.',
    }
  },
}
