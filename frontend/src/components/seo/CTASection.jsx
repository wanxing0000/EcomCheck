import { Link } from 'react-router-dom'
import Card from '../Card'
import { getAuditProductForMode } from '../../data/auditProducts.js'
import { SEO_AUDIT_TOOL_PAGES } from '../../data/seoPages.js'

/**
 * Related audit CTA for SEO content pages.
 * @param {{
 *   relatedAudit?: string,
 *   auditCta?: { title?: string, body?: string, primaryLabel?: string, secondaryLabel?: string },
 *   className?: string,
 * }} props
 */
export default function CTASection({ relatedAudit = 'gmc', auditCta, className = '' }) {
  const auditMode = relatedAudit === 'seo' ? 'seo' : 'gmc'
  const auditPath = auditMode === 'seo' ? '/audit/seo' : '/audit/gmc'
  const toolName = SEO_AUDIT_TOOL_PAGES[auditMode]?.name || 'Free Audit'
  const title = auditCta?.title || 'Audit your store now'
  const body =
    auditCta?.body ||
    `Run a free ${auditMode === 'gmc' ? 'GMC Compliance' : 'SEO Health'} audit to see which requirements your storefront passes or fails.`

  return (
    <Card className={`scroll-mt-24 border-emerald-100 bg-emerald-50/40 ${className}`}>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600">{body}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <Link
          to={auditPath}
          className="inline-flex items-center justify-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
        >
          {auditCta?.primaryLabel || `Start ${toolName}`}
        </Link>
        <Link
          to="/scan"
          state={{
            mode: auditMode,
            auditProduct: getAuditProductForMode(auditMode),
          }}
          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {auditCta?.secondaryLabel || 'Go to scan'}
        </Link>
      </div>
    </Card>
  )
}
