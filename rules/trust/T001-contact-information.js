/** @type {import('../types.js').Rule} */
export const contactInformationRule = {
  id: 'T001',
  name: 'Contact Information',
  category: 'trust',
  severity: 'high',
  description:
    'Website must display at least one form of contact information (email, phone, or physical address).',
  check(auditData) {
    const { contactInfo } = auditData
    const hasEmail = (contactInfo?.emails?.length ?? 0) > 0
    const hasPhone = (contactInfo?.phones?.length ?? 0) > 0
    const hasAddress = (contactInfo?.addresses?.length ?? 0) > 0

    if (hasEmail || hasPhone || hasAddress) {
      const found = [
        hasEmail && 'email',
        hasPhone && 'phone',
        hasAddress && 'address',
      ].filter(Boolean)

      return {
        passed: true,
        message: `Contact information detected: ${found.join(', ')}.`,
      }
    }

    return {
      passed: false,
      message: 'No email, phone number, or physical address found on the website.',
      recommendation:
        'Add contact information (email, phone, or business address) to your footer, contact page, or about page. Required for Google Merchant Center and Meta Ads trust verification.',
    }
  },
}
