/**
 * Canonical compliance action builder — deduplicates issues into one object per ruleId.
 * Presentation layer only; does not change rule pass/fail outcomes.
 */

import { FIX_GUIDE_PRIORITY } from './fixGuideGenerator.js'
import { GMC_RISK_TIER_IMPACT, resolveGmcRiskTier } from './gmcReportBuilder.js'

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

function indexByRuleId(items, key = 'ruleId') {
  const map = new Map()
  for (const item of items || []) {
    const id = item?.[key] || item?.id
    if (id) map.set(id, item)
  }
  return map
}

function severityToRiskTier(severity) {
  if (severity === 'high' || severity === 'critical') return 'critical'
  if (severity === 'medium' || severity === 'warning') return 'warning'
  return 'advisory'
}

function resolveActionPriority(ruleId, fixGuide, factor) {
  if (fixGuide?.priority != null) return fixGuide.priority
  if (factor && RISK_FACTOR_PRIORITY[factor.id] != null) return RISK_FACTOR_PRIORITY[factor.id]
  if (FIX_GUIDE_PRIORITY[ruleId] != null) return FIX_GUIDE_PRIORITY[ruleId]
  return 99
}

function resolveActionRiskTier(issue, factor, fixGuide) {
  if (factor?.severity) return severityToRiskTier(factor.severity)
  if (issue) return resolveGmcRiskTier(issue)
  if (fixGuide?.priority != null && fixGuide.priority <= 10) return 'critical'
  if (fixGuide?.priority != null && fixGuide.priority <= 40) return 'warning'
  return 'advisory'
}

function buildEvidence(rule, issue) {
  const evidence = {
    message: rule?.message || issue?.message || '',
  }

  if (rule?.trustDetails) evidence.trustDetails = rule.trustDetails
  if (rule?.policyQualityReport) evidence.policyQualityReport = rule.policyQualityReport
  if (rule?.productTrustReport) evidence.productTrustReport = rule.productTrustReport
  if (rule?.policyQuality) evidence.policyQuality = rule.policyQuality
  if (issue?.trustDetails) evidence.trustDetails = issue.trustDetails
  if (issue?.policyQualityReport) evidence.policyQualityReport = issue.policyQualityReport
  if (issue?.productTrustReport) evidence.productTrustReport = issue.productTrustReport

  return evidence
}

function buildActionFromSources(ruleId, { fixGuide, issue, rule, factor }) {
  const title = fixGuide?.title || issue?.title || rule?.name || ruleId
  const priority = resolveActionPriority(ruleId, fixGuide, factor)
  const riskTier = resolveActionRiskTier(issue, factor, fixGuide)
  const severity = factor?.severity || issue?.severity || rule?.severity || 'medium'

  return {
    ruleId,
    title,
    priority,
    severity,
    riskTier,
    category: issue?.category || rule?.category || 'gmc',
    categoryLabel: issue?.categoryLabel || issue?.category || rule?.category || 'GMC',
    problem: fixGuide?.problem || issue?.message || rule?.message || '',
    whyItMatters: fixGuide?.whyItMatters || issue?.whyItMatters || rule?.description || '',
    detected: fixGuide?.detected || [],
    missing: fixGuide?.missing || [],
    recommendedFix: fixGuide?.recommendedFix || issue?.fixSuggestion || rule?.recommendation || '',
    expectedImpact: fixGuide?.expectedImpact || issue?.impact || factor?.impact || '',
    evidence: buildEvidence(rule, issue),
  }
}

function collectActionRuleIds({ complianceIssues, fixGuides, ruleResults, approvalRisk }) {
  const ids = new Set()

  for (const issue of complianceIssues || []) {
    if (issue?.id) ids.add(issue.id)
  }

  for (const guide of fixGuides || []) {
    if (guide?.ruleId) ids.add(guide.ruleId)
  }

  for (const factor of approvalRisk?.riskFactors || []) {
    if (factor?.id) ids.add(factor.id)
  }

  for (const rule of ruleResults || []) {
    if (!rule?.id || rule.category === 'seo') continue
    if (!rule.passed) ids.add(rule.id)
  }

  return ids
}

/**
 * @param {{
 *   ruleResults?: object[],
 *   complianceIssues?: object[],
 *   fixGuides?: object[],
 *   approvalRisk?: object|null,
 *   auditMode?: string,
 * }} input
 * @returns {{ complianceActions: object[] }}
 */
export function buildComplianceActions({
  ruleResults = [],
  complianceIssues = [],
  fixGuides = [],
  approvalRisk = null,
  auditMode = 'gmc',
} = {}) {
  if (auditMode !== 'gmc') {
    return { complianceActions: [] }
  }

  const issuesById = indexByRuleId(complianceIssues, 'id')
  const guidesById = indexByRuleId(fixGuides, 'ruleId')
  const rulesById = indexByRuleId(ruleResults, 'id')
  const factorsById = indexByRuleId(approvalRisk?.riskFactors || [], 'id')

  const ruleIds = collectActionRuleIds({
    complianceIssues,
    fixGuides,
    ruleResults,
    approvalRisk,
  })

  const complianceActions = []

  for (const ruleId of ruleIds) {
    const action = buildActionFromSources(ruleId, {
      fixGuide: guidesById.get(ruleId),
      issue: issuesById.get(ruleId),
      rule: rulesById.get(ruleId),
      factor: factorsById.get(ruleId),
    })

    if (!action.problem && !action.recommendedFix && action.detected.length === 0 && action.missing.length === 0) {
      continue
    }

    complianceActions.push(action)
  }

  complianceActions.sort((a, b) => a.priority - b.priority)

  return { complianceActions }
}

export function buildRoadmapFromComplianceActions(complianceActions) {
  if (!complianceActions?.length) {
    return {
      source: 'complianceActions',
      prioritized: [],
      critical: [],
      warning: [],
      advisory: [],
      immediate: [],
      recommended: [],
      future: [],
    }
  }

  const toCompactItem = (action) => ({
    ruleId: action.ruleId,
    title: action.title,
    category: action.categoryLabel || action.category,
    riskTier: action.riskTier,
    riskImpact: GMC_RISK_TIER_IMPACT[action.riskTier],
    priority: action.priority,
  })

  const prioritized = complianceActions.map(toCompactItem)
  const tiered = {
    critical: complianceActions.filter((action) => action.riskTier === 'critical').map(toCompactItem),
    warning: complianceActions.filter((action) => action.riskTier === 'warning').map(toCompactItem),
    advisory: complianceActions.filter((action) => action.riskTier === 'advisory').map(toCompactItem),
  }

  return {
    source: 'complianceActions',
    prioritized,
    critical: tiered.critical,
    warning: tiered.warning,
    advisory: tiered.advisory,
    immediate: tiered.critical,
    recommended: tiered.warning,
    future: tiered.advisory,
  }
}

export function buildTopPrioritiesFromComplianceActions(complianceActions, limit = 5) {
  return complianceActions.slice(0, limit).map((action, index) => ({
    priority: index + 1,
    ruleId: action.ruleId,
    title: action.title,
    category: action.categoryLabel || action.category,
    riskTier: action.riskTier,
  }))
}

export function toFixGuideShape(action) {
  if (!action) return null

  return {
    ruleId: action.ruleId,
    title: action.title,
    priority: action.priority,
    problem: action.problem,
    whyItMatters: action.whyItMatters,
    detected: action.detected,
    missing: action.missing,
    recommendedFix: action.recommendedFix,
    expectedImpact: action.expectedImpact,
  }
}
