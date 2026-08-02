/**
 * Usage limit interface — in-memory store, no database.
 * GMC: 3 audits per client per day. SEO: unlimited.
 */

export const USAGE_LIMITS = {
  gmc: {
    productId: 'gmc',
    dailyLimit: 3,
    unlimited: false,
    label: 'GMC Compliance Audit',
  },
  seo: {
    productId: 'seo',
    dailyLimit: null,
    unlimited: true,
    label: 'SEO Health Audit',
  },
  full: {
    productId: 'full',
    dailyLimit: null,
    unlimited: true,
    label: 'Full Audit',
    internal: true,
  },
}

/** @type {Map<string, { count: number, dateKey: string }>} */
const usageStore = new Map()

function getDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function getStoreKey(clientId, mode) {
  return `${mode}:${clientId}`
}

/**
 * Resolve anonymous client id from request metadata.
 * @param {import('http').IncomingMessage} [req]
 * @param {object} [body]
 */
export function resolveClientId(req, body = {}) {
  if (body.clientId && typeof body.clientId === 'string') {
    return body.clientId.trim().slice(0, 128)
  }

  const headerId = req?.headers?.['x-client-id'] || req?.headers?.['X-Client-Id']
  if (typeof headerId === 'string' && headerId.trim()) {
    return headerId.trim().slice(0, 128)
  }

  return 'anonymous'
}

/**
 * @param {string} mode
 */
export function getUsagePolicy(mode) {
  const normalized = typeof mode === 'string' ? mode.trim().toLowerCase() : 'gmc'
  return USAGE_LIMITS[normalized] || USAGE_LIMITS.gmc
}

function readUsageEntry(clientId, mode) {
  const key = getStoreKey(clientId, mode)
  const today = getDateKey()
  const entry = usageStore.get(key)

  if (!entry || entry.dateKey !== today) {
    return { count: 0, dateKey: today }
  }

  return entry
}

/**
 * @param {string} clientId
 * @param {string} mode
 */
export function getUsageStatus(clientId, mode) {
  const policy = getUsagePolicy(mode)
  const entry = readUsageEntry(clientId, mode)

  if (policy.unlimited) {
    return {
      productId: policy.productId,
      mode: policy.productId,
      unlimited: true,
      dailyLimit: null,
      used: entry.count,
      remaining: null,
      allowed: true,
      resetsAt: nextResetIso(),
    }
  }

  const remaining = Math.max(policy.dailyLimit - entry.count, 0)

  return {
    productId: policy.productId,
    mode: policy.productId,
    unlimited: false,
    dailyLimit: policy.dailyLimit,
    used: entry.count,
    remaining,
    allowed: remaining > 0,
    resetsAt: nextResetIso(),
  }
}

/**
 * @param {string} clientId
 * @param {string} mode
 */
export function checkUsage(clientId, mode) {
  return getUsageStatus(clientId, mode)
}

/**
 * Record one audit consumption for metered products.
 * @param {string} clientId
 * @param {string} mode
 */
export function recordUsage(clientId, mode) {
  const policy = getUsagePolicy(mode)
  if (policy.unlimited) {
    return getUsageStatus(clientId, mode)
  }

  const key = getStoreKey(clientId, mode)
  const today = getDateKey()
  const entry = readUsageEntry(clientId, mode)
  const nextCount = entry.dateKey === today ? entry.count + 1 : 1

  usageStore.set(key, { count: nextCount, dateKey: today })
  return getUsageStatus(clientId, mode)
}

/**
 * Build API usage payload after an audit completes.
 * @param {string} clientId
 * @param {string} mode
 * @param {{ record?: boolean }} [options]
 */
export function buildUsagePayload(clientId, mode, options = {}) {
  const status =
    options.record && !getUsagePolicy(mode).unlimited
      ? recordUsage(clientId, mode)
      : getUsageStatus(clientId, mode)

  return {
    clientId,
    ...status,
  }
}

function nextResetIso() {
  const reset = new Date()
  reset.setUTCHours(24, 0, 0, 0)
  return reset.toISOString()
}

/** Test helper — reset in-memory counters */
export function resetUsageStore() {
  usageStore.clear()
}
