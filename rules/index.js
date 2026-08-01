import { contactInformationRule } from './trust/T001-contact-information.js'
import { aboutUsRule } from './trust/T002-about-us.js'
import { privacyPolicyRule } from './policy/P001-privacy-policy.js'
import { refundPolicyRule } from './policy/P002-refund-policy.js'
import { shippingPolicyRule } from './policy/P003-shipping-policy.js'
import { httpsRule } from './technical/K001-https.js'
import { robotsRule } from './technical/K002-robots.js'
import { sitemapRule } from './technical/K003-sitemap.js'
import { metaBasicRule } from './technical/K004-meta-basic.js'

/** @type {import('./types.js').Rule[]} */
export const allRules = [
  contactInformationRule,
  aboutUsRule,
  privacyPolicyRule,
  refundPolicyRule,
  shippingPolicyRule,
  httpsRule,
  robotsRule,
  sitemapRule,
  metaBasicRule,
]

/**
 * Run all registered rules against audit data.
 * @param {object} auditData - Crawl result from crawler.js
 * @returns {import('./types.js').RuleResult[]}
 */
export function runRules(auditData) {
  return allRules.map((rule) => {
    const result = rule.check(auditData)

    return {
      id: rule.id,
      name: rule.name,
      category: rule.category,
      severity: rule.severity,
      description: rule.description,
      passed: result.passed,
      message: result.message || '',
      recommendation: result.recommendation || '',
    }
  })
}

export {
  contactInformationRule,
  aboutUsRule,
  privacyPolicyRule,
  refundPolicyRule,
  shippingPolicyRule,
  httpsRule,
  robotsRule,
  sitemapRule,
  metaBasicRule,
}
