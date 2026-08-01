/**
 * Build the standard module execution context from crawler output.
 * @param {object} crawlResult
 * @param {object} [options]
 * @returns {import('./types.js').ModuleContext}
 */
export function buildModuleContext(crawlResult, options = {}) {
  return {
    url: crawlResult.url,
    html: crawlResult.html ?? null,
    crawlerData: crawlResult,
    productsAudit: crawlResult.productsAudit ?? null,
    options,
  }
}

/**
 * Resolve audit data for rule execution from module context.
 * Rules continue to receive the full crawler payload for backward compatibility.
 * @param {import('./types.js').ModuleContext} context
 */
export function getAuditDataFromContext(context) {
  return context.crawlerData
}
