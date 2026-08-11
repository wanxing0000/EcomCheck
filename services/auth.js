import { createClient } from '@supabase/supabase-js'
import {
  getSupabaseEnv,
  isSupabaseAuthConfigured,
  logSupabaseError,
} from './supabaseConfig.js'

let authClient = null

function getAuthClient() {
  if (!isSupabaseAuthConfigured()) return null
  if (!authClient) {
    const { url, anonKey } = getSupabaseEnv()
    authClient = createClient(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return authClient
}

/**
 * Resolve authenticated user from Authorization: Bearer <jwt>.
 * Returns null for missing/invalid tokens (guest requests).
 */
export async function resolveUserFromRequest(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7).trim()
  if (!token) return null

  const supabase = getAuthClient()
  if (!supabase) return null

  try {
    const { data, error } = await supabase.auth.getUser(token)
    if (error || !data?.user) return null

    return {
      id: data.user.id,
      email: data.user.email ?? null,
    }
  } catch (err) {
    logSupabaseError('resolveUserFromRequest', err)
    return null
  }
}
