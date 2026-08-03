import { getSiteBaseUrl } from '../data/seoPages.js'

export function toAbsoluteUrl(path = '/') {
  const base = getSiteBaseUrl()
  if (!path || path === '/') return base
  return `${base}${path.startsWith('/') ? path : `/${path}`}`
}

export function buildSoftwareApplicationSchema({
  name,
  description,
  path,
  applicationCategory = 'BusinessApplication',
  operatingSystem = 'Web',
  offers = { price: '0', priceCurrency: 'USD' },
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name,
    description,
    url: toAbsoluteUrl(path),
    applicationCategory,
    operatingSystem,
    offers: {
      '@type': 'Offer',
      price: offers.price ?? '0',
      priceCurrency: offers.priceCurrency ?? 'USD',
    },
  }
}

export function buildFaqPageSchema(faqItems = []) {
  if (!faqItems.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  }
}

export function buildBreadcrumbListSchema(items = []) {
  if (!items.length) return null

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      ...(item.path ? { item: toAbsoluteUrl(item.path) } : {}),
    })),
  }
}

export function buildArticleSchema({ title, description, path, datePublished = '2026-01-01' }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description,
    url: toAbsoluteUrl(path),
    datePublished,
    author: {
      '@type': 'Organization',
      name: 'AuditPilot',
    },
    publisher: {
      '@type': 'Organization',
      name: 'AuditPilot',
    },
  }
}

export function compactSchemaList(schemas = []) {
  return schemas.filter(Boolean)
}
