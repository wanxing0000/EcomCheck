/**
 * Product-level compliance rules — evaluate analyzed product pages.
 * Follows existing rule patterns; separate from website-level rule engine.
 *
 * Note: G009/G010 are already allocated to website rules (Purchase Flow, Shipping Policy).
 * Product-level GMC rules use G011 (schema completeness) and G012 (identifier quality).
 */

const SCHEMA_REQUIRED_FIELDS = [
  'name',
  'image',
  'description',
  'sku',
  'brand',
  'offers',
  'price',
  'availability',
]

const IDENTIFIER_FIELDS = ['brand', 'sku', 'gtin', 'mpn']

const MIN_DESCRIPTION_WARNING_LENGTH = 120
const MIN_TITLE_LENGTH = 10

function hasHighExtractionConfidence(product) {
  return product?.extractionConfidence === 'high' || product?.confidence === 'high'
}

function isConfirmedMissing(signal) {
  return signal?.found === false
}

function resolveDescriptionLength(product) {
  const description = product?.productSignals?.description || {}
  const quality = product?.quality || {}

  if ((description.visibleLength ?? 0) > 0) {
    return description.visibleLength
  }

  return Math.max(description.length ?? 0, quality.descriptionLength ?? 0)
}

/** @type {import('../modules/_shared/types.js').Rule[]} */
export const productComplianceRuleDefinitions = [
  {
    id: 'G011',
    name: 'Product Schema Completeness',
    category: 'gmc',
    severity: 'high',
    description: 'Detect incomplete Product structured data on product detail pages.',
    check(product) {
      if (!hasHighExtractionConfidence(product)) {
        return {
          passed: true,
          message: 'Structured data completeness not evaluated — page content was not fully extracted.',
        }
      }

      if (!product?.structuredData?.found) {
        return {
          passed: false,
          severity: 'high',
          message: 'Product structured data is incomplete',
          missingFields: [...SCHEMA_REQUIRED_FIELDS, 'gtin', 'mpn'],
        }
      }

      const missingFields = product.structuredData.missingFields || []
      const importantMissing = missingFields.filter((field) =>
        SCHEMA_REQUIRED_FIELDS.includes(field)
      )

      if (importantMissing.length > 0) {
        return {
          passed: false,
          severity: 'high',
          message: 'Product structured data is incomplete',
          missingFields: importantMissing,
        }
      }

      return {
        passed: true,
        message: 'Product structured data includes required fields.',
      }
    },
  },
  {
    id: 'G012',
    name: 'Product Identifier Quality',
    category: 'gmc',
    severity: 'medium',
    description: 'Detect missing product identifiers at the product page level.',
    check(product) {
      if (!hasHighExtractionConfidence(product)) {
        return {
          passed: true,
          message: 'Product identifiers not evaluated — page content was not fully extracted.',
        }
      }

      const missing = []
      const signals = product?.productSignals || {}

      if (isConfirmedMissing(signals.brand)) missing.push('Brand')
      if (isConfirmedMissing(signals.sku)) missing.push('SKU')
      if (isConfirmedMissing(signals.gtin)) missing.push('GTIN')
      if (isConfirmedMissing(signals.mpn)) missing.push('MPN')

      if (missing.length === 0) {
        return {
          passed: true,
          message: 'Product identifiers present in structured data.',
        }
      }

      return {
        passed: false,
        severity: missing.includes('GTIN') || missing.includes('Brand') ? 'medium' : 'warning',
        message: `Missing product identifiers: ${missing.join(', ')}`,
        missing,
      }
    },
  },
  {
    id: 'M004',
    name: 'Product Content Quality',
    category: 'trust',
    severity: 'warning',
    description: 'Detect weak or insufficient measurable product content signals.',
    check(product) {
      if (!hasHighExtractionConfidence(product)) {
        return {
          passed: true,
          message: 'Product content quality not evaluated — page content was not fully extracted.',
        }
      }

      const missing = []
      const warnings = []
      const quality = product?.quality || {}
      const description = product?.productSignals?.description || {}
      const descriptionLength = resolveDescriptionLength(product)

      if (isConfirmedMissing(description)) {
        missing.push('Description')
      } else if (description.found === true && descriptionLength < MIN_DESCRIPTION_WARNING_LENGTH) {
        warnings.push('Product description may be insufficient')
      }

      if (!quality.hasSpecifications) missing.push('Specifications')
      if (!quality.hasMaterial) missing.push('Material')
      if (!quality.hasSize) missing.push('Size information')

      if (missing.length === 0 && warnings.length === 0) {
        return {
          passed: true,
          message: 'Product content signals meet baseline measurable thresholds.',
        }
      }

      return {
        passed: false,
        severity: 'warning',
        message: warnings[0] || 'Product content signals are incomplete',
        missing,
        warnings,
      }
    },
  },
  {
    id: 'M005',
    name: 'Product Trust Signals',
    category: 'trust',
    severity: 'warning',
    description: 'Detect missing product trust elements on product detail pages.',
    check(product) {
      if (!hasHighExtractionConfidence(product)) {
        return {
          passed: true,
          message: 'Product trust signals not evaluated — page content was not fully extracted.',
        }
      }

      const missing = []
      const quality = product?.quality || {}

      if (!quality.hasReviews) missing.push('Reviews')
      if (!quality.hasWarranty) missing.push('Warranty information')
      if (!quality.hasReturnInfo) missing.push('Return information')

      if (missing.length === 0) {
        return {
          passed: true,
          message: 'Baseline product trust signals detected.',
        }
      }

      return {
        passed: false,
        severity: 'warning',
        message: 'Missing product trust signals',
        missing,
      }
    },
  },
  {
    id: 'G013',
    name: 'Product Price Consistency',
    category: 'gmc',
    severity: 'medium',
    description: 'Detect missing or inconsistent product pricing signals.',
    check(product) {
      if (!hasHighExtractionConfidence(product)) {
        return {
          passed: true,
          message: 'Product price consistency not evaluated — page content was not fully extracted.',
        }
      }

      const price = product?.productSignals?.price || {}
      const consistency = product?.priceConsistency || {}
      const missing = []
      const warnings = []

      if (isConfirmedMissing(price) || consistency.missingPrice) {
        missing.push('Price')
      }

      if (consistency.checked && consistency.consistent === false) {
        warnings.push('Visible price does not match schema price')
      }

      if (missing.length === 0 && warnings.length === 0) {
        return {
          passed: true,
          message: 'Product price signals are present and consistent.',
        }
      }

      return {
        passed: false,
        severity: missing.length > 0 ? 'medium' : 'warning',
        message: warnings[0] || 'Product price is missing',
        missing,
        warnings,
      }
    },
  },
  {
    id: 'G014',
    name: 'Product Availability Consistency',
    category: 'gmc',
    severity: 'medium',
    description: 'Detect missing or inconsistent product availability signals.',
    check(product) {
      if (!hasHighExtractionConfidence(product)) {
        return {
          passed: true,
          message: 'Product availability consistency not evaluated — page content was not fully extracted.',
        }
      }

      const availability = product?.productSignals?.availability || {}
      const consistency = product?.availabilityConsistency || {}
      const missing = []
      const warnings = []

      if (isConfirmedMissing(availability) || consistency.missingAvailability) {
        missing.push('Availability')
      }

      if (consistency.checked && consistency.consistent === false) {
        warnings.push('Visible availability does not match schema availability')
      }

      if (missing.length === 0 && warnings.length === 0) {
        return {
          passed: true,
          message: 'Product availability signals are present and consistent.',
        }
      }

      return {
        passed: false,
        severity: missing.length > 0 ? 'medium' : 'warning',
        message: warnings[0] || 'Product availability is missing',
        missing,
        warnings,
      }
    },
  },
  {
    id: 'M006',
    name: 'Product Image Quality',
    category: 'trust',
    severity: 'warning',
    description: 'Detect missing product images or image accessibility signals.',
    check(product) {
      if (!hasHighExtractionConfidence(product)) {
        return {
          passed: true,
          message: 'Product image quality not evaluated — page content was not fully extracted.',
        }
      }

      const quality = product?.quality || {}
      const missing = []

      if ((quality.imageCount ?? 0) === 0) {
        missing.push('Product images')
      } else if (!quality.hasAltText) {
        missing.push('Image alt text')
      }

      if (missing.length === 0) {
        return {
          passed: true,
          message: 'Product images include baseline accessibility signals.',
        }
      }

      return {
        passed: false,
        severity: 'warning',
        message: 'Product image quality signals are incomplete',
        missing,
      }
    },
  },
  {
    id: 'M007',
    name: 'Product Title Quality',
    category: 'trust',
    severity: 'warning',
    description: 'Detect missing or weak measurable product title signals.',
    check(product) {
      if (!hasHighExtractionConfidence(product)) {
        return {
          passed: true,
          message: 'Product title quality not evaluated — page content was not fully extracted.',
        }
      }

      const title = product?.productSignals?.title || {}
      const missing = []
      const warnings = []

      if (title.isPlaceholder) {
        warnings.push('Product title appears to be a placeholder')
      } else if (isConfirmedMissing(title)) {
        missing.push('Title')
      } else if ((title.length ?? 0) > 0 && (title.length ?? 0) < MIN_TITLE_LENGTH) {
        warnings.push('Product title may be too short')
      }

      if (missing.length === 0 && warnings.length === 0) {
        return {
          passed: true,
          message: 'Product title meets baseline measurable thresholds.',
        }
      }

      return {
        passed: false,
        severity: 'warning',
        message: warnings[0] || 'Product title is missing',
        missing,
        warnings,
      }
    },
  },
]

