import { contactInformationRule } from './trust/T001-contact-information.js'
import { aboutUsRule } from './trust/T002-about-us.js'
import { privacyPolicyRule } from './policy/P001-privacy-policy.js'
import { refundPolicyRule } from './policy/P002-refund-policy.js'
import { shippingPolicyRule } from './policy/P003-shipping-policy.js'
import { httpsRule } from './technical/K001-https.js'
import { robotsRule } from './technical/K002-robots.js'
import { sitemapRule } from './technical/K003-sitemap.js'
import { metaBasicRule } from './technical/K004-meta-basic.js'
import { metaPixelRule } from './ads/A001-meta-pixel.js'
import { googleTagRule } from './ads/A002-google-tag.js'
import { productJsonLdRule } from './ads/A003-product-jsonld.js'
import { productPriceRule } from './gmc/G001-product-price.js'
import { productAvailabilityRule } from './gmc/G002-product-availability.js'
import { returnPolicyRule } from './gmc/G003-return-policy.js'
import { shippingInfoRule } from './gmc/G004-shipping-info.js'
import { productIdentifiersRule } from './gmc/G005-product-identifiers.js'
import { productPriceConsistencyRule } from './gmc/G006-product-price-consistency.js'
import { businessInformationRule } from './gmc/G007-business-information.js'

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
      ...(result.policyQuality && { policyQuality: result.policyQuality }),
      ...(result.priceRisks && { priceRisks: result.priceRisks }),
      ...(result.businessInfo && { businessInfo: result.businessInfo }),
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
}
