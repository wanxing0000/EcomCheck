/**
 * @typedef {Object} AuditProduct
 * @property {string} id
 * @property {string} name
 * @property {string} slug
 * @property {string} primaryScore
 * @property {string} [description]
 */

/**
 * @typedef {Object} AuditModePreset
 * @property {string[]|undefined} modules
 * @property {boolean} legacyEnabled
 * @property {AuditProduct} auditProduct
 */

/**
 * @typedef {Object} AuditPlan
 * @property {string} mode
 * @property {string[]|undefined} modules
 * @property {boolean} legacyEnabled
 * @property {string[]} executedModules
 * @property {AuditProduct} auditProduct
 */

export {}
