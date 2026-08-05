import { mkdtempSync, rmSync, existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { spawnSync } from 'node:child_process'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

console.log('Serverless Audit History Persistence Tests\n')

console.log('1. Runtime detection')
const { isServerlessRuntime, canPersistToProjectFiles } = await import('../services/runtimeEnv.js')
assert(isServerlessRuntime() === false, 'local dev should not be serverless by default')
assert(canPersistToProjectFiles() === true, 'local dev should allow project file persistence')
console.log('  PASS')

console.log('\n2. Serverless audit history uses memory (no disk write)')
const serverlessDir = mkdtempSync(join(tmpdir(), 'audit-history-serverless-'))
const serverlessPath = join(serverlessDir, 'audit-history-index.json')
const serverlessScript = `
import { saveAuditHistorySummarySync, listAuditHistoryForWebsite, isAuditHistoryFilePersistenceEnabled } from '../services/auditHistory.js';

if (isAuditHistoryFilePersistenceEnabled()) {
  throw new Error('file persistence should be disabled on Vercel');
}

saveAuditHistorySummarySync({
  id: 'test-id',
  website: 'https://serverless-test.local',
  auditMode: 'gmc',
  createdAt: new Date().toISOString(),
  score: { gmc: 80, compliance: null, trust: null, policy: null },
  approvalRisk: { level: 'medium', score: 80 },
  issues: [],
  fixGuides: [],
});

const entries = await listAuditHistoryForWebsite('https://serverless-test.local');
if (entries.length !== 1 || entries[0].id !== 'test-id') {
  throw new Error('in-memory history should round-trip within invocation');
}
`

const serverlessResult = spawnSync(
  process.execPath,
  ['--input-type=module', '-e', serverlessScript],
  {
    cwd: join(process.cwd(), 'scripts'),
    encoding: 'utf8',
    env: {
      ...process.env,
      VERCEL: '1',
      AUDIT_HISTORY_INDEX_PATH: serverlessPath,
    },
  }
)
assert(serverlessResult.status === 0, `serverless audit history failed:\n${serverlessResult.stdout}\n${serverlessResult.stderr}`)
assert(!existsSync(serverlessPath), 'serverless save must not create history index file')
rmSync(serverlessDir, { recursive: true, force: true })
console.log('  PASS')

console.log('\n3. Local file persistence still works')
const localDir = mkdtempSync(join(tmpdir(), 'audit-history-local-'))
const localPath = join(localDir, 'audit-history-index.json')
const localScript = `
import { useInMemoryAuditHistory, saveAuditHistorySummarySync, isAuditHistoryFilePersistenceEnabled } from '../services/auditHistory.js';

useInMemoryAuditHistory(false);
if (!isAuditHistoryFilePersistenceEnabled()) {
  throw new Error('file persistence should be enabled locally');
}

saveAuditHistorySummarySync({
  id: 'local-id',
  website: 'https://local-test.local',
  auditMode: 'gmc',
  createdAt: new Date().toISOString(),
  score: { gmc: 90, compliance: null, trust: null, policy: null },
  approvalRisk: { level: 'low', score: 90 },
  issues: [],
  fixGuides: [],
});
`

const localResult = spawnSync(
  process.execPath,
  ['--input-type=module', '-e', localScript],
  {
    cwd: join(process.cwd(), 'scripts'),
    encoding: 'utf8',
    env: {
      ...process.env,
      VERCEL: '',
      VERCEL_ENV: '',
      AUDIT_HISTORY_INDEX_PATH: localPath,
    },
  }
)
assert(localResult.status === 0, `local audit history failed:\n${localResult.stdout}\n${localResult.stderr}`)
assert(existsSync(localPath), 'local dev should write history index to disk')
const raw = JSON.parse(readFileSync(localPath, 'utf8'))
assert(raw['local-test.local']?.length === 1, 'local index should contain saved website entry')
rmSync(localDir, { recursive: true, force: true })
console.log('  PASS')

console.log('\nServerless audit history persistence fix verified')
