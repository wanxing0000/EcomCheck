import { mkdir, readFile, writeFile, readdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STORAGE_DIR = process.env.REPORT_STORAGE_DIR || join(__dirname, '..', 'data', 'reports')

async function ensureStorageDir() {
  await mkdir(STORAGE_DIR, { recursive: true })
}

function toSummary(record) {
  return {
    id: record.id,
    url: record.url,
    createdAt: record.createdAt,
    score: record.score ?? null,
    platform: record.platform ?? null,
    gmcScore: record.gmcScore ?? null,
  }
}

export async function saveReport(url, auditData) {
  await ensureStorageDir()

  const id = randomUUID()
  const createdAt = new Date().toISOString()
  const record = {
    id,
    url: auditData.url || url,
    createdAt,
    score: auditData.score ?? null,
    platform: auditData.platform?.name ?? null,
    gmcScore: auditData.gmc?.score ?? null,
    data: auditData,
  }

  await writeFile(join(STORAGE_DIR, `${id}.json`), JSON.stringify(record), 'utf8')
  return toSummary(record)
}

export async function getReport(id) {
  if (!id || !/^[0-9a-f-]{36}$/i.test(id)) {
    return null
  }

  const filePath = join(STORAGE_DIR, `${id}.json`)
  if (!existsSync(filePath)) {
    return null
  }

  const raw = await readFile(filePath, 'utf8')
  return JSON.parse(raw)
}

export async function listReports() {
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
