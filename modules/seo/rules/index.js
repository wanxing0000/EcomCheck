import { titleTagRule } from './S001-title-tag.js'
import { metaDescriptionRule } from './S002-meta-description.js'
import { h1StructureRule } from './S003-h1-structure.js'
import { canonicalRule } from './S004-canonical.js'
import { openGraphRule } from './S005-open-graph.js'
import { organizationSchemaRule } from './S006-organization-schema.js'
import { productSchemaRule } from './S007-product-schema.js'
import { robotsSitemapRule } from './S008-robots-sitemap.js'

/** @type {import('../../_shared/types.js').Rule[]} */
export const rules = [
  titleTagRule,
  metaDescriptionRule,
  h1StructureRule,
  canonicalRule,
  openGraphRule,
  organizationSchemaRule,
  productSchemaRule,
  robotsSitemapRule,
]

export {
  titleTagRule,
  metaDescriptionRule,
  h1StructureRule,
  canonicalRule,
  openGraphRule,
  organizationSchemaRule,
  productSchemaRule,
  robotsSitemapRule,
}
