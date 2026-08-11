/**
 * Daily free audit limits — Supabase-backed visitor tracking for serverless.
 * GMC: 1 audit per visitor per UTC day. SEO: unlimited.
 *
 * When Supabase is unavailable, audits fail open (allowed) so production never hard-crashes.
 * Local dev without Supabase uses an in-memory fallback.
 */

import {
  consumeVisitorDailyUsage,
  getUtcDateKey,
  getVisitorDailyCount,
  isVisitorUsageStoreConfigured,
} from './visitorUsageStore.js'

export const USAGE_LIMIT_EXCEEDED_CODE = 'USAGE_LIMIT_EXCEEDED'

export const USAGE_LIMIT_MESSAGES = {
  gmc: 'You have used your free GMC audit for today. Please come back tomorrow.',
}

export const USAGE_LIMITS = {
  gmc: {
    productId: 'gmc',
    dailyLimit: 1,
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

/** Dev fallback when Supabase is not configured */
/** @type {Map<string, { count: number, dateKey: string }>} */
const memoryStore = new Map()

function getStoreKey(clientId, mode) {
  return `${normalizeMode(mode)}:${normalizeClientId(clientId)}`
}

function normalizeClientId(clientId) {
  if (!clientId || typeof clientId !== 'string') return 'anonymous'
  return clientId.trim().slice(0, 128)
}

function normalizeMode(mode) {
  return typeof mode === 'string' ? mode.trim().toLowerCase() : 'gmc'
}

/**
 * @param {import('http').IncomingMessage} [req]
 * @param {object} [body]
 */
export function resolveClientId(req, body = {}) {
  if (body.clientId && typeof body.clientId === 'string') {
    return normalizeClientId(body.clientId)
  }

  const headerId = req?.headers?.['x-client-id'] || req?.headers?.['X-Client-Id']
  if (typeof headerId === 'string' && headerId.trim()) {
    return normalizeClientId(headerId)
  }

  return 'anonymous'
}

export function getUsagePolicy(mode) {
  return USAGE_LIMITS[normalizeMode(mode)] || USAGE_LIMITS.gmc
}

function nextResetIso() {
  const reset = new Date()
  reset.setUTCHours(24, 0, 0, 0)
  return reset.toISOString()
}

function buildStatus(clientId, mode, used, policy) {
  if (policy.unlimited) {
    return {
      clientId: normalizeClientId(clientId),
      productId: policy.productId,
      mode: policy.productId,
      unlimited: true,
      dailyLimit: null,
      used,
      remaining: null,
      allowed: true,
      resetsAt: nextResetIso(),
    }
  }

  const remaining = Math.max(policy.dailyLimit - used, 0)
  return {
    clientId: normalizeClientId(clientId),
    productId: policy.productId,
    mode: policy.productId,
    unlimited: false,
    dailyLimit: policy.dailyLimit,
    used,
    remaining,
    allowed: remaining > 0,
    resetsAt: nextResetIso(),
  }
}

function readMemoryCount(clientId, mode, dateKey = getUtcDateKey()) {
  const entry = memoryStore.get(getStoreKey(clientId, mode))
  if (!entry || entry.dateKey !== dateKey) return 0
  return entry.count
}

function writeMemoryCount(clientId, mode, count, dateKey = getUtcDateKey()) {
  memoryStore.set(getStoreKey(clientId, mode), { count, dateKey })
}

async function resolveUsedCount(clientId, mode) {
  if (isVisitorUsageStoreConfigured()) {
    const remoteCount = await getVisitorDailyCount(clientId, mode)
    if (remoteCount != null) return remoteCount
    // Supabase configured but read failed — fail open with 0 used
    return 0
  }
  return readMemoryCount(clientId, mode)
}

/**
 * @param {string} clientId
 * @param {string} mode
 */
export async function getUsageStatus(clientId, mode) {
  const policy = getUsagePolicy(mode)
  const used = await resolveUsedCount(clientId, mode)
  return buildStatus(clientId, mode, used, policy)
}

/**
 * @param {string} clientId
 * @param {string} mode
 */
export async function checkUsage(clientId, mode) {
  return getUsageStatus(clientId, mode)
}

/**
 * Reserve one metered audit slot before execution.
 * @returns {Promise<{ allowed: boolean, status: object, failOpen: boolean }>}
 */
export async function reserveUsageSlot(clientId, mode) {
  const policy = getUsagePolicy(mode)
  if (policy.unlimited) {
    const status = buildStatus(clientId, mode, await resolveUsedCount(clientId, mode), policy)
    return { allowed: true, status, failOpen: false }
  }

  if (isVisitorUsageStoreConfigured()) {
    const consumed = await consumeVisitorDailyUsage(clientId, mode, policy.dailyLimit)
    if (consumed) {
      const status = {
        ...buildStatus(clientId, mode, consumed.used, policy),
        allowed: consumed.allowed,
        remaining: consumed.remaining,
      }
      return { allowed: consumed.allowed, status, failOpen: false }
    }
    // Supabase failure — fail open
    const status = buildStatus(clientId, mode, 0, policy)
    return { allowed: true, status, failOpen: true }
  }

  const dateKey = getUtcDateKey()
  const current = readMemoryCount(clientId, mode, dateKey)
  if (current >= policy.dailyLimit) {
    const status = buildStatus(clientId, mode, current, policy)
    return { allowed: false, status, failOpen: false }
  }

  const nextCount = current + 1
  writeMemoryCount(clientId, mode, nextCount, dateKey)
  const status = buildStatus(clientId, mode, nextCount, policy)
  return { allowed: true, status, failOpen: false }
}

export function getUsageLimitMessage(mode) {
  return USAGE_LIMIT_MESSAGES[normalizeMode(mode)] || 'Daily free audit limit reached. Please try again tomorrow.'
}

/** Test helper */
export function resetUsageStore() {
  memoryStore.clear()
}

/** @deprecated Use reserveUsageSlot during audit; kept for compatibility in tests */
export async function recordUsage(clientId, mode) {
  const reservation = await reserveUsageSlot(clientId, mode)
  return reservation.status
}

export async function buildUsagePayload(clientId, mode) {
  return getUsageStatus(clientId, mode)
}

export { getUtcDateKey, isVisitorUsageStoreConfigured }
