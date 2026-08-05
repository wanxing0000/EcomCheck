import { useState } from 'react'
import Card from './Card'
import Button from './Button'
import { FixPreviewCard } from './FixAssistantUx.jsx'
import {
  PRODUCT_ISSUE_GROUP_LABELS,
  getProductRuleExplanation,
  getProductRuleTier,
  groupIssuesFromProducts,
} from '../utils/productComplianceDisplay.js'

function tierIcon(tier) {
  return tier === 'warning' ? '⚠️' : '❌'
}

function tierHeadingClass(tier) {
  switch (tier) {
    case 'critical':
      return 'text-red-700'
    case 'high':
      return 'text-amber-700'
    default:
      return 'text-blue-700'
  }
}

function MissingList({ items }) {
  if (!items?.length) return null

  return (
    <div className="mt-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Missing</p>
      <ul className="mt-1 space-y-0.5">
        {items.map((item) => (
          <li key={item} className="text-sm text-gray-700">
            {item}
          </li>
        ))}
      </ul>
    </div>
  )
}

function FixStatusControls({ issue, productUrl }) {
  const [showFix, setShowFix] = useState(false)
  const fixable = Boolean(issue.fixAvailable || issue.fixAssistant?.copyReadyText)

  return (
    <div className="mt-3">
      <div className="flex flex-wrap items-center gap-3">
        {fixable ? (
          <>
            <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
              Fix Available
            </span>
            {!showFix && (
              <Button variant="secondary" size="sm" onClick={() => setShowFix(true)}>
                Generate Fix
              </Button>
            )}
          </>
        ) : (
          <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            Manual Action Required
          </span>
        )}
      </div>
      {fixable && showFix && (
        <FixPreviewCard
          action={{
            ruleId: issue.ruleId,
            title: issue.ruleName,
            severity: issue.severity,
            fixAssistant: issue.fixAssistant,
            productUrl,
          }}
          defaultExpanded
        />
      )}
    </div>
  )
}

function ProductIssueCard({ issue }) {
  const tier = getProductRuleTier(issue.ruleId)
  const explanation = issue.explanation || getProductRuleExplanation(issue.ruleId)
  const missingItems = issue.missingFields || issue.missing || []

  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-3">
      <p className={`text-sm font-medium ${tierHeadingClass(tier)}`}>
        {tierIcon(tier)} {issue.ruleId} {issue.ruleName}
      </p>
      {explanation && <p className="mt-1 text-sm text-gray-600">{explanation}</p>}
      <p className="mt-1 text-sm text-gray-700">{issue.message}</p>

      <div className="mt-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Product</p>
        <a
          href={issue.productUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-sm font-medium text-brand-700 hover:underline"
        >
          {issue.productUrl}
        </a>
      </div>

      {issue.warnings?.length > 0 && (
        <ul className="mt-2 space-y-0.5">
          {issue.warnings.map((warning) => (
            <li key={warning} className="text-sm text-amber-700">
              {warning}
            </li>
          ))}
        </ul>
      )}

      <MissingList items={missingItems} />
      <FixStatusControls issue={issue} productUrl={issue.productUrl} />
    </div>
  )
}

function IssueGroup({ tier, issues }) {
  if (!issues?.length) return null

  return (
    <div className="space-y-3">
      <h3 className={`text-sm font-semibold uppercase tracking-wide ${tierHeadingClass(tier)}`}>
        {PRODUCT_ISSUE_GROUP_LABELS[tier]}
      </h3>
      <div className="space-y-3">
        {issues.map((issue) => (
          <ProductIssueCard key={`${issue.productUrl}-${issue.ruleId}-${issue.message}`} issue={issue} />
        ))}
      </div>
    </div>
  )
}

export default function ProductComplianceIssuesSection({ productCompliance }) {
  const groups = groupIssuesFromProducts(productCompliance)
  const hasIssues = groups.critical.length + groups.high.length + groups.warning.length > 0

  if (!hasIssues) return null

  return (
    <Card className="mt-6 border-brand-100" data-testid="product-compliance-issues">
      <h2 className="text-lg font-semibold text-gray-900">Product Compliance Issues</h2>
      <p className="mt-1 text-sm text-gray-500">
        Product-level compliance findings grouped by priority.
      </p>

      <div className="mt-5 space-y-6">
        <IssueGroup tier="critical" issues={groups.critical} />
        <IssueGroup tier="high" issues={groups.high} />
        <IssueGroup tier="warning" issues={groups.warning} />
      </div>
    </Card>
  )
}
