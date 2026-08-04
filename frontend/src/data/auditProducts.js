/** Frontend catalog — user-facing products only; full mode is internal (see LEGACY_FULL_AUDIT_PRODUCT). */

export const DEFAULT_AUDIT_MODE = 'gmc'

export const GMC_AUDIT_PRODUCT = {
  id: 'gmc',
  name: 'GMC Approval Risk Audit',
  slug: 'gmc',
  primaryScore: 'gmc',
  paid: true,
  description:
    'Google Merchant Center approval risk analysis with ads, technical, and trust & policy compliance signals.',
  includes: ['gmc', 'ads', 'technical', 'trust', 'policy'],
  landingPath: '/audit/gmc',
  pricing: {
    free: {
      dailyLimit: 3,
      features: [],
    },
    pro: {
      price: null,
      status: 'coming soon',
    },
  },
}

/** GMC report conversion copy — display layer only */
export const GMC_REPORT_CONVERSION = {
  sectionLabel: 'Next steps for your store',
  remainingToday(remaining, limit) {
    return `${remaining} of ${limit} free GMC scans left today`
  },
  professionalAudit: {
    title: 'Professional GMC Audit',
    description: 'Unlock deeper approval risk analysis and ongoing compliance tracking.',
    unlockItems: [
      'Full approval risk analysis',
      'More compliance checks',
      'Historical audit tracking',
      'Detailed fix recommendations',
    ],
    cta: 'Upgrade to Pro',
  },
  fixGuide: {
    title: 'GMC Fix Guide',
    description: 'Follow prioritized steps to resolve approval blockers before Merchant Center review.',
    cta: 'View fix recommendations',
    ctaEmpty: 'Fix guide — coming soon',
  },
}

export function getGmcFreeDailyLimit() {
  return GMC_AUDIT_PRODUCT.pricing?.free?.dailyLimit ?? 3
}

/** GMC product landing page copy — used by GmcAudit.jsx and Home.jsx */
export const GMC_LANDING = {
  hero: {
    title: 'Google Merchant Center Compliance Audit',
    subtitle:
      'Check your ecommerce store before Google Merchant Center review or suspension.',
    cta: 'Start Free GMC Audit',
    urlHint: 'Enter your store URL to generate a GMC Readiness Report in minutes.',
  },
  features: {
    title: 'What we check',
    subtitle: 'GMC readiness signals that commonly cause product disapprovals or account warnings.',
    items: [
      'Product Purchase Flow',
      'Product Data Quality',
      'Price Consistency',
      'Shipping Policy',
      'Return Policy',
      'Payment Information',
      'Business Information',
    ],
  },
  plans: {
    title: 'Simple pricing to get started',
    free: {
      name: 'Free Plan',
      highlight: true,
      items: ['3 GMC audits per day', 'Full GMC compliance report'],
    },
    pro: {
      name: 'Pro Plan',
      comingSoon: true,
      items: ['Unlimited GMC audits', 'More history features (future)'],
    },
  },
  why: {
    title: 'Why GMC Audit',
    subtitle: 'Built for sellers who rely on Google Shopping and need clarity before scaling ad spend.',
    audiences: [
      'Shopify sellers',
      'WooCommerce stores',
      'Ecommerce brands',
      'Google Shopping advertisers',
    ],
  },
}

export const SEO_AUDIT_PRODUCT = {
  id: 'seo',
  name: 'SEO Health Audit',
  slug: 'seo',
  primaryScore: 'seo',
  paid: false,
  description: 'Free on-page SEO health check for organic search visibility.',
  includes: ['seo'],
}

/** Internal — legacy API default (POST { url }) and historical saved reports */
export const LEGACY_FULL_AUDIT_PRODUCT = {
  id: 'full-audit',
  name: 'Full Audit',
  slug: 'full',
  primaryScore: 'compliance+seo',
  internal: true,
  description: 'Legacy combined compliance and SEO report.',
}

export const DEFAULT_AUDIT_PRODUCT = GMC_AUDIT_PRODUCT

/** @type {Record<string, typeof GMC_AUDIT_PRODUCT | typeof LEGACY_FULL_AUDIT_PRODUCT>} */
export const AUDIT_PRODUCT_BY_MODE = {
  gmc: GMC_AUDIT_PRODUCT,
  seo: SEO_AUDIT_PRODUCT,
  full: LEGACY_FULL_AUDIT_PRODUCT,
  custom: {
    id: 'custom-audit',
    name: 'Custom Audit',
    slug: 'custom',
    primaryScore: 'mixed',
    internal: true,
    description: 'Custom module selection via legacy modules parameter.',
  },
}

/** Primary product entry points shown on Home */
export const MAIN_AUDIT_OPTIONS = [
  {
    mode: 'gmc',
    ...GMC_AUDIT_PRODUCT,
    tagline: 'Launch Google Shopping without feed disapprovals or policy surprises.',
    checks: [
      'GMC product data & store policies',
      'Ads tracking & product page readiness',
      'Technical, trust & policy compliance',
    ],
    accent: 'bg-emerald-100 text-emerald-700',
    badge: 'Core · Paid',
  },
  {
    mode: 'seo',
    ...SEO_AUDIT_PRODUCT,
    tagline: 'Improve organic visibility with a clear on-page SEO picture.',
    checks: ['Title & meta description', 'H1 & canonical URLs', 'Robots.txt & sitemap'],
    accent: 'bg-blue-100 text-blue-700',
    badge: 'Free',
  },
]

/** Placeholder cards for upcoming free audit products */
export const FUTURE_AUDIT_OPTIONS = [
  {
    id: 'performance',
    name: 'Performance Audit',
    tagline: 'Core Web Vitals, load speed, and storefront performance signals.',
    accent: 'bg-violet-100 text-violet-700',
  },
  {
    id: 'security',
    name: 'Security Audit',
    tagline: 'HTTPS, headers, and baseline security checks for ecommerce stores.',
    accent: 'bg-amber-100 text-amber-800',
  },
]

export const HERO_GMC_CTA = {
  mode: 'gmc',
  label: 'Start Free GMC Audit',
  hint: 'Google Merchant Center compliance · Instant scan · No account required',
}

/** @deprecated Use MAIN_AUDIT_OPTIONS */
export const CHOOSE_AUDIT_OPTIONS = MAIN_AUDIT_OPTIONS

export function getAuditProductForMode(mode) {
  if (mode === 'full') return LEGACY_FULL_AUDIT_PRODUCT
  return AUDIT_PRODUCT_BY_MODE[mode] || GMC_AUDIT_PRODUCT
}

export function isPublicAuditMode(mode) {
  return mode === 'gmc' || mode === 'seo'
}
