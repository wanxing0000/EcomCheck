/** @type {import('../../_shared/types.js').Rule} */
export const businessInformationRule = {
  id: 'G007',
  name: 'Business Information',
  category: 'gmc',
  severity: 'medium',
  description:
    'Website should display business contact details (email, phone, address) for Google Merchant Center trust verification.',
  check(auditData) {
    const { contactInfo } = auditData

    const businessInfo = {
      email: (contactInfo?.emails?.length ?? 0) > 0,
      phone: (contactInfo?.phones?.length ?? 0) > 0,
      address: (contactInfo?.addresses?.length ?? 0) > 0,
      details: {
        emails: contactInfo?.emails || [],
        phones: contactInfo?.phones || [],
        addresses: contactInfo?.addresses || [],
      },
      presentCount: 0,
      missing: [],
    }

    if (businessInfo.email) businessInfo.presentCount += 1
    else businessInfo.missing.push('email')

    if (businessInfo.phone) businessInfo.presentCount += 1
    else businessInfo.missing.push('phone')

    if (businessInfo.address) businessInfo.presentCount += 1
    else businessInfo.missing.push('address')

    const found = [
      businessInfo.email && 'email',
      businessInfo.phone && 'phone',
      businessInfo.address && 'address',
    ].filter(Boolean)

    if (businessInfo.presentCount === 3) {
      return {
        passed: true,
        message: 'Business contact information complete: email, phone, and address detected.',
        businessInfo,
      }
    }

    if (businessInfo.presentCount >= 2) {
      return {
        passed: true,
        message: `Business contact information detected (${found.join(', ')}). Missing: ${businessInfo.missing.join(', ')}.`,
        businessInfo,
      }
    }

    if (businessInfo.presentCount === 1) {
      return {
        passed: false,
        message: `Limited business contact information: only ${found[0]} found.`,
        recommendation:
          'Add email, phone, and physical business address to your footer, contact page, or about page for GMC trust verification.',
        businessInfo,
      }
    }

    return {
      passed: false,
      message: 'No business contact information (email, phone, or address) detected.',
      recommendation:
        'Display email, phone number, and business address on your website. Required for Google Merchant Center seller verification.',
      businessInfo,
    }
  },
}
