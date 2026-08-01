import { productPriceRule } from './G001-product-price.js'
import { productAvailabilityRule } from './G002-product-availability.js'
import { returnPolicyRule } from './G003-return-policy.js'
import { shippingInfoRule } from './G004-shipping-info.js'
import { productIdentifiersRule } from './G005-product-identifiers.js'
import { productPriceConsistencyRule } from './G006-price-consistency.js'
import { businessInformationRule } from './G007-business-information.js'

/** @type {import('../../_shared/types.js').Rule[]} */
export const rules = [
  productPriceRule,
  productAvailabilityRule,
  returnPolicyRule,
  shippingInfoRule,
  productIdentifiersRule,
  productPriceConsistencyRule,
  businessInformationRule,
]

export {
  productPriceRule,
  productAvailabilityRule,
  returnPolicyRule,
  shippingInfoRule,
  productIdentifiersRule,
  productPriceConsistencyRule,
  businessInformationRule,
}
