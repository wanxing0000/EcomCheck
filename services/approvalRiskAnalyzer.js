/**
 * GMC Approval Risk Intelligence — independent analysis layer.
 * Does not change rule pass/fail outcomes or gmcRiskScore calculation.
 */

import { GMC_MISREPRESENTATION_RULE_IDS, GMC_ADVISORY_RULE_IDS } from './gmcReportBuilder.js'

const RISK_FACTOR_PRIORITY = {
  M001: 5,
  M002: 6,
  M003: 7,
  G001: 10,
  G002: 15,
  G006: 16,
  G003: 20,
  G004: 25,
  G008: 30,
  G010: 32,
  T001: 35,
  P002: 36,
  P003: 37,
  G009: 40,
  G007: 50,
  G005: 55,
}

const RISK_FACTOR_META = {
  M001: {
    title: 'Business Identity',
    defaultImpact: 'May trigger misrepresentation review during Merchant Center verification.',
  },
  M002: {
    title: 'Policy Transparency',
    defaultImpact: 'May reduce trust evaluation during Merchant Center review.',
  },
  M003: {
    title: 'Product Trust Signals',
    defaultImpact: 'May affect product listing quality review.',
  },
  G001: { title: 'Product Price Data', defaultImpact: 'May cause product disapprovals in Google Shopping.' },
  G002: { title: 'Product Availability', defaultImpact: 'May cause listing suspensions or poor ad performance.' },
  G003: { title: 'Return Policy', defaultImpact: 'May block Merchant Center approval.' },
  G004: { title: 'Shipping Policy', defaultImpact: 'May block Merchant Center approval.' },
  G006: { title: 'Price Consistency', defaultImpact: 'May cause GMC disapprovals and account warnings.' },
  G007: { title: 'Business Information', defaultImpact: 'May delay Merchant Center verification.' },
  G008: { title: 'Payment Transparency', defaultImpact: 'May fail GMC website requirement checks.' },
  G009: { title: 'Purchase Flow', defaultImpact: 'May trigger misrepresentation concerns in Google Shopping.' },
  G010: { title: 'Shipping Policy Quality', defaultImpact: 'May reduce approval probability.' },
  G005: { title: 'Product Identifiers', defaultImpact: 'May reduce Shopping ad visibility.' },
  T001: { title: 'Contact Information', defaultImpact: 'May block Merchant Center approval.' },
  T002: { title: 'About Page', defaultImpact: 'May weaken trust during Merchant Center review.' },
  P001: { title: 'Privacy Policy', defaultImpact: 'May reduce platform trust during review.' },
  P002: { title: 'Refund Policy Page', defaultImpact: 'May block Merchant Center approval.' },
  P003: { title: 'Shipping Policy Page', defaultImpact: 'May block Merchant Center approval.' },
}

function getFailedRules(ruleResults) {
  return ruleResults.filter((rule) => !rule.passed && rule.category !== 'seo')
}

function isMissingPolicyPage(rule) {
  if (!rule || rule.passed) return false
  const message = rule.message || ''
  return /no .+ detected/i.test(message) || /missing page/i.test(message)
}

function isM002MissingKeyPolicies(rule) {
  if (!rule || rule.passed || rule.id !== 'M002') return false

  const policies = rule.policyQualityReport?.policies
  if (Array.isArray(policies)) {
    return policies.some((policy) => !policy.found)
  }

  return /missing page/i.test(rule.message || '')
}

function isM003MassProductTrustGap(rule) {
  if (!rule || rule.passed || rule.id !== 'M003') return false

  const level = rule.misrepresentationLevel || rule.severity || rule.productTrustReport?.riskLevel
  return level === 'critical' || level === 'high'
}

function isMediumMisrepresentation(rule) {
  if (!rule || rule.passed || !GMC_MISREPRESENTATION_RULE_IDS.has(rule.id)) return false
  const level = rule.misrepresentationLevel || rule.severity
  return level === 'medium'
}

