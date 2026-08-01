/**
 * Build human-readable detection source summary for debug/report.
 * @param {object} auditData
 */
export function buildDetectionSources(auditData) {
  const contact = { email: [], phone: [], address: [] }

  for (const item of auditData.contactInfo?.sources || []) {
    const bucket = contact[item.type]
    if (!bucket) continue
    if (bucket.some((x) => x.value === item.value && x.source === item.source)) continue
    bucket.push({
      found: true,
      value: item.value,
      source: item.source,
      page: item.page,
    })
  }

  const policies = {}
  for (const type of ['privacyPolicy', 'refundPolicy', 'shippingPolicy']) {
    const page = auditData.pages?.[type]
    const items = []

    if (page?.found) {
      items.push({
        found: true,
        source: page.matchedKeyword?.includes('footer') ? 'footer link' : 'url match',
        url: page.url,
        matchedKeyword: page.matchedKeyword || '',
      })
    }

    for (const candidate of auditData.policyCandidates || []) {
      const candidateType = candidate.type || candidate.pageType
      if (candidateType !== type) continue
      if (items.some((x) => x.url === candidate.url)) continue
      items.push({
        found: true,
        source: candidate.matchedKeyword?.includes('footer') ? 'footer link' : 'link text/url',
        url: candidate.url,
        text: candidate.text,
        matchedKeyword: candidate.matchedKeyword,
      })
    }

    policies[type] = items
  }

  const productPages = auditData.productsAudit?.productPages || []
  const productSignals = new Set()
  if (productPages.some((p) => p.hasProductSchema || p.signals?.schema)) {
    productSignals.add('JSON-LD')
  }
  if (productPages.some((p) => p.signals?.addToCart)) {
    productSignals.add('Add to Cart')
  }

  const platform = auditData.platform?.name
  if (platform === 'woocommerce') productSignals.add('WooCommerce /product/')
  if (platform === 'shopify') productSignals.add('Shopify /products/')

  for (const page of productPages) {
    if (page.pricing?.schema?.price != null) productSignals.add('Schema price')
    if (page.pricing?.display?.price != null) productSignals.add('Display price')
  }

  return {
    contact,
    policies,
    products: {
      platform: platform || 'unknown',
      candidates: auditData.productsAudit?.candidateCount ?? 0,
      scanned: auditData.productsAudit?.scannedPages ?? 0,
      withSchema: auditData.productsAudit?.summary?.withSchema ?? 0,
      signals: [...productSignals],
    },
  }
}
