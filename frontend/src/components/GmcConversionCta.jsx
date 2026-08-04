import Button from './Button'
import {
  GMC_REPORT_CONVERSION,
  getGmcFreeDailyLimit,
} from '../data/auditProducts.js'

const FIX_GUIDE_SECTION_ID = 'gmc-fix-recommendations'

export { FIX_GUIDE_SECTION_ID }

export default function GmcConversionCta({ gmcReadiness, gmcFixRecommendations, usage }) {
  if (!gmcReadiness) return null

  const dailyLimit = usage?.dailyLimit ?? getGmcFreeDailyLimit()
  const isFreeUser = !usage?.unlimited
  const remaining = usage?.remaining ?? dailyLimit
  const proStatus = 'coming soon'
  const hasFixGuide = gmcFixRecommendations?.length > 0
  const nextAction = gmcFixRecommendations?.[0]
  const { professionalAudit, fixGuide } = GMC_REPORT_CONVERSION

  function scrollToFixGuide() {
    const el = document.getElementById(FIX_GUIDE_SECTION_ID)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <div className="mt-5 border-t border-emerald-100 pt-5">
      <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-5">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          {GMC_REPORT_CONVERSION.sectionLabel}
        </p>

        {isFreeUser && (
          <p className="mt-2 text-sm font-medium text-amber-800">
            {GMC_REPORT_CONVERSION.remainingToday(remaining, dailyLimit)}
          </p>
        )}

        {nextAction && (
          <p className="mt-2 text-sm text-gray-600">
            Top priority: <span className="font-medium text-gray-900">{nextAction.title}</span>
          </p>
        )}

        <div className="mt-4 rounded-lg border border-emerald-200 bg-white p-4">
          <h4 className="text-sm font-semibold text-gray-900">{professionalAudit.title}</h4>
          <p className="mt-1 text-sm text-gray-600">{professionalAudit.description}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-gray-500">Unlock</p>
          <ul className="mt-2 space-y-1.5 text-sm text-gray-700">
            {professionalAudit.unlockItems.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-600">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-semibold text-white opacity-90 sm:w-auto sm:px-6"
          >
            {professionalAudit.cta} — {proStatus}
          </button>
          {hasFixGuide && (
            <Button type="button" variant="secondary" className="mt-3 w-full sm:w-auto" onClick={scrollToFixGuide}>
              {fixGuide.cta}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
