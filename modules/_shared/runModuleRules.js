/**
 * Run a list of rules against audit data and normalize results.
 * @param {import('./types.js').Rule[]} rules
 * @param {object} auditData
 * @returns {import('./types.js').RuleResult[]}
 */
import { buildRuleEvidence } from './ruleEvidenceBuilder.js'

export function runModuleRules(rules, auditData) {
  return rules.map((rule) => {
    const result = rule.check(auditData)
    const evidence = buildRuleEvidence(rule.id, auditData, result)

    return {
      id: rule.id,
      name: rule.name,
      category: rule.category,
      severity: result.severity || rule.severity,
      description: rule.description,
      passed: result.passed,
      status: result.passed ? 'passed' : 'failed',
      message: result.message || '',
      recommendation: result.recommendation || '',
      evidence,
      ...(result.misrepresentationLevel && { misrepresentationLevel: result.misrepresentationLevel }),
      ...(result.trustDetails && { trustDetails: result.trustDetails }),
      ...(result.policyQualityReport && { policyQualityReport: result.policyQualityReport }),
      ...(result.productTrustReport && { productTrustReport: result.productTrustReport }),
      ...(result.policyQuality && { policyQuality: result.policyQuality }),
      ...(result.priceRisks && { priceRisks: result.priceRisks }),
      ...(result.businessInfo && { businessInfo: result.businessInfo }),
      ...(result.purchaseFlow && { purchaseFlow: result.purchaseFlow }),
    }
  })
}
