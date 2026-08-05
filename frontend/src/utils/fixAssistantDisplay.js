/**
 * Fix Assistant display helpers — categories, availability stats, preview parsing.
 * Pure functions; safe to import from tests and Report UI.
 */

export const FIX_CATEGORY_ORDER = ['content', 'trust', 'policy', 'technical']

export const FIX_CATEGORY_LABELS = {
  content: 'Content Fixes',
  trust: 'Trust Fixes',
  policy: 'Policy Fixes',
  technical: 'Technical Fixes',
}

/** Rule → fix category (aligned with fixGuideGenerator rule IDs) */
const RULE_FIX_CATEGORY = {
  M003: 'content',
  M004: 'content',
  T002: 'content',
  M001: 'trust',
  M005: 'trust',
  T001: 'trust',
  P001: 'policy',
  P002: 'policy',
  P003: 'policy',
  M002: 'policy',
  G008: 'policy',
  G010: 'policy',
  G005: 'technical',
  G011: 'technical',
  G012: 'technical',
  G001: 'technical',
  G002: 'technical',
  G003: 'technical',
  G004: 'technical',
  K001: 'technical',
  K002: 'technical',
  K003: 'technical',
}

const CATEGORY_FALLBACK = {
  policy: 'policy',
  trust: 'trust',
  technical: 'technical',
  ads: 'technical',
  gmc: 'technical',
  seo: 'content',
}

export function hasFixAssistant(action) {
  return Boolean(action?.fixAssistant?.copyReadyText)
}

export function getFixCategoryForRule(ruleId, action = {}) {
  if (ruleId && RULE_FIX_CATEGORY[ruleId]) {
    return RULE_FIX_CATEGORY[ruleId]
  }

  const category = String(action.category || '').toLowerCase()
  return CATEGORY_FALLBACK[category] || 'content'
}

export function computeFixAvailability(complianceActions = []) {
  const actions = Array.isArray(complianceActions) ? complianceActions : []
  const issuesFound = actions.length
  const fixAvailable = actions.filter(hasFixAssistant).length
  const manualActionRequired = Math.max(0, issuesFound - fixAvailable)

  return {
    issuesFound,
    fixAvailable,
    manualActionRequired,
  }
}

export function groupFixableActionsByCategory(complianceActions = []) {
  const groups = Object.fromEntries(FIX_CATEGORY_ORDER.map((key) => [key, []]))

  for (const action of complianceActions || []) {
    if (!hasFixAssistant(action)) continue
    const category = getFixCategoryForRule(action.ruleId, action)
    groups[category].push(action)
  }

  for (const key of FIX_CATEGORY_ORDER) {
    groups[key].sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  }

  return groups
}

export function getFixDraftTitle(fixAssistant, action = {}) {
  if (fixAssistant?.title) return fixAssistant.title
  if (action?.title) return `${action.title} Draft`
  return 'Fix Draft'
}

export function getFixCopyText(fixAssistant) {
  return fixAssistant?.copyReadyText || ''
}

/**
 * Build compact preview lines for inline fix cards.
 * @returns {{ label: string, value: string|null, isHeading?: boolean }[]}
 */
export function buildFixPreviewLines(fixAssistant, { limit = 6 } = {}) {
  if (!fixAssistant) return []

  const lines = []

  for (const section of fixAssistant.sections || []) {
    if (section.heading) {
      lines.push({ label: section.heading, value: null, isHeading: true })
    }

    for (const rawLine of String(section.body || '').split('\n')) {
      const line = rawLine.trim()
      if (!line || line.startsWith('- ') || line.startsWith('##')) continue

      const match = line.match(/^([^:]{2,80}):\s*(.+)$/)
      if (match) {
        lines.push({ label: match[1].trim(), value: match[2].trim() })
      }
    }
  }

  if (lines.length === 0 && fixAssistant.copyReadyText) {
    for (const rawLine of fixAssistant.copyReadyText.split('\n')) {
      const line = rawLine.trim().replace(/^##\s*/, '')
      if (!line) continue
      const match = line.match(/^([^:]{2,80}):\s*(.+)$/)
      if (match) {
        lines.push({ label: match[1].trim(), value: match[2].trim() })
      }
    }
  }

  return lines.slice(0, limit)
}

export function getSeverityLabel(action = {}) {
  const severity = String(action.severity || '').toLowerCase()
  const tier = String(action.riskTier || '').toLowerCase()

  if (severity === 'high' || severity === 'critical' || tier === 'critical') return 'High'
  if (severity === 'medium' || severity === 'warning' || tier === 'warning') return 'Medium'
  return 'Low'
}

export function splitActionsByFixAvailability(complianceActions = []) {
  const withFix = []
  const manualOnly = []

  for (const action of complianceActions || []) {
    if (hasFixAssistant(action)) withFix.push(action)
    else manualOnly.push(action)
  }

  withFix.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))
  manualOnly.sort((a, b) => (a.priority ?? 99) - (b.priority ?? 99))

  return { withFix, manualOnly }
}

export function shouldRenderFixPreview(action) {
  return hasFixAssistant(action)
}
