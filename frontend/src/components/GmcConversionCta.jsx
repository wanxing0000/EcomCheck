import Button from './Button'
import {
  GMC_AUDIT_PRODUCT,
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
  const proStatus = GMC_AUDIT_PRODUCT.pricing?.pro?.status ?? 'coming soon'
  const hasFixGuide = gmcFixRecommendations?.length > 0
  const nextAction = gmcFixRecommendations?.[0]

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

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col rounded-lg border border-emerald-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-gray-900">
              {GMC_REPORT_CONVERSION.unlimitedAudit.title}
            </h4>
            <p className="mt-1 flex-1 text-sm text-gray-600">
              {GMC_REPORT_CONVERSION.unlimitedAudit.description}
            </p>
            <button
              type="button"
              disabled
              className="mt-4 w-full cursor-not-allowed rounded-lg bg-emerald-600/80 px-4 py-2 text-sm font-semibold text-white opacity-90"
            >
              {GMC_REPORT_CONVERSION.unlimitedAudit.cta} — {proStatus}
            </button>
          </div>

          <div className="flex flex-col rounded-lg border border-emerald-200 bg-white p-4">
            <h4 className="text-sm font-semibold text-gray-900">{GMC_REPORT_CONVERSION.fixGuide.title}</h4>
            <p className="mt-1 flex-1 text-sm text-gray-600">
              {GMC_REPORT_CONVERSION.fixGuide.description}
            </p>
            {hasFixGuide ? (
              <Button type="button" variant="secondary" className="mt-4 w-full" onClick={scrollToFixGuide}>
                {GMC_REPORT_CONVERSION.fixGuide.cta}
              </Button>
            ) : (
              <button
                type="button"
                disabled
                className="mt-4 w-full cursor-not-allowed rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-500"
              >
                {GMC_REPORT_CONVERSION.fixGuide.ctaEmpty}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
