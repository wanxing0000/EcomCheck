const SEVERITY_WEIGHT = {
  high: 30,
  medium: 20,
  low: 10,
  warning: 5,
}

function buildScoreOutput(ruleResults) {
  if (!ruleResults.length) {
    return {
      score: 100,
      issues: [],
      warnings: [],
      recommendations: [],
      summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
    }
  }

  const totalWeight = ruleResults.reduce(
    (sum, r) => sum + (SEVERITY_WEIGHT[r.severity] ?? 10),
    0
  )

  const earnedWeight = ruleResults
    .filter((r) => r.passed)
    .reduce((sum, r) => sum + (SEVERITY_WEIGHT[r.severity] ?? 10), 0)

  const score = Math.round((earnedWeight / totalWeight) * 100)

  const issues = ruleResults
    .filter((r) => !r.passed && r.severity !== 'warning')
    .map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      severity: r.severity,
      message: r.message,
    }))

  const warnings = ruleResults
    .filter((r) => !r.passed && r.severity === 'warning')
    .map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      severity: r.severity,
      message: r.message,
    }))

  const recommendations = ruleResults
    .filter((r) => !r.passed && r.recommendation)
    .map((r) => ({
      id: r.id,
      priority: r.severity,
      text: r.recommendation,
    }))

  return {
    score,
    issues,
    warnings,
    recommendations,
    summary: {
      total: ruleResults.length,
      passed: ruleResults.filter((r) => r.passed).length,
      failed: ruleResults.filter((r) => !r.passed && r.severity !== 'warning').length,
      warnings: warnings.length,
    },
  }
}

/**
 * Calculate audit score and build issues/recommendations from rule results.
 * @param {import('../rules/types.js').RuleResult[]} ruleResults
 */
export function scoreAudit(ruleResults) {
  return buildScoreOutput(ruleResults)
}

/**
 * Calculate score for a specific rule category (e.g. gmc, ads).
 * @param {import('../rules/types.js').RuleResult[]} ruleResults
 * @param {string} category
 */
export function scoreCategory(ruleResults, category) {
  const filtered = ruleResults.filter((r) => r.category === category)
  const result = buildScoreOutput(filtered)

  return {
    ...result,
    passedRules: filtered.filter((r) => r.passed),
    rules: filtered,
  }
}
