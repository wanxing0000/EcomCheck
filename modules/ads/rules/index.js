import { metaPixelRule } from './A001-meta-pixel.js'
import { googleTagRule } from './A002-google-tag.js'
import { productJsonLdRule } from './A003-product-jsonld.js'

/** @type {import('../../_shared/types.js').Rule[]} */
export const rules = [metaPixelRule, googleTagRule, productJsonLdRule]

export { metaPixelRule, googleTagRule, productJsonLdRule }