const REFUND_POLICY_BLOCKER_IDS = new Set(['G003', 'P002'])
const SHIPPING_POLICY_BLOCKER_IDS = new Set(['G004', 'P003'])
const MEDIUM_APPROVAL_RULE_IDS = new Set(['G005', 'G008', 'G010'])
const GMC_CATEGORY = 'gmc'

function isCriticalOrHighSeverity(value) {
  return value === 'critical' || value === 'high'
}

function isMissingRefundPolicy(rule) {
  if (!rule || rule.passed) return false
  if (!REFUND_POLICY_BLOCKER_IDS.has(rule.id)) return false
  return isMissingPolicyPage(rule)
}

function isMissingShippingPolicy(rule) {
  if (!rule || rule.passed) return false
  if (!SHIPPING_POLICY_BLOCKER_IDS.has(rule.id)) return false
  return isMissingPolicyPage(rule)
}

function isMissingContactInformation(rule) {
  return Boolean(rule && !rule.passed && rule.id === 'T001')
}

function isPurchaseFlowBlocker(rule) {
  return Boolean(rule && !rule.passed && rule.id === 'G009')
}

function isSeriousIdentityIssue(rule) {
  if (!rule || rule.passed) return false
  if (rule.id === 'M001') {
    return isCriticalOrHighSeverity(rule.misrepresentationLevel || rule.severity)
  }
  if (isM002MissingKeyPolicies(rule)) return true
  if (isM003MassProductTrustGap(rule)) return true
  return false
}

function isHighApprovalBlockerRule(rule) {
  if (!rule || rule.passed) return false
  if (isSeriousIdentityIssue(rule)) return true
  if (isMissingRefundPolicy(rule)) return true
  if (isMissingShippingPolicy(rule)) return true
  if (isMissingContactInformation(rule)) return true
  if (isPurchaseFlowBlocker(rule)) return true
  return false
}

function isMediumGmcRule(rule) {
  if (!rule || rule.passed || rule.category !== GMC_CATEGORY) return false
  return rule.severity === 'medium' || rule.severity === 'warning'
}

function isMediumApprovalRule(rule) {
  if (!rule || rule.passed) return false
  if (MEDIUM_APPROVAL_RULE_IDS.has(rule.id)) return true
  if (isMediumMisrepresentation(rule)) return true
  if (isMediumGmcRule(rule)) return true
  return false
}

function isAdvisoryFailure(ruleId) {
  return GMC_ADVISORY_RULE_IDS.has(ruleId)
}

function normalizeFactorSeverity(rule, issue) {
  if (isHighApprovalBlockerRule(rule)) {
    return 'high'
  }

  if (MEDIUM_APPROVAL_RULE_IDS.has(rule.id)) {
    return 'medium'
  }

  if (GMC_MISREPRESENTATION_RULE_IDS.has(rule.id)) {
    const level = rule.misrepresentationLevel || rule.severity
    if (level === 'medium') return 'medium'
    return 'low'
  }

  if (isAdvisoryFailure(rule.id)) {
    return 'low'
  }

  if (rule.category === GMC_CATEGORY && (rule.severity === 'medium' || rule.severity === 'warning')) {
    return 'medium'
  }

  if (isCriticalOrHighSeverity(rule.severity) || isCriticalOrHighSeverity(issue?.severity)) {
    return 'medium'
  }

  if (rule.severity === 'low') return 'low'
  return 'medium'
}

function toRiskFactor(rule, issue) {
  const meta = RISK_FACTOR_META[rule.id] || {
    title: rule.name || issue?.title || rule.id,
    defaultImpact: issue?.impact || 'May affect Merchant Center approval readiness.',
  }

  return {
    id: rule.id,
    title: meta.title,
    severity: normalizeFactorSeverity(rule, issue),
    reason: rule.message || issue?.message || '',
    impact: issue?.impact || meta.defaultImpact,
    recommendation: rule.recommendation || issue?.fixSuggestion || '',
  }
}

function sortRiskFactors(factors) {
  const severityOrder = { high: 0, medium: 1, low: 2 }

  return [...factors].sort((a, b) => {
    const severityDiff = (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9)
    if (severityDiff !== 0) return severityDiff
    return (RISK_FACTOR_PRIORITY[a.id] ?? 999) - (RISK_FACTOR_PRIORITY[b.id] ?? 999)
  })
}

