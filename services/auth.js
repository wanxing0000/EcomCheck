import { createClient } from '@supabase/supabase-js'

let authClient = null

function isAuthConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY)
}

function getAuthClient() {
  if (!isAuthConfigured()) return null
  if (!authClient) {
    authClient = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
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

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) return null

  return {
    id: data.user.id,
    email: data.user.email ?? null,
  }
}
