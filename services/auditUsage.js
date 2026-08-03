import { mkdir, writeFile, readdir, readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const USAGE_DIR = process.env.AUDIT_USAGE_DIR || join(__dirname, '..', 'data', 'audit_usage')

let supabaseClient = null

function isSupabaseConfigured() {
  return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY)
}

function isLocalFallbackEnabled() {
  return process.env.REPORT_STORAGE_FALLBACK !== 'false'
}

function getSupabase() {
  if (!isSupabaseConfigured()) return null
  if (!supabaseClient) {
    supabaseClient = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } }
    )
  }
  return supabaseClient
}

function buildUsageRecord(userId, auditMode, id = randomUUID(), createdAt = new Date().toISOString()) {
  return { id, userId, auditMode, createdAt }
}

function recordToRow(record) {
  return {
    id: record.id,
    user_id: record.userId,
    audit_mode: record.auditMode,
    created_at: record.createdAt,
  }
}

async function ensureUsageDir() {
  await mkdir(USAGE_DIR, { recursive: true })
}

async function recordUsageLocal(record) {
  await ensureUsageDir()
  await writeFile(join(USAGE_DIR, `${record.id}.json`), JSON.stringify(record), 'utf8')
  return record
}

async function recordUsageSupabase(record) {
  const supabase = getSupabase()
  const { error } = await supabase.from('audit_usage').insert(recordToRow(record))
  if (error) throw error
  return record
}

/**
 * Record authenticated audit usage (no limits enforced yet).
 */
export async function recordAuditUsage(userId, auditMode) {
  if (!userId || !auditMode) return null

  const record = buildUsageRecord(userId, auditMode)
  const errors = []

  if (isSupabaseConfigured()) {
    try {
      return await recordUsageSupabase(record)
    } catch (err) {
      errors.push(err)
      console.error('Supabase recordAuditUsage failed:', err.message || err)
    }
  }

  if (isLocalFallbackEnabled()) {
    try {
      return await recordUsageLocal(record)
    } catch (err) {
      errors.push(err)
      console.error('Local recordAuditUsage failed:', err.message || err)
    }
  }

  if (errors.length > 0) {
    console.error('Audit usage not recorded:', errors.map((e) => e.message).join('; '))
  }

  return null
}

export async function countUsageByUser(userId) {
  if (!userId) return { total: 0, gmc: 0, seo: 0 }

  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabase()
      const { data, error } = await supabase
        .from('audit_usage')
        .select('audit_mode')
        .eq('user_id', userId)

      if (error) throw error
      return summarizeUsage(data || [])
    } catch (err) {
      console.error('Supabase countUsageByUser failed:', err.message || err)
      if (!isLocalFallbackEnabled()) return { total: 0, gmc: 0, seo: 0 }
    }
  }

  if (isLocalFallbackEnabled()) {
    try {
      await ensureUsageDir()
      const files = await readdir(USAGE_DIR)
      const rows = []

      for (const file of files) {
        if (!file.endsWith('.json')) continue
        try {
          const raw = await readFile(join(USAGE_DIR, file), 'utf8')
          const record = JSON.parse(raw)
          if (record?.userId === userId) {
            rows.push({ audit_mode: record.auditMode })
          }
        } catch {
          // skip corrupt files
        }
      }

      return summarizeUsage(rows)
    } catch (err) {
      console.error('Local countUsageByUser failed:', err.message || err)
    }
  }

  return { total: 0, gmc: 0, seo: 0 }
}

function summarizeUsage(rows) {
  const total = rows.length
  const gmc = rows.filter((row) => row.audit_mode === 'gmc').length
  const seo = rows.filter((row) => row.audit_mode === 'seo').length
  return { total, gmc, seo }
}
