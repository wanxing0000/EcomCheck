/**
 * @typedef {'trust' | 'policy' | 'technical' | 'ads'} RuleCategory
 */

/**
 * @typedef {'high' | 'medium' | 'low'} RuleSeverity
 */

/**
 * @typedef {Object} RuleCheckResult
 * @property {boolean} passed
 * @property {string} [message]
 * @property {string} [recommendation]
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
 */

export {}
