import {
  analyzeProductPagesTrust,
  PRODUCT_TRUST_PASS_SCORE,
  resolveProductTrustFailureSeverity,
  resolveProductTrustMisrepresentationLevel,
} from './_helpers.js'

/** @type {import('../../_shared/types.js').Rule} */
export const productTrustSignalsRule = {
  id: 'M003',
  name: 'Product Trust Signals',
  category: 'trust',
  severity: 'medium',
  description:
    'Evaluates whether scanned product pages provide substantive product information expected for GMC misrepresentation reviews.',
  check(auditData) {
    const report = analyzeProductPagesTrust(auditData)

    if (report.scannedPages === 0) {
      return {
        passed: false,
        severity: 'medium',
        misrepresentationLevel: 'medium',
        message: report.summaryMessage,
        recommendation: report.summaryRecommendation,
        productTrustReport: report,
      }
    }

    if (report.score >= PRODUCT_TRUST_PASS_SCORE) {
      return {
        passed: true,
        message: report.summaryMessage,
        misrepresentationLevel: 'low',
        productTrustReport: report,
      }
    }

    const gapClassification = report.gapClassification || {
      optimizationMissing: [],
      riskMissing: [],
    }
    const severity = resolveProductTrustFailureSeverity(gapClassification)
    const misrepresentationLevel = resolveProductTrustMisrepresentationLevel(
      gapClassification,
      report.score
    )

    return {
      passed: false,
      severity,
      misrepresentationLevel,
      message: report.summaryMessage,
      recommendation: report.summaryRecommendation,
      productTrustReport: report,
    }
  },
}