function buildRiskFactors(complianceIssues, ruleResults) {
  const failedRules = getFailedRules(ruleResults)
  const issueById = new Map(complianceIssues.map((issue) => [issue.id, issue]))
  const seen = new Set()
  const factors = []

  for (const rule of failedRules) {
    if (seen.has(rule.id)) continue
    if (rule.id === 'M002' && rule.message?.includes('unavailable to crawler')) continue

    seen.add(rule.id)
    factors.push(toRiskFactor(rule, issueById.get(rule.id)))
  }

  return sortRiskFactors(factors)
}

function hasOnlyAdvisoryFailures(failedRules) {
  return failedRules.length > 0 && failedRules.every((rule) => isAdvisoryFailure(rule.id))
}

function calculateApprovalRiskLevel(ruleResults, riskFactors) {
  const failedRules = getFailedRules(ruleResults)

  if (failedRules.length === 0) {
    return 'low'
  }

  const hasHighSeverityFactor = riskFactors.some((factor) => factor.severity === 'high')
  const hasHighBlockerRule = failedRules.some((rule) => isHighApprovalBlockerRule(rule))

  if (hasHighSeverityFactor || hasHighBlockerRule) {
    return 'high'
  }

  const hasMediumSeverityFactor = riskFactors.some((factor) => factor.severity === 'medium')
  const hasMediumTrigger = failedRules.some((rule) => isMediumApprovalRule(rule))

  if (hasMediumSeverityFactor || hasMediumTrigger) {
    return 'medium'
  }

  if (hasOnlyAdvisoryFailures(failedRules)) {
    return 'low'
  }

  return 'low'
}

function buildApprovalSummary(level, riskFactors) {
  if (level === 'low') {
    if (riskFactors.length === 0) {
      return 'Store appears ready for Merchant Center submission with no major approval blockers detected.'
    }
    return 'Store appears mostly ready for Merchant Center, with only minor advisory improvements suggested.'
  }

  if (level === 'medium') {
    return 'Store appears mostly ready but several trust or policy signals may affect Merchant Center approval.'
  }

  return 'Store has significant approval risks that should be resolved before submitting to Google Merchant Center.'
}

function resolveReadinessScore(gmcRiskScore) {
  if (gmcRiskScore == null || Number.isNaN(Number(gmcRiskScore))) {
    return null
  }
  return Math.max(0, Math.min(100, Math.round(Number(gmcRiskScore))))
}

/**
 * Build GMC approval risk intelligence summary.
 * @param {object} params
 * @param {import('../rules/types.js').RuleResult[]} params.ruleResults
 * @param {Array} params.complianceIssues - enriched compliance issues
 * @param {number|null} [params.gmcRiskScore]
 * @param {{ mode?: string }} [params.auditContext]
 */
export function analyzeApprovalRisk({
  ruleResults,
  complianceIssues,
  gmcRiskScore = null,
  auditContext = {},
}) {
  if (auditContext.mode !== 'gmc') {
    return null
  }

  const riskFactors = buildRiskFactors(complianceIssues, ruleResults)
  const readinessScore = resolveReadinessScore(gmcRiskScore)
  const level = calculateApprovalRiskLevel(ruleResults, riskFactors)
  const summary = buildApprovalSummary(level, riskFactors)

  return {
    level,
    readinessScore,
    summary,
    riskFactors,
  }
}

export function buildApprovalRoadmapItems(approvalRisk) {
  if (!approvalRisk?.riskFactors?.length) {
    return null
  }

  return approvalRisk.riskFactors.map((factor) => ({
    title: factor.title,
    category: 'Approval Risk',
    reason: factor.reason,
    expectedImpact: factor.impact,
    recommendation: factor.recommendation,
    riskTier:
      factor.severity === 'high' ? 'critical' : factor.severity === 'medium' ? 'warning' : 'advisory',
    riskImpact: factor.impact,
    fromApprovalRisk: true,
  }))
}
