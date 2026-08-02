import { contactInformationRule } from './trust/T001-contact-information.js'
import { aboutUsRule } from './trust/T002-about-us.js'
import { privacyPolicyRule } from './policy/P001-privacy-policy.js'
import { refundPolicyRule } from './policy/P002-refund-policy.js'
import { shippingPolicyRule } from './policy/P003-shipping-policy.js'
import { runModuleRules } from '../modules/_shared/runModuleRules.js'
import { getAllModuleRules, getModuleRulesForExecution, runAuditModules } from '../modules/index.js'
import {
  productPriceRule,
  productAvailabilityRule,
  returnPolicyRule,
  shippingInfoRule,
  productIdentifiersRule,
  productPriceConsistencyRule,
  businessInformationRule,
  paymentInformationRule,
  productPurchaseFlowRule,
  shippingPolicyQualityRule,
} from '../modules/gmc/rules/index.js'
import { metaPixelRule, googleTagRule, productJsonLdRule } from '../modules/ads/rules/index.js'
import { httpsRule, robotsRule, sitemapRule, metaBasicRule } from '../modules/technical/rules/index.js'
import {
  titleTagRule,
  metaDescriptionRule,
  h1StructureRule,
  canonicalRule,
  openGraphRule,
  organizationSchemaRule,
  productSchemaRule,
  robotsSitemapRule,
} from '../modules/seo/rules/index.js'

/** Legacy trust & policy rules — will move to modules in a future phase. */
const legacyRules = [
  contactInformationRule,
  aboutUsRule,
  privacyPolicyRule,
  refundPolicyRule,
  shippingPolicyRule,
]

/** @type {import('./types.js').Rule[]} */
export const allRules = [...legacyRules, ...getAllModuleRules()]

/**
 * Run all registered rules against audit data.
 * @param {object} auditData - Crawl result from crawler.js
 * @param {{ modules?: string[] }} [options]
 * @returns {import('./types.js').RuleResult[]}
 */
export function runRules(auditData, options = {}) {
  const legacyResults = runModuleRules(legacyRules, auditData)
  const moduleResults = runModuleRules(getModuleRulesForExecution(options.modules), auditData)
  return [...legacyResults, ...moduleResults]
}

export { runAuditModules }

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
  metaPixelRule,
  googleTagRule,
  productJsonLdRule,
  productPriceRule,
  productAvailabilityRule,
  returnPolicyRule,
  shippingInfoRule,
  productIdentifiersRule,
  productPriceConsistencyRule,
  businessInformationRule,
  paymentInformationRule,
  productPurchaseFlowRule,
  shippingPolicyQualityRule,
  titleTagRule,
  metaDescriptionRule,
  h1StructureRule,
  canonicalRule,
  openGraphRule,
  organizationSchemaRule,
  productSchemaRule,
  robotsSitemapRule,
}
