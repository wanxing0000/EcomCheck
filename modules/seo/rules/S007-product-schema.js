function isEcommerceSite(auditData) {
  const platform = auditData.platform?.name
  if (platform === 'shopify' || platform === 'woocommerce') return true

  const audit = auditData.productsAudit
  return (audit?.scannedPages ?? 0) > 0 || (audit?.candidateCount ?? 0) > 0
}

/** @type {import('../../_shared/types.js').Rule} */
export const productSchemaRule = {
  id: 'S007',
  name: 'Product Schema',
  category: 'seo',
  severity: 'medium',
  description: 'E-commerce sites should expose Product structured data for rich search results.',
  check(auditData) {
    if (!isEcommerceSite(auditData)) {
      return {
        passed: true,
        message: 'Not an e-commerce site — Product schema check skipped.',
      }
    }

    const product = auditData.seo?.structuredData?.product
    const productsAudit = auditData.productsAudit

    if (product?.found || (productsAudit?.validProducts ?? 0) > 0) {
      const count = product?.count ?? productsAudit?.validProducts ?? 0
      return {
        passed: true,
        message: `Product structured data found (${count} product signal(s)).`,
      }
    }

    return {
      passed: false,
      message: 'E-commerce site detected but no Product JSON-LD structured data found.',
      recommendation:
        'Add Product JSON-LD to product pages with name, image, offers.price, and offers.availability.',
    }
  },
}
