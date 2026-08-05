/**
 * Unified audit evidence builder for GMC / Trust rules.
 * Presentation layer — does not change rule pass/fail outcomes.
 */

const MAX_EVIDENCE_ITEMS = 3

const PAGE_TYPE_LABELS = {
  paymentPolicy: 'Payment Policy',
  shippingPolicy: 'Shipping Policy',
  refundPolicy: 'Refund Policy',
  productPage: 'Product Page',
}

function capitalizeLabel(value) {
  if (!value || typeof value !== 'string') return value
  return value
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function pathnameFromUrl(url) {
  if (!url) return ''
  try {
    return new URL(url).pathname || url
  } catch {
    return url
  }
}

function createEvidenceItem(text, source = '', pageType = '') {
  return {
    text: text || '',
    source,
    pageType,
  }
}

function limitEvidenceItems(items, max = MAX_EVIDENCE_ITEMS) {
  return items.slice(0, max)
}

function dedupeEvidenceItems(items) {
  const seen = new Set()
  const deduped = []

  for (const item of items) {
    const key = `${item.text}|${item.source}|${item.pageType}`
    if (seen.has(key)) continue
    seen.add(key)
    deduped.push(item)
  }

  return deduped
}

function emptyEvidence() {
  return { found: [], missing: [] }
}

function buildPolicySignalEvidence(quality, source, pageType, signalKey, label) {
  const signal = quality?.signals?.[signalKey]
  if (signal?.detected === 'found' && signal.evidence) {
    return createEvidenceItem(signal.evidence, source, pageType)
  }
  if (quality?.checks?.[signalKey === 'paymentMethods' ? 'paymentMethods' : 'shippingCost']) {
    return createEvidenceItem(label, source, pageType)
  }
  return null
}

function buildG008Evidence(auditData, result) {
  const page = auditData.pages?.paymentPolicy
  const quality = result.policyQuality || auditData.pageContent?.paymentPolicy?.policyQuality
  const source = pathnameFromUrl(page?.url)
  const pageType = 'paymentPolicy'
  const found = []
  const missing = []

  if (!page?.found || !page?.url) {
    missing.push(createEvidenceItem('Payment policy page', '', pageType))
    return { found, missing: limitEvidenceItems(missing) }
  }

  const paymentEvidence = buildPolicySignalEvidence(
    quality,
    source,
    pageType,
    'paymentMethods',
    'Payment methods detected'
  )
  if (paymentEvidence) found.push(paymentEvidence)

  if (quality?.checks?.currencyOrPricing) {
    found.push(createEvidenceItem('Currency or pricing terms detected', source, pageType))
  }

  if (quality?.checks?.paymentKeywords) {
    found.push(createEvidenceItem('Payment-related keywords detected', source, pageType))
  }

  for (const item of quality?.missing || []) {
    missing.push(createEvidenceItem(capitalizeLabel(item), source, pageType))
  }

  return {
    found: limitEvidenceItems(dedupeEvidenceItems(found)),
    missing: limitEvidenceItems(dedupeEvidenceItems(missing)),
  }
}

function buildG010Evidence(auditData, result) {
  const page = auditData.pages?.shippingPolicy
  const quality = result.policyQuality || auditData.pageContent?.shippingPolicy?.policyQuality
  const source = pathnameFromUrl(page?.url)
  const pageType = 'shippingPolicy'
  const found = []
  const missing = []

  if (!page?.found || !page?.url) {
    missing.push(createEvidenceItem('Shipping policy page', '', pageType))
    return { found, missing: limitEvidenceItems(missing) }
  }

  const shippingCostEvidence = buildPolicySignalEvidence(
    quality,
    source,
    pageType,
    'shippingCost',
    'Shipping cost terms detected'
  )
  if (shippingCostEvidence) found.push(shippingCostEvidence)

  if (quality?.checks?.deliveryTime) {
    found.push(createEvidenceItem('Delivery timeframes detected', source, pageType))
  }

  if (quality?.checks?.shippingRegions) {
    found.push(createEvidenceItem('Shipping regions detected', source, pageType))
  }

  if (quality?.checks?.shippingKeywords) {
    found.push(createEvidenceItem('Shipping keywords detected', source, pageType))
  }

  for (const item of quality?.missing || []) {
    missing.push(createEvidenceItem(capitalizeLabel(item), source, pageType))
  }

  return {
    found: limitEvidenceItems(dedupeEvidenceItems(found)),
    missing: limitEvidenceItems(dedupeEvidenceItems(missing)),
  }
}

function buildM002Evidence(auditData, result) {
  const policies = result.policyQualityReport?.policies || []
  const found = []
  const missing = []

  for (const policy of policies) {
    const source = pathnameFromUrl(policy.page?.url)
    const pageType = policy.pageKey || policy.id
    const quality = policy.quality

    if (!policy.found) {
      missing.push(createEvidenceItem(`${policy.label} page`, source, pageType))
      continue
    }

    if (policy.id === 'payment') {
      const item = buildPolicySignalEvidence(
        quality,
        source,
        pageType,
        'paymentMethods',
        'Payment methods detected'
      )
      if (item) found.push(item)
    }

    if (policy.id === 'shipping') {
      const item = buildPolicySignalEvidence(
        quality,
        source,
        pageType,
        'shippingCost',
        'Shipping cost terms detected'
      )
      if (item) found.push(item)
    }

    if (policy.id === 'refund' && quality?.returnWindowMatches?.length) {
      found.push(createEvidenceItem(quality.returnWindowMatches[0], source, pageType))
    }

    if (policy.id === 'refund' && quality?.checks?.refundKeywords) {
      found.push(createEvidenceItem('Refund keywords detected', source, pageType))
    }

    for (const item of policy.missing || []) {
      missing.push(createEvidenceItem(`${policy.label}: ${capitalizeLabel(item)}`, source, pageType))
    }
  }

  return {
    found: limitEvidenceItems(dedupeEvidenceItems(found)),
    missing: limitEvidenceItems(dedupeEvidenceItems(missing)),
  }
}

function buildM003Evidence(auditData, result) {
  const productPages = auditData.productsAudit?.productPages || []
  const report = result.productTrustReport
  const found = []
  const missing = []

  for (const page of productPages.slice(0, MAX_EVIDENCE_ITEMS)) {
    const source = pathnameFromUrl(page.url)
    const trust = page.trustContent || {}

    if (trust.descriptionLength > 0) {
      found.push(
        createEvidenceItem(`Product description (${trust.descriptionLength} characters)`, source, 'productPage')
      )
    }

    if (page.signals?.price || page.pricing?.display?.price) {
      found.push(createEvidenceItem('Price detected on product page', source, 'productPage'))
    }

    if ((trust.imageCount ?? 0) > 0) {
      found.push(createEvidenceItem(`${trust.imageCount} product image(s)`, source, 'productPage'))
    }

    if (trust.hasSpecifications) {
      found.push(createEvidenceItem('Specifications detected in product copy', source, 'productPage'))
    }
  }

  for (const factor of report?.factors || []) {
    for (const item of factor.missing || []) {
      missing.push(createEvidenceItem(item, '', 'productPage'))
    }
  }

  if (report?.scannedPages === 0) {
    missing.push(createEvidenceItem('Scanned product pages', '', 'productPage'))
  }

  return {
    found: limitEvidenceItems(dedupeEvidenceItems(found)),
    missing: limitEvidenceItems(dedupeEvidenceItems(missing)),
  }
}

const EVIDENCE_BUILDERS = {
  G008: buildG008Evidence,
  G010: buildG010Evidence,
  M002: buildM002Evidence,
  M003: buildM003Evidence,
}

/**
 * @param {string} ruleId
 * @param {object} auditData
 * @param {object} checkResult
 * @returns {{ found: Array, missing: Array }}
 */
export function buildRuleEvidence(ruleId, auditData, checkResult) {
  const builder = EVIDENCE_BUILDERS[ruleId]
  if (!builder) return emptyEvidence()
  if (checkResult?.evidence?.found || checkResult?.evidence?.missing) {
    return {
      found: limitEvidenceItems(checkResult.evidence.found || []),
      missing: limitEvidenceItems(checkResult.evidence.missing || []),
    }
  }
  return builder(auditData, checkResult)
}

export function getEvidencePageTypeLabel(pageType) {
  return PAGE_TYPE_LABELS[pageType] || capitalizeLabel(pageType || 'Page')
}

export { MAX_EVIDENCE_ITEMS, PAGE_TYPE_LABELS }
