import { mkdir, readFile, writeFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'
import {
  getSupabaseServiceClient,
  isSupabaseServiceConfigured,
  logSupabaseError,
  toPublicErrorMessage,
} from './supabaseConfig.js'
import { isLocalFileFallbackEnabled, isServerlessRuntime } from './runtimeEnv.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STORAGE_DIR = process.env.REPORT_STORAGE_DIR || join(__dirname, '..', 'data', 'reports')

function isSupabaseConfigured() {
  return isSupabaseServiceConfigured()
}

function isLocalFallbackEnabled() {
  return isLocalFileFallbackEnabled()
}

function getSupabase() {
  return getSupabaseServiceClient()
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
    score: auditData.complianceScore?.score ?? auditData.score ?? null,
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
  try {
    await ensureStorageDir()
  } catch (err) {
    console.error('Local listReports unavailable:', err.message || err)
    return []
  }

  let files
  try {
    files = await readdir(STORAGE_DIR)
  } catch (err) {
    console.error('Local listReports read failed:', err.message || err)
    return []
  }
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
  try {
    await ensureStorageDir()
  } catch (err) {
    console.error('Local listReportsByUser unavailable:', err.message || err)
    return []
  }

  let files
  try {
    files = await readdir(STORAGE_DIR)
  } catch (err) {
    console.error('Local listReportsByUser read failed:', err.message || err)
    return []
  }
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
      logSupabaseError('saveReport', err)
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

  throw new Error(
    isServerlessRuntime()
      ? 'Unable to save report right now. Please try again later.'
      : toPublicErrorMessage(errors[0], 'No storage backend available')
  )
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
      logSupabaseError('getReport', err)
      if (!isLocalFallbackEnabled()) throw new Error(toPublicErrorMessage(err, 'Unable to load report'))
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
      logSupabaseError('listReports', err)
      if (!isLocalFallbackEnabled()) throw new Error(toPublicErrorMessage(err, 'Unable to list reports'))
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
      logSupabaseError('listReportsByUser', err)
      if (!isLocalFallbackEnabled()) throw new Error(toPublicErrorMessage(err, 'Unable to list reports'))
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
