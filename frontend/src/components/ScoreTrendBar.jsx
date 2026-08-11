function scoreBarColor(score) {
  if (score == null) return 'bg-gray-200'
  if (score >= 80) return 'bg-emerald-500'
  if (score >= 60) return 'bg-amber-400'
  return 'bg-red-400'
}

export default function ScoreTrendBar({ trend = [], className = '' }) {
  if (!trend.length) {
    return <span className="text-xs text-gray-400">No trend yet</span>
  }

  const maxScore = 100

  return (
    <div className={`flex items-end gap-1 ${className}`} title="Compliance score trend">
      {trend.map((entry) => (
        <div key={`${entry.reportId}-${entry.date}`} className="flex flex-col items-center gap-1">
          <div
            className={`w-2 rounded-sm ${scoreBarColor(entry.score)}`}
            style={{ height: `${Math.max(8, (entry.score / maxScore) * 32)}px` }}
          />
        </div>
      ))}
    </div>
  )
}
