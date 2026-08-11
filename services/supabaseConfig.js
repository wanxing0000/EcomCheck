/**
 * Shared Supabase configuration for server-side services (Vercel/serverless).
 * Service role key must never be exposed to the frontend or API responses.
 */

import { createClient } from '@supabase/supabase-js'

let serviceClient = null

export function getSupabaseEnv() {
  return {
    url: process.env.SUPABASE_URL?.trim() || null,
    anonKey: process.env.SUPABASE_ANON_KEY?.trim() || null,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || null,
  }
}

export function isSupabaseServiceConfigured() {
  const { url, serviceRoleKey } = getSupabaseEnv()
  return Boolean(url && serviceRoleKey)
}

export function isSupabaseAuthConfigured() {
  const { url, anonKey } = getSupabaseEnv()
  return Boolean(url && anonKey)
}

export function getMissingSupabaseServiceEnv() {
  const missing = []
  const { url, serviceRoleKey } = getSupabaseEnv()
  if (!url) missing.push('SUPABASE_URL')
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY')
  return missing
}

/**
 * Server-side Supabase client (service role). Returns null when not configured.
 */
export function getSupabaseServiceClient() {
  if (!isSupabaseServiceConfigured()) return null
  if (!serviceClient) {
    const { url, serviceRoleKey } = getSupabaseEnv()
    serviceClient = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return serviceClient
}

/** Remove tokens/keys from log output */
export function scrubSecrets(value) {
  if (value == null) return value
  return String(value)
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[redacted-token]')
    .replace(/service_role[A-Za-z0-9_-]*/gi, '[redacted-key]')
    .replace(/SUPABASE_SERVICE_ROLE_KEY[=:\s]+\S+/gi, 'SUPABASE_SERVICE_ROLE_KEY=[redacted]')
}

/**
 * Safe message for API/client responses — never expose Supabase internals or keys.
 */
export function toPublicErrorMessage(err, fallback = 'Service temporarily unavailable. Please try again.') {
  const raw = err?.message || String(err || '')
  if (!raw) return fallback
  if (/eyJ[A-Za-z0-9_-]+\./.test(raw)) return fallback
  if (/service_role|SUPABASE_|PGRST|postgres|JWT expired|Invalid API key/i.test(raw)) return fallback
  if (raw.length > 160) return fallback
  return raw
}

export function logSupabaseError(context, err) {
  console.error(`[supabase] ${context}:`, scrubSecrets(err?.message || err))
}

export function getSupabaseProductionRequirements() {
  return {
    tables: ['audit_reports', 'audit_usage', 'visitor_daily_usage'],
    rpcFunctions: ['consume_visitor_daily_usage'],
    serverEnv: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
    optionalServerEnv: ['SUPABASE_ANON_KEY'],
    frontendEnv: ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'],
    forbiddenInFrontend: ['SUPABASE_SERVICE_ROLE_KEY', 'SERVICE_ROLE'],
  }
}

/** Reset cached client — test helper */
export function resetSupabaseServiceClient() {
  serviceClient = null
}
