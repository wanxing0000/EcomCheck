import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import {
  initAnalytics,
  isAnalyticsEnabled,
  trackAuditLinkClick,
  trackPageView,
} from '../lib/analytics'

export default function AnalyticsProvider({ children }) {
  const location = useLocation()

  useEffect(() => {
    initAnalytics()
  }, [])

  useEffect(() => {
    if (!isAnalyticsEnabled()) return
    trackPageView(`${location.pathname}${location.search}`)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!isAnalyticsEnabled()) return

    function handleClick(event) {
      const anchor = event.target.closest('a[href]')
      if (!anchor) return
      trackAuditLinkClick(anchor.getAttribute('href'))
    }

    document.addEventListener('click', handleClick)
    return () => document.removeEventListener('click', handleClick)
  }, [])

  return children
}
