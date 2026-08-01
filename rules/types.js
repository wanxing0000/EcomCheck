/**
 * @typedef {'trust' | 'policy' | 'technical' | 'ads' | 'gmc'} RuleCategory
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
 * @property {(auditData: import('../services/crawler.js').AuditData) => RuleCheckResult} check
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

export {}
