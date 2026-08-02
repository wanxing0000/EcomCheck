/**
 * Shared helpers for GMC compliance rules.
 */

export function getScannedProductPages(auditData) {
  return auditData.productsAudit?.productPages || []
}

export function isEcommerceSite(auditData) {
  const platform = auditData.platform?.name
  if (platform === 'shopify' || platform === 'woocommerce') return true

  const audit = auditData.productsAudit
  return (audit?.scannedPages ?? 0) > 0 || (audit?.candidateCount ?? 0) > 0
}

/**
 * Summarize purchase flow signals from scanned product pages.
 * @param {object} auditData
 */
export function getPurchaseFlowSummary(auditData) {
  const pages = getScannedProductPages(auditData)
  const pageSummaries = pages.map((page) => ({
    url: page.url,
    addToCart: Boolean(page.signals?.addToCart),
    buyNow: Boolean(page.signals?.buyNow),
  }))

  const withAddToCart = pageSummaries.filter((p) => p.addToCart).length
  const withBuyNow = pageSummaries.filter((p) => p.buyNow).length
  const withPurchaseAction = pageSummaries.filter((p) => p.addToCart || p.buyNow).length

  return {
    scannedPages: auditData.productsAudit?.scannedPages ?? pages.length,
    withAddToCart,
    withBuyNow,
    withPurchaseAction,
    pages: pageSummaries.slice(0, 5),
  }
}

export function getProductSchemas(auditData) {
  const schemas = []
  for (const page of getScannedProductPages(auditData)) {
    for (const product of page.schemas || []) {
      schemas.push({ ...product, pageUrl: page.url })
    }
  }
  return schemas
}

export function pagesWithSchema(auditData) {
  return getScannedProductPages(auditData).filter((p) => p.hasProductSchema)
}

export function countPagesWithSignal(auditData, signal) {
  return getScannedProductPages(auditData).filter((p) => p.signals?.[signal]).length
}
