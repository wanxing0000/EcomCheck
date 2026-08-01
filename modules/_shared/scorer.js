const SEVERITY_WEIGHT = {
  high: 30,
  medium: 20,
  low: 10,
  warning: 5,
}

/**
 * Score rule results into the standard module output shape.
 * @param {import('./types.js').RuleResult[]} ruleResults
 * @returns {import('./types.js').ModuleAuditResult}
 */
export function scoreModuleResults(ruleResults) {
  if (!ruleResults.length) {
    return {
      score: 100,
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
      issues: [],
      warnings: [],
      recommendations: [],
      ruleResults: [],
      passedRules: [],
      rules: [],
    }
  }

  const totalWeight = ruleResults.reduce(
    (sum, rule) => sum + (SEVERITY_WEIGHT[rule.severity] ?? 10),
    0
  )

  const earnedWeight = ruleResults
    .filter((rule) => rule.passed)
    .reduce((sum, rule) => sum + (SEVERITY_WEIGHT[rule.severity] ?? 10), 0)

  const score = Math.round((earnedWeight / totalWeight) * 100)

  const issues = ruleResults
    .filter((rule) => !rule.passed && rule.severity !== 'warning')
    .map((rule) => ({
      id: rule.id,
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
      message: rule.message,
    }))

  const warnings = ruleResults
    .filter((rule) => !rule.passed && rule.severity === 'warning')
    .map((rule) => ({
      id: rule.id,
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
      message: rule.message,
    }))

  const recommendations = ruleResults
    .filter((rule) => !rule.passed && rule.recommendation)
    .map((rule) => ({
      id: rule.id,
      priority: rule.severity,
      text: rule.recommendation,
    }))

  return {
    score,
    summary: {
      total: ruleResults.length,
      passed: ruleResults.filter((rule) => rule.passed).length,
      failed: ruleResults.filter((rule) => !rule.passed && rule.severity !== 'warning').length,
      warnings: warnings.length,
    },
    issues,
    warnings,
    recommendations,
    ruleResults,
    passedRules: ruleResults.filter((rule) => rule.passed),
    rules: ruleResults,
  }
}

export { SEVERITY_WEIGHT }
