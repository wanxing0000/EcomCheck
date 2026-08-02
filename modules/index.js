import gmcModule from './gmc/index.js'
import adsModule from './ads/index.js'
import technicalModule from './technical/index.js'
import seoModule from './seo/index.js'
import { buildModuleContext } from './_shared/context.js'

/** @type {Record<string, import('./_shared/types.js').ModuleRegistryEntry>} */
export const moduleRegistry = {
  gmc: { enabled: true, module: gmcModule },
  ads: { enabled: true, module: adsModule },
  technical: { enabled: true, module: technicalModule },
  seo: { enabled: true, module: seoModule },
}

/** @deprecated Use moduleRegistry */
export const auditModules = Object.values(moduleRegistry).map((entry) => entry.module)

/**
 * Resolve which module IDs should run for this audit request.
 * @param {string[]|undefined} requestedModules
 * @returns {string[]}
 */
export function resolveModulesToRun(requestedModules) {
  const enabledIds = Object.entries(moduleRegistry)
    .filter(([, entry]) => entry.enabled)
    .map(([id]) => id)

  if (!requestedModules?.length) {
    return enabledIds
  }

  return requestedModules.filter((id) => enabledIds.includes(id))
}

/**
 * Collect rules from modules selected for execution.
 * @param {string[]|undefined} requestedModules
 */
export function getModuleRulesForExecution(requestedModules) {
  return resolveModulesToRun(requestedModules).flatMap(
    (id) => moduleRegistry[id].module.getRules()
  )
}

/**
 * Run selected audit modules and return results plus status metadata.
 * @param {object} crawlResult
 * @param {{ modules?: string[] }} [options]
 */
export async function runAuditModules(crawlResult, options = {}) {
  const modulesToRun = resolveModulesToRun(options.modules)
  const context = buildModuleContext(crawlResult, options)

  /** @type {Record<string, import('./_shared/types.js').ModuleRunResult>} */
  const results = {}

  /** @type {Record<string, import('./_shared/types.js').ModuleStatus>} */
  const moduleStatus = {}

  for (const [id, entry] of Object.entries(moduleRegistry)) {
    const ruleCount = entry.module.getRules().length
    const shouldRun = entry.enabled && modulesToRun.includes(id)

    moduleStatus[id] = {
      enabled: entry.enabled,
      executed: false,
      ruleCount,
    }

    if (shouldRun) {
      results[id] = await entry.module.run(context)
      moduleStatus[id].executed = true
    }
  }

  return { results, moduleStatus }
}

/**
 * Collect all rules from enabled modules (legacy flat registry).
 */
export function getAllModuleRules() {
  return Object.entries(moduleRegistry)
    .filter(([, entry]) => entry.enabled)
    .flatMap(([, entry]) => entry.module.getRules())
}

export { gmcModule, adsModule, technicalModule, seoModule }
