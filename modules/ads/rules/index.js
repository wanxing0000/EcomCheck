import { metaPixelRule } from './A001-meta-pixel.js'
import { googleTagRule } from './A002-google-tag.js'
import { productJsonLdRule } from './A003-product-jsonld.js'

/** @type {import('../../_shared/types.js').Rule[]} */
export const rules = [metaPixelRule, googleTagRule, productJsonLdRule]

/** Reserved for future Meta Ads Audit — excluded from GMC Compliance bundle */
export const META_ADS_ONLY_RULE_IDS = new Set(['A001'])

/** Must match services/auditModes.js GMC_COMPLIANCE_MODULE_IDS */
const GMC_COMPLIANCE_MODULE_IDS = ['gmc', 'ads', 'technical']

/**
 * @param {{ auditMode?: string, modules?: string[] }} [options]
 */
export function isGmcComplianceAudit(options = {}) {
  if (options.auditMode === 'gmc') return true

  const modules = options.modules
  if (!Array.isArray(modules) || modules.length !== GMC_COMPLIANCE_MODULE_IDS.length) {
    return false
  }

  const moduleSet = new Set(modules)
  return GMC_COMPLIANCE_MODULE_IDS.every((id) => moduleSet.has(id))
}

/**
 * @param {string | { auditMode?: string, modules?: string[] }} [auditModeOrOptions]
 * @returns {import('../../_shared/types.js').Rule[]}
 */
export function resolveAdsRules(auditModeOrOptions) {
  const options =
    typeof auditModeOrOptions === 'string'
      ? { auditMode: auditModeOrOptions }
      : auditModeOrOptions ?? {}

  if (isGmcComplianceAudit(options)) {
    return rules.filter((rule) => !META_ADS_ONLY_RULE_IDS.has(rule.id))
  }

  return rules
}

export { metaPixelRule, googleTagRule, productJsonLdRule }
