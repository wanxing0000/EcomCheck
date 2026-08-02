import { moduleRegistry } from '../modules/index.js'

export const AUDIT_MODE_IDS = ['full', 'gmc', 'seo']

/** Legacy API modes — resolve to GMC Audit bundle */
const DEPRECATED_MODE_ALIASES = {
  ads: 'gmc',
  technical: 'gmc',
  trust: 'gmc',
}

const ALL_MODULE_IDS = Object.keys(moduleRegistry)

/** @type {Record<string, import('./auditModes.types.js').AuditModePreset>} */
const MODE_PRESETS = {
  full: {
    modules: undefined,
    legacyEnabled: true,
    auditProduct: {
      id: 'full-audit',
      name: 'Full Audit',
      slug: 'full',
      primaryScore: 'compliance+seo',
      description: 'Google Merchant Center and SEO health together in one report.',
    },
  },
  gmc: {
    modules: ['gmc', 'ads', 'technical'],
    legacyEnabled: true,
    auditProduct: {
      id: 'gmc-audit',
      name: 'GMC Compliance Audit',
      slug: 'gmc',
      primaryScore: 'gmc',
      paid: true,
      description:
        'GMC readiness with ads tracking, technical foundations, and trust & policy signals.',
      includes: ['gmc', 'ads', 'technical', 'trust', 'policy'],
    },
  },
  seo: {
    modules: ['seo'],
    legacyEnabled: false,
    auditProduct: {
      id: 'seo-audit',
      name: 'SEO Health Audit',
      slug: 'seo',
      primaryScore: 'seo',
      paid: false,
      description: 'Free on-page SEO audit, independent from compliance scoring.',
      includes: ['seo'],
    },
  },
}

export class AuditModeError extends Error {
  constructor(message, code = 'INVALID_MODE') {
    super(message)
    this.name = 'AuditModeError'
    this.code = code
  }
}

/**
 * Resolve enabled module IDs for a plan.
 * @param {string[]|undefined|null} modules
 */
export function resolvePlanModules(modules) {
  if (modules === undefined || modules === null) {
    return ALL_MODULE_IDS.filter((id) => moduleRegistry[id]?.enabled)
  }
  return modules.filter((id) => moduleRegistry[id]?.enabled)
}

/**
 * Resolve audit mode into an execution plan.
 * @param {{ mode?: string, modules?: string[] }} [request]
 * @returns {import('./auditModes.types.js').AuditPlan}
 */
export function resolveAuditPlan({ mode, modules: requestedModules } = {}) {
  const rawMode = typeof mode === 'string' ? mode.trim().toLowerCase() : ''
  const normalizedMode = DEPRECATED_MODE_ALIASES[rawMode] || rawMode

  if (!normalizedMode && !requestedModules?.length) {
    return buildPlan('full', MODE_PRESETS.full)
  }

  if (!normalizedMode && requestedModules?.length) {
    return {
      mode: 'custom',
      modules: requestedModules,
      legacyEnabled: true,
      executedModules: resolvePlanModules(requestedModules),
      auditProduct: {
        id: 'custom-audit',
        name: 'Custom Audit',
        slug: 'custom',
        primaryScore: 'mixed',
        description: 'Custom module selection via legacy modules parameter.',
      },
    }
  }

  if (!MODE_PRESETS[normalizedMode]) {
    throw new AuditModeError(
      `Invalid audit mode "${mode}". Expected one of: ${[...AUDIT_MODE_IDS, ...Object.keys(DEPRECATED_MODE_ALIASES)].join(', ')}`
    )
  }

  const preset = MODE_PRESETS[normalizedMode]
  const modules = requestedModules?.length ? requestedModules : preset.modules

  return buildPlan(normalizedMode, {
    ...preset,
    modules,
  })
}

/**
 * @param {string} mode
 * @param {import('./auditModes.types.js').AuditModePreset} preset
 */
function buildPlan(mode, preset) {
  const executedModules = resolvePlanModules(preset.modules)

  return {
    mode,
    modules: preset.modules,
    legacyEnabled: preset.legacyEnabled,
    executedModules,
    auditProduct: preset.auditProduct,
  }
}

/**
 * Build reportBuilder context from an audit plan.
 * @param {import('./auditModes.types.js').AuditPlan} plan
 */
export function buildReportAuditContext(plan) {
  return {
    mode: plan.mode,
    legacyEnabled: plan.legacyEnabled,
    executedModules: plan.executedModules,
    auditProduct: plan.auditProduct,
  }
}

/**
 * Public metadata attached to audit API responses.
 * @param {import('./auditModes.types.js').AuditPlan} plan
 */
export function buildAuditMetadata(plan) {
  return {
    auditMode: plan.mode,
    auditProduct: plan.auditProduct,
    auditPlan: {
      mode: plan.mode,
      modules: plan.executedModules,
      legacyEnabled: plan.legacyEnabled,
    },
  }
}
