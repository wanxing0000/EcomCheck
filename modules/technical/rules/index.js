import { httpsRule } from './K001-https.js'
import { robotsRule } from './K002-robots.js'
import { sitemapRule } from './K003-sitemap.js'
import { metaBasicRule } from './K004-meta-basic.js'
import { isGmcComplianceAudit } from '../../ads/rules/index.js'

/** @type {import('../../_shared/types.js').Rule[]} */
export const rules = [httpsRule, robotsRule, sitemapRule, metaBasicRule]

/** Excluded from GMC Compliance — retained for full audit and future SEO overlap */
export const GMC_EXCLUDED_TECHNICAL_RULE_IDS = new Set(['K004'])

/**
 * @param {string | { auditMode?: string, modules?: string[] }} [auditModeOrOptions]
 * @returns {import('../../_shared/types.js').Rule[]}
 */
export function resolveTechnicalRules(auditModeOrOptions) {
  const options =
    typeof auditModeOrOptions === 'string'
      ? { auditMode: auditModeOrOptions }
      : auditModeOrOptions ?? {}

  if (isGmcComplianceAudit(options)) {
    return rules.filter((rule) => !GMC_EXCLUDED_TECHNICAL_RULE_IDS.has(rule.id))
  }

  return rules
}

export { httpsRule, robotsRule, sitemapRule, metaBasicRule }
