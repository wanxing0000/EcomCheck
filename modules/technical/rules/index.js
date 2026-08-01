import { httpsRule } from './K001-https.js'
import { robotsRule } from './K002-robots.js'
import { sitemapRule } from './K003-sitemap.js'
import { metaBasicRule } from './K004-meta-basic.js'

/** @type {import('../../_shared/types.js').Rule[]} */
export const rules = [httpsRule, robotsRule, sitemapRule, metaBasicRule]

export { httpsRule, robotsRule, sitemapRule, metaBasicRule }
