function isAbsoluteUrl(value) {
  if (!value?.trim()) return false
  try {
    const url = new URL(value.trim())
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

/** @type {import('../../_shared/types.js').Rule} */
export const canonicalRule = {
  id: 'S004',
  name: 'Canonical URL',
  category: 'seo',
  severity: 'low',
  description: 'Homepage should declare a canonical URL to consolidate duplicate URLs.',
  check(auditData) {
    const canonical = auditData.meta?.canonical?.trim() || ''

    if (!canonical) {
      return {
        passed: false,
        message: 'Canonical link tag is missing.',
        recommendation:
          'Add <link rel="canonical"> pointing to the preferred homepage URL to avoid duplicate content issues.',
      }
    }

    if (!isAbsoluteUrl(canonical)) {
      return {
        passed: false,
        message: `Canonical URL is not an absolute URL: ${canonical}`,
        recommendation:
          'Use a full absolute URL (https://example.com/) in your canonical link tag.',
      }
    }

    return {
      passed: true,
      message: `Canonical URL is present: ${canonical}`,
    }
  },
}
