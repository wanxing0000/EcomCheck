const GA_ID = import.meta.env.VITE_GA_ID

export function isAnalyticsEnabled() {
  return import.meta.env.PROD && Boolean(GA_ID)
}

let initialized = false

function ensureGtag() {
  if (!isAnalyticsEnabled() || typeof window === 'undefined') return false

  if (!initialized) {
    window.dataLayer = window.dataLayer || []
    window.gtag = function gtag() {
      window.dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', GA_ID, { send_page_view: false })

    const script = document.createElement('script')
    script.async = true
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`
    document.head.appendChild(script)
    initialized = true
  }

  return Boolean(window.gtag)
}

export function initAnalytics() {
  ensureGtag()
}

export function trackEvent(eventName, params = {}) {
  if (!ensureGtag()) return
  window.gtag('event', eventName, params)
}

export function trackPageView(path) {
  trackEvent('page_view', {
    page_path: path,
    page_location: `${window.location.origin}${path}`,
    page_title: document.title,
  })
}

export function trackClickGmcAudit(source = 'link') {
  trackEvent('click_gmc_audit', { source })
}

export function trackClickSeoAudit(source = 'link') {
  trackEvent('click_seo_audit', { source })
}

export function trackStartAudit({ mode, url }) {
  trackEvent('start_audit', { audit_mode: mode, url })
}

export function trackCompleteAudit({ mode, url, reportId = null }) {
  trackEvent('complete_audit', {
    audit_mode: mode,
    url,
    report_id: reportId,
  })
}

export function trackRegister() {
  trackEvent('register')
}

export function trackLogin() {
  trackEvent('login')
}

export function trackViewReport({ reportId = null, auditMode = null, source = 'session' }) {
  trackEvent('view_report', {
    report_id: reportId,
    audit_mode: auditMode,
    source,
  })
}

const GMC_AUDIT_PATHS = new Set(['/audit/gmc', '/audit/shopify-gmc', '/audit/woocommerce-gmc'])
const SEO_AUDIT_PATH = '/audit/seo'

export function trackAuditLinkClick(href) {
  if (!href || href.startsWith('http')) return

  const path = href.split('?')[0]
  if (GMC_AUDIT_PATHS.has(path)) {
    trackClickGmcAudit(path)
    return
  }
  if (path === SEO_AUDIT_PATH) {
    trackClickSeoAudit(path)
  }
}
