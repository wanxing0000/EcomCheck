/**
 * @typedef {'trust' | 'policy' | 'technical' | 'ads' | 'gmc' | 'seo'} RuleCategory
 */

/**
 * @typedef {'high' | 'medium' | 'low' | 'warning'} RuleSeverity
 */

/**
 * @typedef {Object} RuleCheckResult
 * @property {boolean} passed
 * @property {string} [message]
 * @property {string} [recommendation]
 * @property {object} [policyQuality]
 * @property {object} [priceRisks]
 * @property {object} [businessInfo]
 */

/**
 * @typedef {Object} Rule
 * @property {string} id
 * @property {string} name
 * @property {RuleCategory} category
 * @property {RuleSeverity} severity
 * @property {string} description
 * @property {(auditData: object) => RuleCheckResult} check
 */

/**
 * @typedef {Object} RuleResult
 * @property {string} id
 * @property {string} name
 * @property {RuleCategory} category
 * @property {RuleSeverity} severity
 * @property {string} description
 * @property {boolean} passed
 * @property {string} message
 * @property {string} recommendation
 * @property {object} [policyQuality]
 * @property {object} [priceRisks]
 * @property {object} [businessInfo]
 */

/**
 * @typedef {Object} ModuleContext
 * @property {string} url
 * @property {string|null} html
 * @property {object} crawlerData
 * @property {object|null} productsAudit
 * @property {object} options
 */

/**
 * @typedef {Object} ModuleRunResult
 * @property {number} score
 * @property {{ total: number, passed: number, failed: number, warnings?: number }} summary
 * @property {Array} issues
 * @property {Array} warnings
 * @property {Array} recommendations
 * @property {RuleResult[]} rules
 * @property {RuleResult[]} [passedRules]
 */

/**
 * @typedef {Object} ModuleStatus
 * @property {boolean} enabled
 * @property {boolean} executed
 * @property {number} ruleCount
 */

/**
 * @typedef {Object} AuditModule
 * @property {string} id
 * @property {string} name
 * @property {string} category
 * @property {() => Rule[]} getRules
 * @property {(context: ModuleContext) => Promise<ModuleRunResult>} run
 */

/**
 * @typedef {Object} ModuleRegistryEntry
 * @property {boolean} enabled
 * @property {AuditModule} module
 */

export {}
