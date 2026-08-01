import { scoreModuleResults } from '../modules/_shared/scorer.js'

/**
 * Calculate audit score and build issues/recommendations from rule results.
 * @param {import('../rules/types.js').RuleResult[]} ruleResults
 */
export function scoreAudit(ruleResults) {
  const result = scoreModuleResults(ruleResults)
  return {
    score: result.score,
    issues: result.issues,
    warnings: result.warnings,
    recommendations: result.recommendations,
    summary: result.summary,
  }
}

/**
 * Calculate score for a specific rule category (e.g. gmc, ads).
 * @param {import('../rules/types.js').RuleResult[]} ruleResults
 * @param {string} category
 */
export function scoreCategory(ruleResults, category) {
  const filtered = ruleResults.filter((rule) => rule.category === category)
  const result = scoreModuleResults(filtered)

  return {
    score: result.score,
    issues: result.issues,
    warnings: result.warnings,
    recommendations: result.recommendations,
    summary: result.summary,
    passedRules: result.passedRules,
    rules: result.rules,
  }
}
