import Card from './Card'

function formatRiskLevelLabel(level) {
  if (!level) return 'Unknown'
  return level.charAt(0).toUpperCase() + level.slice(1)
}

function readComparisonScore(snapshot) {
  if (snapshot?.complianceScore != null) return snapshot.complianceScore
  return snapshot?.gmcRiskScore ?? '—'
}

export default function AuditHistoryComparison({ comparison, title = 'Report comparison' }) {
  if (!comparison) return null

  const complianceDelta = comparison.scoreChange?.compliance
  const gmcDelta = comparison.scoreChange?.gmc
  const improvementLabel = complianceDelta || gmcDelta

  return (
    <Card className="border-emerald-100 bg-gradient-to-r from-emerald-50/70 to-white">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-1 text-sm text-gray-500">
        Latest report compared with your previous audit for this website.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Previous audit</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900">
            {readComparisonScore(comparison.previous)}
            {readComparisonScore(comparison.previous) !== '—' ? '/100' : ''}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {formatRiskLevelLabel(comparison.previous?.approvalRisk)} risk
          </p>
          {comparison.previous?.createdAt && (
            <p className="mt-1 text-xs text-gray-500">
              {new Date(comparison.previous.createdAt).toLocaleString()}
            </p>
          )}
        </div>
        <div className="rounded-xl border border-emerald-200 bg-white px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Latest audit</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-gray-900">
            {readComparisonScore(comparison.current)}
            {readComparisonScore(comparison.current) !== '—' ? '/100' : ''}
          </p>
          <p className="mt-1 text-sm text-gray-600">
            {formatRiskLevelLabel(comparison.current?.approvalRisk)} risk
          </p>
          {comparison.current?.createdAt && (
            <p className="mt-1 text-xs text-gray-500">
              {new Date(comparison.current.createdAt).toLocaleString()}
            </p>
          )}
        </div>
      </div>

      {improvementLabel && (
        <p className="mt-4 text-sm font-medium text-emerald-800">
          Score change: {improvementLabel} points
        </p>
      )}

      {comparison.summary && <p className="mt-2 text-sm text-gray-700">{comparison.summary}</p>}

      {comparison.resolvedRuleDetails?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resolved issues</p>
          <ul className="mt-2 space-y-1">
            {comparison.resolvedRuleDetails.map((item) => (
              <li key={item.ruleId} className="text-sm text-emerald-800">
                ✓ {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparison.newIssueDetails?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">New issues</p>
          <ul className="mt-2 space-y-1">
            {comparison.newIssueDetails.map((item) => (
              <li key={item.ruleId} className="text-sm text-red-700">
                ✕ {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}

      {comparison.unchangedIssueDetails?.length > 0 && (
        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Unchanged issues</p>
          <ul className="mt-2 space-y-1">
            {comparison.unchangedIssueDetails.map((item) => (
              <li key={item.ruleId} className="text-sm text-amber-800">
                ⚠ {item.title}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
