/**
 * Persistent visitor daily usage — Supabase-backed for Vercel serverless.
 * Tracks anonymous client_id quotas (GMC free tier). API uses service role.
 */

import {
  getSupabaseServiceClient,
  isSupabaseServiceConfigured,
  logSupabaseError,
} from './supabaseConfig.js'

export function isVisitorUsageStoreConfigured() {
  return isSupabaseServiceConfigured()
}

function getSupabase() {
  return getSupabaseServiceClient()
}

export function getUtcDateKey(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function normalizeClientId(clientId) {
  if (!clientId || typeof clientId !== 'string') return 'anonymous'
  return clientId.trim().slice(0, 128)
}

function normalizeMode(mode) {
  return typeof mode === 'string' ? mode.trim().toLowerCase() : 'gmc'
}

/**
 * Read today's usage count without consuming a slot.
 * @returns {Promise<number|null>} null when store unavailable (fail-open signal)
 */
export async function getVisitorDailyCount(clientId, auditMode, dateKey = getUtcDateKey()) {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase
      .from('visitor_daily_usage')
      .select('audit_count')
      .eq('client_id', normalizeClientId(clientId))
      .eq('audit_mode', normalizeMode(auditMode))
      .eq('usage_date', dateKey)
      .maybeSingle()

    if (error) throw error
    return data?.audit_count ?? 0
  } catch (err) {
    logSupabaseError('getVisitorDailyCount', err)
    return null
  }
}

/**
 * Atomically consume one daily usage slot.
 * @returns {Promise<{ allowed: boolean, used: number, remaining: number, usageDate: string }|null>}
 *   null when store unavailable (fail-open)
 */
export async function consumeVisitorDailyUsage(clientId, auditMode, dailyLimit) {
  const supabase = getSupabase()
  if (!supabase) return null

  try {
    const { data, error } = await supabase.rpc('consume_visitor_daily_usage', {
      p_client_id: normalizeClientId(clientId),
      p_audit_mode: normalizeMode(auditMode),
      p_limit: dailyLimit,
    })

    if (error) throw error

    const payload = typeof data === 'string' ? JSON.parse(data) : data
    return {
      allowed: Boolean(payload?.allowed),
      used: payload?.used ?? 0,
      remaining: payload?.remaining ?? 0,
      usageDate: payload?.usage_date ?? getUtcDateKey(),
    }
  } catch (err) {
    logSupabaseError('consumeVisitorDailyUsage', err)
    return null
  }
}
