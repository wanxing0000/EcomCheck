import { useEffect, useState } from 'react'
import Button from './Button'
import {
  FIX_CATEGORY_LABELS,
  FIX_CATEGORY_ORDER,
  buildFixPreviewLines,
  computeFixAvailability,
  getFixCopyText,
  getFixDraftTitle,
  getSeverityLabel,
  groupFixableActionsByCategory,
  hasFixAssistant,
  shouldRenderFixPreview,
  splitActionsByFixAvailability,
} from '../utils/fixAssistantDisplay.js'

function getSeverityStyle(label) {
  switch (label) {
    case 'High':
      return 'bg-red-100 text-red-800 border-red-200'
    case 'Medium':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    default:
      return 'bg-blue-100 text-blue-800 border-blue-200'
  }
}

export function FixAvailabilitySummary({ complianceActions, className = '' }) {
  const stats = computeFixAvailability(complianceActions)
  if (stats.issuesFound === 0) return null

  return (
    <div
      className={`grid grid-cols-1 gap-3 sm:grid-cols-3 ${className}`.trim()}
      data-testid="fix-availability-summary"
    >
      <div className="rounded-lg border border-gray-200 bg-white px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Issues Found</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{stats.issuesFound}</p>
      </div>
      <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Fix Available</p>
        <p className="mt-1 text-2xl font-bold text-emerald-900">{stats.fixAvailable}</p>
      </div>
      <div className="rounded-lg border border-amber-200 bg-amber-50/60 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Manual Action Required</p>
        <p className="mt-1 text-2xl font-bold text-amber-900">{stats.manualActionRequired}</p>
      </div>
    </div>
  )
}

function CopyFixButton({ fixAssistant, action, onCopied }) {
  const [copied, setCopied] = useState(false)
  const draftTitle = getFixDraftTitle(fixAssistant, action)

  useEffect(() => {
    if (!copied) return undefined
    const timer = window.setTimeout(() => setCopied(false), 2500)
    return () => window.clearTimeout(timer)
  }, [copied])

  const handleCopy = async () => {
    const text = getFixCopyText(fixAssistant)
    if (!text) return

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      onCopied?.(draftTitle)
    } catch {
      // Clipboard unavailable outside secure context
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button variant="secondary" size="sm" onClick={handleCopy}>
        Copy Fix
      </Button>
      {copied && (
        <p className="text-xs font-medium text-emerald-700" data-testid="copy-fix-success">
          Copied: &quot;{draftTitle}&quot;
        </p>
      )}
    </div>
  )
}

export function FixPreviewCard({ action, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const fixAssistant = action?.fixAssistant

  if (!shouldRenderFixPreview(action)) return null

  const previewLines = buildFixPreviewLines(fixAssistant)
  const draftTitle = getFixDraftTitle(fixAssistant, action)
  const severityLabel = getSeverityLabel(action)

  return (
    <div
      className="mt-4 rounded-lg border border-violet-200 bg-violet-50/40 px-3 py-3 sm:px-4"
      data-testid="fix-preview-card"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-violet-800">Fix Available</p>
          <p className="mt-1 text-sm font-semibold text-gray-900">{draftTitle}</p>
        </div>
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getSeverityStyle(severityLabel)}`}
        >
          {severityLabel}
        </span>
      </div>

      {previewLines.length > 0 && (
        <dl className="mt-3 space-y-2">
          {previewLines.map((line) =>
            line.isHeading ? (
              <dt key={line.label} className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                {line.label}
              </dt>
            ) : (
              <div key={`${line.label}-${line.value}`} className="grid gap-0.5 sm:grid-cols-[minmax(0,11rem)_1fr]">
                <dt className="text-xs font-medium text-gray-600">{line.label}</dt>
                <dd className="text-xs text-gray-800 break-words">{line.value}</dd>
              </div>
            )
          )}
        </dl>
      )}

      {expanded && (
        <div className="mt-3">
          {fixAssistant.explanation && (
            <p className="text-sm text-gray-700">{fixAssistant.explanation}</p>
          )}
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded border border-violet-100 bg-white p-3 text-xs leading-relaxed text-gray-800">
            {getFixCopyText(fixAssistant)}
          </pre>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <CopyFixButton fixAssistant={fixAssistant} action={action} />
        <Button variant="ghost" size="sm" onClick={() => setExpanded((open) => !open)}>
          {expanded ? 'Collapse' : 'Expand'}
        </Button>
      </div>
    </div>
  )
}

export function FixCategoryOverview({ complianceActions }) {
  const groups = groupFixableActionsByCategory(complianceActions)
  const hasAny = FIX_CATEGORY_ORDER.some((key) => groups[key]?.length > 0)
  if (!hasAny) return null

  return (
    <div className="mt-6" data-testid="fix-category-overview">
      <h3 className="text-sm font-semibold text-gray-900">Fix Categories</h3>
      <p className="mt-1 text-xs text-gray-500">Generated drafts grouped by improvement type.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {FIX_CATEGORY_ORDER.map((categoryKey) => {
          const items = groups[categoryKey]
          if (!items?.length) return null

          return (
            <div key={categoryKey} className="rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                {FIX_CATEGORY_LABELS[categoryKey]}
              </p>
              <ul className="mt-2 space-y-1">
                {items.map((action) => (
                  <li key={action.ruleId} className="text-sm text-gray-800">
                    <span className="font-medium">{action.title}</span>
                    <span className="ml-2 text-xs text-gray-500">({action.ruleId})</span>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export {
  computeFixAvailability,
  groupFixableActionsByCategory,
  hasFixAssistant,
  shouldRenderFixPreview,
  splitActionsByFixAvailability,
}
