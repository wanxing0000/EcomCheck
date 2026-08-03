import { useEffect } from 'react'
import { SEO_SITE, formatSeoTitle, getSiteBaseUrl } from '../data/seoPages.js'

function upsertMeta(attr, key, content) {
  if (content == null || content === '') return

  let el = document.head.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', content)
}

function upsertLink(rel, href) {
  if (!href) return

  let el = document.head.querySelector(`link[rel="${rel}"]`)
  if (!el) {
    el = document.createElement('link')
    el.setAttribute('rel', rel)
    document.head.appendChild(el)
  }
  el.setAttribute('href', href)
}

/**
 * Client-side SEO metadata — title, description, canonical, Open Graph.
 */
export default function SeoMetadata({
  title,
  description = SEO_SITE.defaultDescription,
  keywords = [],
  canonicalPath,
  ogType = 'website',
  ogImagePath = SEO_SITE.ogImagePath,
  noIndex = false,
}) {
  useEffect(() => {
    const origin = getSiteBaseUrl()
    const path = canonicalPath || window.location.pathname
    const canonicalUrl = `${origin}${path}`
    const pageTitle = formatSeoTitle(title)
    const ogImage = ogImagePath?.startsWith('http') ? ogImagePath : `${origin}${ogImagePath || '/favicon.svg'}`

    document.title = pageTitle

    upsertMeta('name', 'description', description)
    upsertMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow')

    if (keywords.length > 0) {
      upsertMeta('name', 'keywords', keywords.join(', '))
    }

    upsertLink('canonical', canonicalUrl)

    upsertMeta('property', 'og:site_name', SEO_SITE.name)
    upsertMeta('property', 'og:title', pageTitle)
    upsertMeta('property', 'og:description', description)
    upsertMeta('property', 'og:type', ogType)
    upsertMeta('property', 'og:url', canonicalUrl)
    upsertMeta('property', 'og:locale', SEO_SITE.locale)
    upsertMeta('property', 'og:image', ogImage)

    upsertMeta('name', 'twitter:card', 'summary')
    upsertMeta('name', 'twitter:title', pageTitle)
    upsertMeta('name', 'twitter:description', description)
    upsertMeta('name', 'twitter:url', canonicalUrl)
    upsertMeta('name', 'twitter:image', ogImage)
  }, [title, description, keywords, canonicalPath, ogType, ogImagePath, noIndex])

  return null
}
