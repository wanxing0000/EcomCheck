/**
 * Audit History — lightweight scan summaries for progress tracking.
 * Reuses report storage patterns; persists to local index without DB schema changes.
 */

import { mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { randomUUID } from 'crypto'

const __dirname = dirname(fileURLToPath(import.meta.url))
const HISTORY_INDEX_PATH =
  process.env.AUDIT_HISTORY_INDEX_PATH ||
  join(__dirname, '..', 'data', 'audit-history-index.json')

/** @type {Map<string, object[]>} */
let memoryStore = new Map()
let useMemoryStore = false

const RULE_TITLES = {
  G005: 'Product Identifiers',
  G008: 'Payment Information',
  G010: 'Shipping Policy',
  M001: 'Business Identity',
  M002: 'Policy Quality',
  M003: 'Product Trust Signals',
}

export function normalizeWebsiteKey(url) {
  if (!url || typeof url !== 'string') return ''
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`)
    const host = parsed.hostname.replace(/^www\./, '').toLowerCase()
    const path = parsed.pathname.replace(/\/+$/, '') || ''
    return `${host}${path}`
  } catch {
    return url.trim().toLowerCase()
  }
}

export function buildAuditSummary({
  id = randomUUID(),
  website,
  auditMode = 'gmc',
  createdAt = new Date().toISOString(),
  professionalReport,
  ruleResults = [],
}) {
  const gmcReadiness = professionalReport?.gmcReadiness || {}
  const approvalRisk = professionalReport?.approvalRisk || gmcReadiness.approvalRisk || {}
  const scores = professionalReport?.scores || {}

  const complianceRules = ruleResults.filter((rule) => rule.category !== 'seo')
  const fixGuides = gmcReadiness.fixGuides || gmcReadiness.complianceActions || []

  return {
    id,
    website,
    auditMode,
    createdAt,
    score: {
      gmc: scores.gmc ?? gmcReadiness.gmcRiskScore ?? null,
      compliance: scores.compliance ?? null,
      trust: scores.trust ?? null,
      policy: scores.policy ?? null,
    },
    approvalRisk: {
      level: approvalRisk.level ?? 'unknown',
      score: gmcReadiness.gmcRiskScore ?? approvalRisk.readinessScore ?? scores.gmc ?? null,
    },
    issues: complianceRules.map((rule) => ({
      id: rule.id,
      severity: rule.severity || 'medium',
      status: rule.passed ? 'passed' : 'failed',
      title: rule.name || RULE_TITLES[rule.id] || rule.id,
    })),
    fixGuides: fixGuides.map((guide) => ({
      ruleId: guide.ruleId,
      priority: guide.priority ?? 99,
      title: guide.title || RULE_TITLES[guide.ruleId] || guide.ruleId,
    })),
  }
}

async function ensureHistoryDir() {
  await mkdir(dirname(HISTORY_INDEX_PATH), { recursive: true })
}

async function readHistoryIndex() {
  if (useMemoryStore) {
    const index = {}
    for (const [key, entries] of memoryStore.entries()) {
      index[key] = entries
    }
    return index
  }

  if (!existsSync(HISTORY_INDEX_PATH)) {
    return {}
  }

  try {
    const raw = await readFile(HISTORY_INDEX_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

function readHistoryIndexSync() {
  if (useMemoryStore) {
    const index = {}
    for (const [key, entries] of memoryStore.entries()) {
      index[key] = entries
    }
    return index
  }

  if (!existsSync(HISTORY_INDEX_PATH)) {
    return {}
  }

  try {
    const raw = readFileSync(HISTORY_INDEX_PATH, 'utf8')
    return JSON.parse(raw)
  } catch {
    return {}
  }
}

async function writeHistoryIndex(index) {
  if (useMemoryStore) {
    memoryStore = new Map(Object.entries(index))
    return
  }

  await ensureHistoryDir()
  await writeFile(HISTORY_INDEX_PATH, JSON.stringify(index, null, 2), 'utf8')
}

function writeHistoryIndexSync(index) {
  if (useMemoryStore) {
    memoryStore = new Map(Object.entries(index))
    return
  }

  mkdirSync(dirname(HISTORY_INDEX_PATH), { recursive: true })
  writeFileSync(HISTORY_INDEX_PATH, JSON.stringify(index, null, 2), 'utf8')
}

function appendSummaryToIndex(summary) {
  const key = normalizeWebsiteKey(summary.website)
  const index = readHistoryIndexSync()
  const entries = index[key] || []
  const withoutDuplicate = entries.filter((entry) => entry.id !== summary.id)
  withoutDuplicate.push(summary)
  withoutDuplicate.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  index[key] = withoutDuplicate.slice(-20)
  writeHistoryIndexSync(index)
  return summary
}

export function useInMemoryAuditHistory(enabled = true) {
  useMemoryStore = enabled
  if (enabled) {
    memoryStore = new Map()
  }
}

export function clearAuditHistoryStore() {
  memoryStore = new Map()
}

export async function listAuditHistoryForWebsite(website, { auditMode = null } = {}) {
  const key = normalizeWebsiteKey(website)
  const index = await readHistoryIndex()
  const entries = index[key] || []

  if (!auditMode) return [...entries].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  return entries
    .filter((entry) => entry.auditMode === auditMode)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
}

export async function getPreviousAuditSummary(website, { auditMode = 'gmc', excludeId = null } = {}) {
  const entries = await listAuditHistoryForWebsite(website, { auditMode })
  const eligible = excludeId ? entries.filter((entry) => entry.id !== excludeId) : entries
  if (eligible.length === 0) return null
  return eligible[eligible.length - 1]
}

export async function saveAuditHistorySummary(summary) {
  if (!summary?.website) {
    throw new Error('Audit history summary requires website')
  }

  return appendSummaryToIndex(summary)
}

export function saveAuditHistorySummarySync(summary) {
  if (!summary?.website) {
    throw new Error('Audit history summary requires website')
  }

  return appendSummaryToIndex(summary)
}

export function getPreviousAuditSummarySync(website, { auditMode = 'gmc', excludeId = null } = {}) {
  const key = normalizeWebsiteKey(website)
  const index = readHistoryIndexSync()
  const entries = (index[key] || [])
    .filter((entry) => entry.auditMode === auditMode)
    .filter((entry) => (excludeId ? entry.id !== excludeId : true))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))

  if (entries.length === 0) return null
  return entries[entries.length - 1]
}

export function getRuleTitle(ruleId, summary = null) {
  const fromIssue = summary?.issues?.find((issue) => issue.id === ruleId)
  if (fromIssue?.title) return fromIssue.title
  const fromGuide = summary?.fixGuides?.find((guide) => guide.ruleId === ruleId)
  if (fromGuide?.title) return fromGuide.title
  return RULE_TITLES[ruleId] || ruleId
}
