import {
  buildPolicyQualitySnapshot,
  buildPolicyQualityMessage,
  buildPolicyQualityRecommendation,
  resolvePolicyQualityOutcome,
  summarizePolicyQuality,
} from './_helpers.js'

/** @type {import('../../_shared/types.js').Rule} */
export const policyQualityRule = {
  id: 'M002',
  name: 'Policy Quality',
  category: 'trust',
  severity: 'medium',
  description:
    'Analyzes refund, shipping, and payment policy depth — not just page presence — for GMC misrepresentation risk.',
  check(auditData) {
    const policies = buildPolicyQualitySnapshot(auditData)
    const summary = summarizePolicyQuality(policies)
    const fetchFailedPolicies = policies.filter((policy) => policy.contentFetchStatus === 'failed')
    const outcome = resolvePolicyQualityOutcome(policies, summary)
    const { averageScore, policyGapClassification } = summary
    const gapClassification = outcome.gapClassification

    const enrichedSummary = {
      ...summary,
      policyGapClassification: gapClassification,
      outcome: outcome.outcome,
      riskLevel: outcome.misrepresentationLevel,
    }

    if (summary.fetchUnavailableOnly) {
      return {
        passed: true,
        severity: 'low',
        misrepresentationLevel: 'low',
        message: `${fetchFailedPolicies.map((policy) => policy.label).join(', ')}: ${fetchFailedPolicies[0].analysisMessage}`,
        recommendation:
          'Ensure refund, shipping, and payment policy pages are publicly accessible without bot blocking or login requirements.',
        policyQualityReport: enrichedSummary,
      }
    }

    const message = buildPolicyQualityMessage({
      policies,
      averageScore,
      outcome: outcome.outcome,
      gapClassification,
      fetchFailedPolicies,
    })

    const recommendation = buildPolicyQualityRecommendation(outcome.outcome, gapClassification, policies)

    if (outcome.passed) {
      return {
        passed: true,
        severity: outcome.severity,
        message,
        misrepresentationLevel: outcome.misrepresentationLevel,
        recommendation,
        policyQualityReport: enrichedSummary,
      }
    }

    return {
      passed: false,
      severity: outcome.severity,
      misrepresentationLevel: outcome.misrepresentationLevel,
      message,
      recommendation,
      policyQualityReport: enrichedSummary,
    }
  },
}
