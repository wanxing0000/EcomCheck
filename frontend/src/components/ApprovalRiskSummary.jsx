function getApprovalRiskLevelStyle(level) {
  switch (level) {
    case 'low':
      return 'bg-green-100 text-green-800 border-green-200'
    case 'medium':
      return 'bg-amber-100 text-amber-900 border-amber-200'
    case 'high':
      return 'bg-red-100 text-red-800 border-red-200'
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200'
  }
}

function getApprovalRiskLevelLabel(level) {
  switch (level) {
    case 'high':
      return '🔴 High Approval Risk'
    case 'medium':
      return '🟡 Medium Approval Risk'
    case 'low':
      return '🟢 Low Approval Risk'
    default:
      return 'Approval Risk'
  }
}

function getFactorSeverityStyle(severity) {
  switch (severity) {
    case 'high':
      return 'bg-red-50 text-red-700 border-red-200'
    case 'medium':
      return 'bg-amber-50 text-amber-800 border-amber-200'
    case 'low':
      return 'bg-gray-100 text-gray-600 border-gray-200'
    default:
      return 'bg-gray-100 text-gray-600 border-gray-200'
  }
}

function getFactorSeverityLabel(severity) {
  if (!severity) return 'Unknown'
  return severity.charAt(0).toUpperCase() + severity.slice(1)
}

export default function ApprovalRiskSummary({ approvalRisk }) {
  if (!approvalRisk) return null

  return (
    <section
      className="mt-6 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50 to-white p-4 sm:p-5"
      aria-labelledby="approval-readiness-heading"
    >
      <h2 id="approval-readiness-heading" className="text-lg font-semibold text-gray-900">
        Approval Readiness
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{approvalRisk.summary}</p>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Risk Level</p>
          <span
            className={`mt-1 inline-flex max-w-full rounded-full border px-3 py-1.5 text-sm font-semibold ${getApprovalRiskLevelStyle(approvalRisk.level)}`}
          >
            {getApprovalRiskLevelLabel(approvalRisk.level)}
          </span>
        </div>
        {approvalRisk.readinessScore != null && (
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Readiness Score</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{approvalRisk.readinessScore}/100</p>
          </div>
        )}
      </div>

      {approvalRisk.riskFactors?.length > 0 && (
        <div className="mt-5">
          <h3 className="text-sm font-semibold text-gray-900">Risk Factors</h3>
          <p className="mt-1 text-xs text-gray-500">
            {approvalRisk.riskFactors.length} area(s) may affect approval readiness. See Fix Recommendations below for actions.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {approvalRisk.riskFactors.map((factor) => (
              <li
                key={factor.id}
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium ${getFactorSeverityStyle(factor.severity)}`}
              >
                <span className="font-bold">{factor.id}</span>
                <span>{factor.title}</span>
                <span className="opacity-75">· {getFactorSeverityLabel(factor.severity)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