function normalizeProductIssue(rule, product, result) {
  if (result.passed) return null

  return {
    ruleId: rule.id,
    ruleName: rule.name,
    productUrl: product.url,
    category: rule.category,
    severity: result.severity || rule.severity,
    message: result.message,
    missingFields: result.missingFields || null,
    missing: result.missing || null,
    warnings: result.warnings || null,
  }
}

/**
 * Run product-level compliance rules against analyzed product pages.
 * @param {{ products?: object[] }|null} productAnalysis
 */
export function runProductComplianceRules(productAnalysis = null) {
  const analyzedProducts = productAnalysis?.products || []

  if (analyzedProducts.length === 0) {
    return {
      products: [],
      summary: {
        analyzedProducts: 0,
        productsWithIssues: 0,
        totalIssues: 0,
        byRuleId: {},
      },
    }
  }

  const products = analyzedProducts.map((product) => {
    const issues = []

    for (const rule of productComplianceRuleDefinitions) {
      const result = rule.check(product)
      const issue = normalizeProductIssue(rule, product, result)
      if (issue) issues.push(issue)
    }

    return {
      url: product.url,
      issues,
    }
  })

  const totalIssues = products.reduce((sum, product) => sum + product.issues.length, 0)
  const byRuleId = {}

  for (const product of products) {
    for (const issue of product.issues) {
      byRuleId[issue.ruleId] = (byRuleId[issue.ruleId] || 0) + 1
    }
  }

  return {
    products,
    summary: {
      analyzedProducts: products.length,
      productsWithIssues: products.filter((product) => product.issues.length > 0).length,
      totalIssues,
      byRuleId,
    },
  }
}

export {
  SCHEMA_REQUIRED_FIELDS,
  IDENTIFIER_FIELDS,
  MIN_DESCRIPTION_WARNING_LENGTH,
}
