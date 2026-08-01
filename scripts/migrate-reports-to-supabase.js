/**
 * Import local JSON reports into Supabase, preserving original UUIDs.
 *
 * Prerequisites:
 *   1. Run supabase/schema.sql in your Supabase project
 *   2. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
 *
 * Usage:
 *   node scripts/migrate-reports-to-supabase.js
 */
import './bootstrap-env.js'
import 'dotenv/config'
import { readdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { upsertReportRecord } from '../services/reportStorage.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STORAGE_DIR = process.env.REPORT_STORAGE_DIR || join(__dirname, '..', 'data', 'reports')

async function main() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  if (!existsSync(STORAGE_DIR)) {
    console.log('No local reports directory found:', STORAGE_DIR)
    process.exit(0)
  }

  const files = (await readdir(STORAGE_DIR)).filter((file) => file.endsWith('.json'))
  if (files.length === 0) {
    console.log('No JSON reports to migrate.')
    process.exit(0)
  }

  let migrated = 0
  let failed = 0

  for (const file of files) {
    try {
      const raw = await readFile(join(STORAGE_DIR, file), 'utf8')
      const record = JSON.parse(raw)

      if (!record?.id || !record?.data) {
        console.warn(`Skipping invalid report file: ${file}`)
        failed += 1
        continue
      }

      await upsertReportRecord(record)
      migrated += 1
      console.log(`✓ ${record.id} ${record.url}`)
    } catch (err) {
      failed += 1
      console.error(`✗ ${file}: ${err.message || err}`)
    }
  }

  console.log('')
  console.log(`Migration complete: ${migrated} migrated, ${failed} failed`)
  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
