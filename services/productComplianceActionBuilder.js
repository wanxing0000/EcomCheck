/**
 * Product compliance action builder — attach Fix Assistant drafts to product-level issues.
 * Reuses fixGuideGenerator product mappings; does not modify website-level compliance actions.
 */

import { generateProductFixGuides } from './fixGuideGenerator.js'

function buildGuideKey(guide) {
  return `${guide.ruleId}:${guide.productUrl}`
}

function indexFixGuides(fixGuides = []) {
  const map = new Map()
  for (const guide of fixGuides) {
    map.set(buildGuideKey(guide), guide)
  }
  return map
}

function severityToRiskTier(severity) {
  if (severity === 'high' || severity === 'critical') return 'critical'
  if (severity === 'medium' || severity === 'warning') return 'warning'
  return 'advisory'
}

function toProductComplianceAction(guide) {
  return {
    ruleId: guide.ruleId,
    productUrl: guide.productUrl,
    title: guide.title,
    priority: guide.priority,
    severity: guide.severity,
    riskTier: severityToRiskTier(guide.severity),
    category: guide.category,
    categoryLabel: guide.category,
    problem: guide.problem,
    whyItMatters: guide.whyItMatters,
    detected: guide.detected,
    missing: guide.missing,
    recommendedFix: guide.recommendedFix,
    expectedImpact: guide.expectedImpact,
    impactPrediction: guide.impactPrediction,
    fixAvailable: guide.fixAvailable,
    fixAssistant: guide.fixAssistant,
    generatedDraft: guide.fixAssistant?.copyReadyText || null,
    evidence: {
      message: guide.problem,
      productUrl: guide.productUrl,
    },
    auditEvidence: {
      found: guide.detected || [],
      missing: guide.missing || [],
    },
  }
}

/**
 * Enrich product compliance issues with Fix Assistant drafts and flat action list.
 * @param {{
 *   productCompliance?: object|null,
 *   productAnalysis?: object|null,
 *   gmcRiskScore?: number|null,
 *   approvalRisk?: object|null,
 * }} input
 */
export function buildProductComplianceActions({
  productCompliance = null,
  productAnalysis = null,
  gmcRiskScore = null,
  approvalRisk = null,
} = {}) {
  if (!productCompliance?.products?.length) {
    return {
      productCompliance: productCompliance || { products: [], summary: { analyzedProducts: 0, productsWithIssues: 0, totalIssues: 0, byRuleId: {} } },
      productComplianceActions: [],
    }
  }

  const { fixGuides } = generateProductFixGuides({
    productCompliance,
    productAnalysis,
    gmcRiskScore,
    approvalRisk,
  })
  const guidesByKey = indexFixGuides(fixGuides)

  const products = productCompliance.products.map((productEntry) => {
    const issues = (productEntry.issues || []).map((issue) => {
      const guide = guidesByKey.get(`${issue.ruleId}:${productEntry.url}`)
      if (!guide) {
        return {
          ...issue,
          fixAvailable: false,
          fixAssistant: null,
          generatedDraft: null,
        }
      }

      return {
        ...issue,
        fixAvailable: guide.fixAvailable,
        fixAssistant: guide.fixAssistant,
        generatedDraft: guide.fixAssistant?.copyReadyText || null,
      }
    })

    return {
      ...productEntry,
      issues,
    }
  })

  const productComplianceActions = fixGuides.map(toProductComplianceAction)

  return {
    productCompliance: {
      ...productCompliance,
      products,
      actions: productComplianceActions,
    },
    productComplianceActions,
  }
}
