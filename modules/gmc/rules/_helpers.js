/**
 * Shared helpers for GMC compliance rules.
 */

export function getScannedProductPages(auditData) {
  return auditData.productsAudit?.productPages || []
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
