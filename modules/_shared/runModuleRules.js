/**
 * Run a list of rules against audit data and normalize results.
 * @param {import('./types.js').Rule[]} rules
 * @param {object} auditData
 * @returns {import('./types.js').RuleResult[]}
 */
export function runModuleRules(rules, auditData) {
  return rules.map((rule) => {
    const result = rule.check(auditData)

    return {
      id: rule.id,
      name: rule.name,
      category: rule.category,
      severity: result.severity || rule.severity,
      description: rule.description,
      passed: result.passed,
      message: result.message || '',
      recommendation: result.recommendation || '',
      ...(result.policyQuality && { policyQuality: result.policyQuality }),
      ...(result.priceRisks && { priceRisks: result.priceRisks }),
      ...(result.businessInfo && { businessInfo: result.businessInfo }),
      ...(result.purchaseFlow && { purchaseFlow: result.purchaseFlow }),
    }
  })
}
