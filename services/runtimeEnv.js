/**
 * Runtime environment detection for persistence layers.
 *
 * Vercel (and similar serverless platforms) deploy code to a read-only bundle
 * directory — on Vercel this is typically `/var/task`. Files shipped with the
 * project (e.g. `data/audit-history-index.json`) can be read from the bundle,
 * but any write or mkdir under `/var/task` fails with EROFS. Only ephemeral
 * paths like `/tmp` are writable, which is unsuitable for durable audit history.
 *
 * Local development uses a normal writable filesystem, so file-based history
 * persistence remains enabled there.
 */

/**
 * True when running in a serverless/read-only deployment (Vercel, Lambda, etc.).
 * @returns {boolean}
 */
export function isServerlessRuntime() {
  if (process.env.AUDIT_HISTORY_FILE_PERSIST === 'false') return true
  if (process.env.VERCEL === '1' || process.env.VERCEL_ENV) return true
  if (process.env.AWS_LAMBDA_FUNCTION_NAME) return true
  if (process.env.NETLIFY === 'true') return true
  return false
}

/**
 * True when project-relative file writes (e.g. `data/`) are allowed.
 * @returns {boolean}
 */
export function canPersistToProjectFiles() {
  return !isServerlessRuntime()
}
