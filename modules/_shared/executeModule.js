import { runModuleRules } from './runModuleRules.js'
import { scoreModuleResults } from './scorer.js'
import { getAuditDataFromContext } from './context.js'

/**
 * Execute a module's rules and return the standard module output shape.
 * @param {import('./types.js').Rule[]} rules
 * @param {import('./types.js').ModuleContext} context
 * @returns {Promise<import('./types.js').ModuleRunResult>}
 */
export async function executeModule(rules, context) {
  const auditData = getAuditDataFromContext(context)
  const ruleResults = runModuleRules(rules, auditData)
  const scored = scoreModuleResults(ruleResults)

  return {
    score: scored.score,
    summary: scored.summary,
    issues: scored.issues,
    warnings: scored.warnings,
    recommendations: scored.recommendations,
    rules: scored.rules,
    passedRules: scored.passedRules,
  }
}
