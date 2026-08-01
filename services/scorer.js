const SEVERITY_WEIGHT = {
  high: 30,
  medium: 20,
  low: 10,
}

/**
 * Calculate audit score and build issues/recommendations from rule results.
 * @param {import('../rules/types.js').RuleResult[]} ruleResults
 */
export function scoreAudit(ruleResults) {
  if (!ruleResults.length) {
    return { score: 100, issues: [], recommendations: [], summary: { total: 0, passed: 0, failed: 0 } }
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
    .filter((r) => !r.passed)
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
    recommendations,
    summary: {
      total: ruleResults.length,
      passed: ruleResults.filter((r) => r.passed).length,
      failed: ruleResults.filter((r) => !r.passed).length,
    },
  }
}
