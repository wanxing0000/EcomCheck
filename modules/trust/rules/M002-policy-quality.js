import {
  buildPolicyQualitySnapshot,
  misrepresentationLevelToSeverity,
  summarizePolicyQuality,
} from './_helpers.js'

function formatPolicyLine(policy) {
  if (!policy.found) return `${policy.label}: missing page`
  if (policy.contentFetchStatus === 'failed') {
    return `${policy.label}: page found, content unavailable to crawler`
  }
  if (policy.contentFetchStatus === 'empty') {
    return `${policy.label}: empty content`
  }
  return `${policy.label}: ${policy.qualityScore}/100`
}

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
    const { averageScore, lowestScore, riskLevel } = summary

    const policyLines = policies.map(formatPolicyLine)
    const fetchFailedPolicies = policies.filter((policy) => policy.contentFetchStatus === 'failed')
    const scorablePolicies = policies.filter((policy) => policy.contentFetchStatus === 'success')
    const weakPolicies = scorablePolicies.filter((policy) => (policy.qualityScore ?? 0) < 70)

    if (summary.fetchUnavailableOnly) {
      return {
        passed: true,
        severity: 'low',
        misrepresentationLevel: 'low',
        message: `${fetchFailedPolicies.map((policy) => policy.label).join(', ')}: ${fetchFailedPolicies[0].analysisMessage}`,
        recommendation:
          'Ensure refund, shipping, and payment policy pages are publicly accessible without bot blocking or login requirements.',
        policyQualityReport: summary,
      }
    }

    if (riskLevel === 'low' && (scorablePolicies.length === 0 || lowestScore >= 70)) {
      const fetchNotes =
        fetchFailedPolicies.length > 0
          ? ` ${fetchFailedPolicies.map((policy) => `${policy.label}: ${policy.analysisMessage}`).join(' ')}`
          : ''

      return {
        passed: true,
        message:
          scorablePolicies.length > 0
            ? `Store policies meet quality expectations (average ${averageScore}/100). ${policyLines.join(' · ')}.${fetchNotes}`
            : `Policy pages were reviewed with no quality blockers detected. ${policyLines.join(' · ')}.${fetchNotes}`,
        misrepresentationLevel: 'low',
        policyQualityReport: summary,
      }
    }

    const severity = misrepresentationLevelToSeverity(riskLevel)
    const fetchNotes =
      fetchFailedPolicies.length > 0
        ? ` ${fetchFailedPolicies.map((policy) => `${policy.label}: ${policy.analysisMessage}`).join(' ')}`
        : ''

    return {
      passed: false,
      severity,
      misrepresentationLevel: riskLevel,
      message: `Policy quality needs improvement (average ${averageScore}/100, lowest ${lowestScore}/100). ${policyLines.join(' · ')}.${fetchNotes}`,
      recommendation:
        weakPolicies.length > 0
          ? `Strengthen ${weakPolicies.map((policy) => policy.label.toLowerCase()).join(', ')} with return windows, shipping costs, delivery times, payment methods, and contact details.`
          : 'Expand refund, shipping, and payment policies with clear terms, timelines, and contact information.',
      policyQualityReport: summary,
    }
  },
}
