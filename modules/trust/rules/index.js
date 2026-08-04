import { businessIdentityRule } from './M001-business-identity.js'
import { policyQualityRule } from './M002-policy-quality.js'
import { productTrustSignalsRule } from './M003-product-trust.js'

/** Misrepresentation risk rules — M004+ reserved for future expansion */
/** @type {import('../../_shared/types.js').Rule[]} */
export const rules = [businessIdentityRule, policyQualityRule, productTrustSignalsRule]

export { businessIdentityRule, policyQualityRule, productTrustSignalsRule }
