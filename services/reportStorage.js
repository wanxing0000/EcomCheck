import { mkdir, readFile, writeFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STORAGE_DIR = process.env.REPORT_STORAGE_DIR || join(__dirname, '..', 'data', 'reports')

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

function toSummary(record) {
  return {
    id: record.id,
    url: record.url,
    auditMode: record.auditMode ?? null,
    createdAt: record.createdAt,
    score: record.score ?? null,
    platform: record.platform ?? null,
    gmcScore: record.gmcScore ?? null,
  }
}

function rowToRecord(row) {
  return {
    id: row.id,
    userId: row.user_id ?? null,
    auditMode: row.audit_mode ?? null,
    url: row.url,
    createdAt: row.created_at,
    score: row.score ?? null,
    platform: row.platform ?? null,
    gmcScore: row.gmc_score ?? null,
    data: row.data,
  }
}

function buildRecord(url, auditData, options = {}) {
  const {
    id = randomUUID(),
    createdAt = new Date().toISOString(),
    userId = null,
    auditMode = null,
  } = options

  return {
    id,
    userId,
    auditMode: auditMode || auditData.auditMode || auditData.auditPlan?.mode || null,
    url: auditData.url || url,
    createdAt,
    score: auditData.score ?? null,
    platform: auditData.platform?.name ?? null,
    gmcScore: auditData.gmc?.score ?? null,
    data: auditData,
  }
}

function recordToRow(record) {
  return {
    id: record.id,
    user_id: record.userId ?? null,
    url: record.url,
    audit_mode: record.auditMode ?? null,
    created_at: record.createdAt,
    score: record.score,
    platform: record.platform,
    gmc_score: record.gmcScore,
    data: record.data,
  }
}

async function ensureStorageDir() {
  await mkdir(STORAGE_DIR, { recursive: true })
}

async function saveReportLocal(record) {
  await ensureStorageDir()
  await writeFile(join(STORAGE_DIR, `${record.id}.json`), JSON.stringify(record), 'utf8')
  return toSummary(record)
}

async function getReportLocal(id) {
  const filePath = join(STORAGE_DIR, `${id}.json`)
  if (!existsSync(filePath)) return null

  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

async function listReportsLocal() {
  await ensureStorageDir()

  const files = await readdir(STORAGE_DIR)
  const reports = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue

    try {
      const raw = await readFile(join(STORAGE_DIR, file), 'utf8')
      const record = JSON.parse(raw)
      if (record?.id) {
        reports.push(toSummary(record))
      }
    } catch {
      // skip corrupt files
    }
  }

  return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

async function listReportsByUserLocal(userId) {
  await ensureStorageDir()

  const files = await readdir(STORAGE_DIR)
  const reports = []

  for (const file of files) {
    if (!file.endsWith('.json')) continue

    try {
      const raw = await readFile(join(STORAGE_DIR, file), 'utf8')
      const record = JSON.parse(raw)
      if (record?.id && record.userId === userId) {
        reports.push(toSummary(record))
      }
    } catch {
      // skip corrupt files
    }
  }

  return reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
}

async function saveReportSupabase(record) {
  const supabase = getSupabase()
  const { error } = await supabase.from('audit_reports').insert(recordToRow(record))
  if (error) throw error
  return toSummary(record)
}

async function getReportSupabase(id) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('audit_reports')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return rowToRecord(data)
}

async function listReportsSupabase() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('audit_reports')
    .select('id, url, audit_mode, created_at, score, platform, gmc_score')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map((row) =>
    toSummary({
      id: row.id,
      auditMode: row.audit_mode,
      url: row.url,
      createdAt: row.created_at,
      score: row.score,
      platform: row.platform,
      gmcScore: row.gmc_score,
    })
  )
}

async function listReportsByUserSupabase(userId) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('audit_reports')
    .select('id, url, audit_mode, created_at, score, platform, gmc_score')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data || []).map((row) =>
    toSummary({
      id: row.id,
      auditMode: row.audit_mode,
      url: row.url,
      createdAt: row.created_at,
      score: row.score,
      platform: row.platform,
      gmcScore: row.gmc_score,
    })
  )
}

/**
 * Save audit report for authenticated users only.
 * @param {string} url
 * @param {object} auditData
 * @param {{ userId: string, auditMode?: string }} options
 */
export async function saveReport(url, auditData, options = {}) {
  const { userId, auditMode = null } = options

  if (!userId) {
    throw new Error('userId is required to save a report')
  }

  const record = buildRecord(url, auditData, { userId, auditMode })
  const errors = []

  if (isSupabaseConfigured()) {
    try {
      return await saveReportSupabase(record)
    } catch (err) {
      errors.push(err)
      console.error('Supabase saveReport failed:', err.message || err)
    }
  }

  if (isLocalFallbackEnabled()) {
    try {
      return await saveReportLocal(record)
    } catch (err) {
      errors.push(err)
      console.error('Local saveReport failed:', err.message || err)
    }
  }

  const message = errors.map((err) => err.message || String(err)).join('; ') || 'No storage backend available'
  throw new Error(message)
}

export async function getReport(id) {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return null
  }

  if (isSupabaseConfigured()) {
    try {
      const report = await getReportSupabase(id)
      if (report) return report
    } catch (err) {
      console.error('Supabase getReport failed:', err.message || err)
      if (!isLocalFallbackEnabled()) throw err
    }
  }

  if (isLocalFallbackEnabled()) {
    return getReportLocal(id)
  }

  return null
}

export async function listReports() {
  if (isSupabaseConfigured()) {
    try {
      return await listReportsSupabase()
    } catch (err) {
      console.error('Supabase listReports failed:', err.message || err)
      if (!isLocalFallbackEnabled()) throw err
    }
  }

  if (isLocalFallbackEnabled()) {
    return listReportsLocal()
  }

  return []
}

export async function listReportsByUser(userId) {
  if (!userId) return []

  if (isSupabaseConfigured()) {
    try {
      return await listReportsByUserSupabase(userId)
    } catch (err) {
      console.error('Supabase listReportsByUser failed:', err.message || err)
      if (!isLocalFallbackEnabled()) throw err
    }
  }

  if (isLocalFallbackEnabled()) {
    return listReportsByUserLocal(userId)
  }

  return []
}

export async function upsertReportRecord(record) {
  if (!record?.id) {
    throw new Error('Report record must include id')
  }

  if (isSupabaseConfigured()) {
    const supabase = getSupabase()
    const { error } = await supabase
      .from('audit_reports')
      .upsert(recordToRow(record), { onConflict: 'id' })

    if (error) throw error
    return toSummary(record)
  }

  if (isLocalFallbackEnabled()) {
    return saveReportLocal(record)
  }

  throw new Error('No storage backend available')
}
