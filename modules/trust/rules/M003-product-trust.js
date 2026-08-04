import {
  analyzeProductPagesTrust,
  misrepresentationLevelToSeverity,
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

    if (report.riskLevel === 'low') {
      return {
        passed: true,
        message: report.summaryMessage,
        misrepresentationLevel: 'low',
        productTrustReport: report,
      }
    }

    const severity = misrepresentationLevelToSeverity(report.riskLevel)

    return {
      passed: false,
      severity,
      misrepresentationLevel: report.riskLevel,
      message: report.summaryMessage,
      recommendation: report.summaryRecommendation,
      productTrustReport: report,
    }
  },
}
