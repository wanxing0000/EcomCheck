/** SEO page registry — data-driven landing, guide, and blog metadata (display layer only). */

export const SEO_SITE = {
  name: 'AuditPilot',
  baseUrl: 'https://auditpilot.cc',
  defaultTitle: 'AuditPilot — Free Ecommerce Audit Tools',
  defaultDescription:
    'Free ecommerce audit tools for Google Merchant Center compliance and SEO health. Scan your store in minutes.',
  titleSuffix: ' | AuditPilot',
  locale: 'en_US',
  ogImagePath: '/favicon.svg',
}

/** Guide/blog content categories for hub grouping and related content */
export const SEO_CONTENT_CATEGORIES = {
  GMC: {
    id: 'GMC',
    label: 'GMC',
    accent: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  Shopify: {
    id: 'Shopify',
    label: 'Shopify',
    accent: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  WooCommerce: {
    id: 'WooCommerce',
    label: 'WooCommerce',
    accent: 'border-purple-200 bg-purple-50 text-purple-800',
  },
  SEO: {
    id: 'SEO',
    label: 'SEO',
    accent: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  Ecommerce: {
    id: 'Ecommerce',
    label: 'Ecommerce',
    accent: 'border-gray-200 bg-gray-50 text-gray-700',
  },
}

export const SEO_CONTENT_CATEGORY_IDS = Object.keys(SEO_CONTENT_CATEGORIES)

export function getCategoryMeta(categoryId) {
  return SEO_CONTENT_CATEGORIES[categoryId] || null
}

/** Resolve categories from document — supports legacy `category: 'gmc'` field */
export function resolveGuideCategories(page) {
  if (page?.categories?.length) return page.categories
  if (page?.category === 'gmc') return ['GMC', 'Ecommerce']
  if (page?.category === 'seo') return ['SEO', 'Ecommerce']
  return page ? ['Ecommerce'] : []
}

export function getPrimaryCategoryLabel(page) {
  const categories = resolveGuideCategories(page)
  const primary = categories[0]
  return getCategoryMeta(primary)?.label || 'Guide'
}

export function getSiteBaseUrl() {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SITE_URL) {
    return String(import.meta.env.VITE_SITE_URL).replace(/\/$/, '')
  }
  if (typeof process !== 'undefined' && process.env?.VITE_SITE_URL) {
    return String(process.env.VITE_SITE_URL).replace(/\/$/, '')
  }
  return SEO_SITE.baseUrl
}

/** Schema + metadata for primary audit tool routes */
export const SEO_AUDIT_TOOL_PAGES = {
  gmc: {
    path: '/audit/gmc',
    name: 'GMC Compliance Audit',
    title: 'Free Google Merchant Center Compliance Audit',
    metaDescription:
      'Check your ecommerce store for Google Merchant Center readiness — policies, product data, pricing, and purchase flow.',
    keywords: ['google merchant center audit', 'gmc compliance', 'ecommerce audit'],
    applicationCategory: 'BusinessApplication',
    breadcrumbs: [
      { label: 'Home', path: '/' },
      { label: 'GMC Compliance Audit', path: '/audit/gmc' },
    ],
  },
  seo: {
    path: '/audit/seo',
    name: 'SEO Health Audit',
    title: 'Free SEO Health Audit for Ecommerce Stores',
    metaDescription:
      'Analyze your website SEO health and find optimization opportunities. Free unlimited scans.',
    keywords: ['seo audit', 'ecommerce seo', 'on-page seo check'],
    applicationCategory: 'BusinessApplication',
    breadcrumbs: [
      { label: 'Home', path: '/' },
      { label: 'SEO Health Audit', path: '/audit/seo' },
    ],
  },
}

export const SEO_TOOL_LINKS = {
  gmc: {
    id: 'gmc',
    path: '/audit/gmc',
    label: 'GMC Compliance Audit',
    description: 'Google Merchant Center readiness and compliance bundle.',
  },
  seo: {
    id: 'seo',
    path: '/audit/seo',
    label: 'SEO Health Audit',
    description: 'Free on-page SEO health check for organic visibility.',
  },
  'shopify-gmc': {
    id: 'shopify-gmc',
    path: '/audit/shopify-gmc',
    label: 'Shopify GMC Audit',
    description: 'GMC compliance scan tailored for Shopify stores.',
  },
  'woocommerce-gmc': {
    id: 'woocommerce-gmc',
    path: '/audit/woocommerce-gmc',
    label: 'WooCommerce GMC Audit',
    description: 'GMC compliance scan tailored for WooCommerce stores.',
  },
  performance: {
    id: 'performance',
    path: '/',
    label: 'Performance Audit',
    description: 'Core Web Vitals and storefront speed signals.',
    comingSoon: true,
  },
  security: {
    id: 'security',
    path: '/',
    label: 'Security Audit',
    description: 'HTTPS, headers, and baseline security checks.',
    comingSoon: true,
  },
}

export const SEO_GUIDE_LINKS = {
  'google-merchant-center-misrepresentation': {
    id: 'google-merchant-center-misrepresentation',
    path: '/guides/google-merchant-center-misrepresentation',
    label: 'GMC Misrepresentation Policy',
    description: 'How misrepresentation triggers disapprovals and suspensions.',
  },
  'google-merchant-center-suspension': {
    id: 'google-merchant-center-suspension',
    path: '/guides/google-merchant-center-suspension',
    label: 'GMC Account Suspension',
    description: 'Common suspension causes and recovery steps.',
  },
  'google-merchant-center-requirements': {
    id: 'google-merchant-center-requirements',
    path: '/guides/google-merchant-center-requirements',
    label: 'GMC Requirements Checklist',
    description: 'Store policies and product data Google expects before approval.',
  },
}

/** @typedef {'paragraph'|'heading'|'list'} ContentBlockType */

/** Platform / programmatic SEO landing pages */
export const SEO_LANDING_PAGES = {
  'shopify-gmc': {
    slug: 'shopify-gmc',
    path: '/audit/shopify-gmc',
    pageType: 'landing',
    title: 'Free Shopify Google Merchant Center Audit Tool',
    metaDescription:
      'Check your Shopify store for Google Merchant Center compliance issues before launching Shopping ads.',
    keywords: [
      'shopify google merchant center audit',
      'shopify gmc compliance',
      'shopify product feed approval',
    ],
    h1: 'Shopify Google Merchant Center Audit',
    categories: ['GMC', 'Shopify', 'Ecommerce'],
    relatedAudit: 'gmc',
    hero: {
      subtitle:
        'Scan your Shopify storefront for GMC readiness — policies, product data, pricing, and purchase flow signals.',
      cta: 'Run Free Shopify GMC Audit',
      urlHint: 'Enter your Shopify store URL to generate a GMC Readiness Report.',
    },
    problem: {
      title: 'Why Shopify stores fail GMC review',
      subtitle: 'Common blockers we see before merchants scale Google Shopping spend.',
      items: [
        'Missing or incomplete return and shipping policies on the storefront',
        'Product schema and display price mismatches across collection pages',
        'Business contact and payment information not visible to shoppers',
        'Checkout or purchase flow signals that do not match Merchant Center listings',
      ],
    },
    features: {
      title: 'What the Shopify GMC audit checks',
      items: [
        'Product purchase flow and add-to-cart readiness',
        'Product data quality and JSON-LD schema signals',
        'Price consistency between schema and on-page display',
        'Return, shipping, and payment policy coverage',
        'Business information and trust signals',
      ],
    },
    faq: {
      title: 'Shopify GMC audit FAQ',
      items: [
        {
          q: 'Does this work with any Shopify theme?',
          a: 'Yes. AuditPilot scans your public storefront URL regardless of theme or apps installed.',
        },
        {
          q: 'How many free scans do I get?',
          a: 'The free plan includes 3 GMC audits per day. SEO Health Audit remains unlimited.',
        },
        {
          q: 'Will this fix my Google Merchant Center disapprovals?',
          a: 'The audit highlights likely blockers and prioritized fix steps. You still apply changes in Shopify and Merchant Center.',
        },
      ],
    },
    platformContext: {
      title: 'Shopify-specific GMC signals we evaluate',
      intro:
        'Shopify stores often pass theme review but still fail Merchant Center checks when policy pages live only in the admin or checkout extensions hide business details from crawlers.',
      paragraphs: [
        'We crawl the same public URLs Google Shopping uses — your Online Store domain, not the Shopify admin. That includes collection pages where JSON-LD product schema must match displayed prices.',
        'Shopify Markets, multi-currency setups, and discount apps are common sources of price mismatch flags (G006). The audit surfaces those before you scale ad spend.',
      ],
      checklist: [
        'Refund and shipping pages linked from theme footer on all templates',
        'Product JSON-LD present on best-selling PDP templates',
        'Contact page or footer shows customer support email or phone',
        'Checkout domain matches the domain submitted in Merchant Center',
      ],
    },
    workflow: {
      title: 'How the Shopify GMC audit works',
      steps: [
        {
          title: 'Paste your storefront URL',
          body: 'Use your custom domain or myshopify.com URL — whichever appears on live product pages.',
        },
        {
          title: 'We scan policy and product pages',
          body: 'AuditPilot checks GMC rules G001–G010 plus bundled ads, technical, and trust signals.',
        },
        {
          title: 'Review readiness score and fix list',
          body: 'Critical issues, warnings, and prioritized fix recommendations appear in your GMC Readiness Report.',
        },
      ],
    },
    auditCta: {
      title: 'Scan your Shopify store before Shopping ads',
      body: 'Catch policy and pricing issues while your catalog is still small — not after Merchant Center disapprovals stack up.',
    },
    relatedTools: ['gmc', 'seo', 'woocommerce-gmc'],
    relatedGuides: [
      'google-merchant-center-requirements',
      'google-merchant-center-misrepresentation',
    ],
    contentBlocks: [],
  },
  'woocommerce-gmc': {
    slug: 'woocommerce-gmc',
    path: '/audit/woocommerce-gmc',
    pageType: 'landing',
    title: 'Free WooCommerce Google Merchant Center Audit Tool',
    metaDescription:
      'Check your WooCommerce store for Google Merchant Center compliance issues before product feed submission.',
    keywords: [
      'woocommerce google merchant center audit',
      'woocommerce gmc compliance',
      'woocommerce shopping ads readiness',
    ],
    h1: 'WooCommerce Google Merchant Center Audit',
    categories: ['GMC', 'WooCommerce', 'Ecommerce'],
    relatedAudit: 'gmc',
    hero: {
      subtitle:
        'Audit WooCommerce policy pages, product schema, pricing consistency, and checkout signals for GMC approval.',
      cta: 'Run Free WooCommerce GMC Audit',
      urlHint: 'Enter your WooCommerce store URL to generate a GMC Readiness Report.',
    },
    problem: {
      title: 'Why WooCommerce stores get GMC warnings',
      subtitle: 'Policy and product data gaps that stall feed approval.',
      items: [
        'Refund and shipping pages missing from footer or hard to find',
        'Structured data incomplete on variable or sale-priced products',
        'Contact details and business identity not clearly published',
        'Plugin conflicts hiding policy links from crawlers',
      ],
    },
    features: {
      title: 'What the WooCommerce GMC audit checks',
      items: [
        'GMC product data and availability signals',
        'Price consistency across product and category pages',
        'Return, shipping, and payment policy detection',
        'Technical and trust compliance bundled with GMC mode',
        'Ads tracking and JSON-LD product schema basics',
      ],
    },
    faq: {
      title: 'WooCommerce GMC audit FAQ',
      items: [
        {
          q: 'Do I need a WordPress login?',
          a: 'No. AuditPilot only needs your public store URL — the same pages Google crawls.',
        },
        {
          q: 'Is WooCommerce multistore supported?',
          a: 'Run a separate audit per storefront URL you plan to advertise in Merchant Center.',
        },
        {
          q: 'Can I re-scan after fixing policies?',
          a: 'Yes. Use remaining daily GMC scans to verify fixes before resubmitting your feed.',
        },
      ],
    },
    platformContext: {
      title: 'WooCommerce-specific GMC signals we evaluate',
      intro:
        'WooCommerce sites frequently fail GMC review when policy pages exist in WordPress but are missing from the storefront menu, or when caching plugins serve stale schema to Googlebot.',
      paragraphs: [
        'The audit requests your public shop URL — the same pages linked from Google product listings. Variable products, sale badges, and tax display settings often cause schema vs display price drift.',
        'Plugin stacks (page builders, SEO plugins, feed managers) can duplicate or strip JSON-LD. AuditPilot flags missing product data and unreachable policies without requiring wp-admin access.',
      ],
      checklist: [
        'Refund and shipping pages assigned in footer widget or menu',
        'Structured data output on simple and variable product templates',
        'Business address or support contact visible before checkout',
        'No maintenance mode or geo block on policy URLs',
      ],
    },
    workflow: {
      title: 'How the WooCommerce GMC audit works',
      steps: [
        {
          title: 'Submit your shop homepage or domain',
          body: 'We follow internal links to policy and sample product pages like Googlebot would.',
        },
        {
          title: 'Policy and feed readiness checks run',
          body: 'Return, shipping, payment, pricing consistency, and purchase flow rules execute in GMC audit mode.',
        },
        {
          title: 'Export fixes to your WordPress backlog',
          body: 'Use the prioritized fix list to update pages, schema plugins, and footer links before feed resubmission.',
        },
      ],
    },
    auditCta: {
      title: 'Validate WooCommerce policies before feed upload',
      body: 'Confirm WordPress pages are crawlable and product data matches Merchant Center listings.',
    },
    relatedTools: ['gmc', 'seo', 'shopify-gmc'],
    relatedGuides: [
      'google-merchant-center-requirements',
      'google-merchant-center-suspension',
    ],
    contentBlocks: [],
  },
}

/** Educational guide pages — long-form SEO content documents */
export const SEO_GUIDE_PAGES = {
  'google-merchant-center-misrepresentation': {
    slug: 'google-merchant-center-misrepresentation',
    path: '/guides/google-merchant-center-misrepresentation',
    pageType: 'guide',
    title: 'Google Merchant Center Misrepresentation — Causes & Fixes',
    description:
      'Learn how Google Merchant Center misrepresentation policy works, what triggers disapprovals, and how to audit your store before Shopping ads.',
    metaDescription:
      'Learn how Google Merchant Center misrepresentation policy works, what triggers disapprovals, and how to audit your store.',
    keywords: [
      'google merchant center misrepresentation',
      'gmc misrepresentation policy',
      'merchant center disapproval',
    ],
    h1: 'Google Merchant Center Misrepresentation Explained',
    categories: ['GMC', 'Ecommerce'],
    relatedAudit: 'gmc',
    relatedTools: ['gmc', 'shopify-gmc', 'woocommerce-gmc', 'seo'],
    relatedGuides: [
      'google-merchant-center-requirements',
      'google-merchant-center-suspension',
    ],
    auditCta: {
      title: 'Scan for misrepresentation risks before Google does',
      body: 'Run a free GMC Compliance Audit to compare your policies, prices, and product pages against common misrepresentation triggers.',
      primaryLabel: 'Start Free GMC Audit',
    },
    contentBlocks: [
      {
        type: 'paragraph',
        text: 'Misrepresentation is one of the fastest ways to lose Google Shopping visibility. Google expects your storefront, product listings, and checkout experience to accurately represent what you sell, how you ship, and how customers can get support.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'What counts as misrepresentation',
      },
      {
        type: 'paragraph',
        text: 'Misrepresentation is not limited to fraudulent intent. Google flags stores when shoppers cannot verify basic facts about the business, product, or purchase terms before checkout.',
      },
      {
        type: 'list',
        items: [
          'Product titles, images, or prices that do not match the landing page',
          'Missing or misleading return, shipping, or payment information',
          'Business identity or contact details that are hidden or inconsistent',
          'Checkout flows that surprise shoppers with unexpected fees or terms',
        ],
      },
      {
        type: 'heading',
        level: 3,
        text: 'Product page mismatches',
      },
      {
        type: 'paragraph',
        text: 'Feed titles and hero images must reflect the item on the landing page. Sale pricing, bundles, and variant selectors are frequent sources of mismatch when Merchant Center listings are not updated after theme or catalog changes.',
      },
      {
        type: 'heading',
        level: 3,
        text: 'Policy and business identity gaps',
      },
      {
        type: 'paragraph',
        text: 'Return, shipping, and payment policies must be easy to find — typically from the footer on every template. Contact details and business name should match what you submit in Merchant Center.',
      },
      {
        type: 'callout',
        title: 'Why this matters for ecommerce SEO',
        text: 'Misrepresentation fixes also improve trust signals on your storefront, which supports both paid listings and organic conversion rates.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'How to reduce misrepresentation risk',
      },
      {
        type: 'list',
        items: [
          'Publish clear policy pages linked from every template footer',
          'Keep schema.org product data aligned with on-page prices',
          'Show business contact information before checkout',
          'Re-audit after major theme or pricing changes',
        ],
      },
      {
        type: 'heading',
        level: 2,
        text: 'Audit workflow for merchants',
      },
      {
        type: 'paragraph',
        text: 'Start with a full-store GMC audit, fix critical issues in priority order, then re-scan after publishing policy and pricing updates. Document changes before requesting Merchant Center review if disapprovals already exist.',
      },
    ],
    faq: {
      title: 'Misrepresentation FAQ',
      items: [
        {
          q: 'Is misrepresentation the same as a counterfeit claim?',
          a: 'No. Counterfeit allegations involve brand authenticity. Misrepresentation covers inaccurate pricing, missing policies, and misleading purchase terms even for legitimate products.',
        },
        {
          q: 'Can one product disapproval trigger account issues?',
          a: 'Repeated or severe mismatches can escalate from item-level disapprovals to account warnings. Fix root causes on the storefront, not only in the feed.',
        },
        {
          q: 'How often should I re-audit my store?',
          a: 'Re-audit after theme changes, major sales, new markets, or any Merchant Center notification. Free GMC audits include three scans per day.',
        },
      ],
    },
  },
  'google-merchant-center-suspension': {
    slug: 'google-merchant-center-suspension',
    path: '/guides/google-merchant-center-suspension',
    pageType: 'guide',
    title: 'Google Merchant Center Suspension — Recovery Guide',
    description:
      'Understand common Google Merchant Center suspension causes, how to prioritize storefront fixes, and when to request account review.',
    metaDescription:
      'Understand common Google Merchant Center suspension causes and the store fixes to prioritize before appeal.',
    keywords: [
      'google merchant center suspension',
      'gmc account suspended',
      'merchant center appeal',
    ],
    h1: 'Google Merchant Center Suspension Guide',
    categories: ['GMC', 'Ecommerce'],
    relatedAudit: 'gmc',
    relatedTools: ['gmc', 'shopify-gmc', 'woocommerce-gmc'],
    relatedGuides: [
      'google-merchant-center-misrepresentation',
      'google-merchant-center-requirements',
    ],
    auditCta: {
      title: 'Validate fixes before you appeal',
      body: 'Use a GMC Readiness Report to confirm policy pages, pricing, and product data are fixed on your live storefront.',
    },
    contentBlocks: [
      {
        type: 'paragraph',
        text: 'A Merchant Center suspension stops new product approvals and can pause Shopping campaigns. Most suspensions trace back to repeated policy violations, misrepresentation, or unresolved product data issues.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Common suspension triggers',
      },
      {
        type: 'list',
        items: [
          'Repeated misrepresentation or unreachable policy pages',
          'Counterfeit or prohibited product claims in listings',
          'Persistent checkout or pricing mismatches',
          'Unverified business information or domain ownership issues',
        ],
      },
      {
        type: 'heading',
        level: 3,
        text: 'Policy and website quality issues',
      },
      {
        type: 'paragraph',
        text: 'Google re-crawls your storefront when reviewing suspensions. If refund or shipping pages moved, broke, or were removed during a redesign, the account may stay suspended even after feed edits.',
      },
      {
        type: 'heading',
        level: 3,
        text: 'Product data and checkout mismatches',
      },
      {
        type: 'paragraph',
        text: 'Price, availability, and condition in Merchant Center must match what shoppers see on the product page and in checkout. Variable products and automatic currency conversion are common failure points.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Recovery checklist',
      },
      {
        type: 'list',
        items: [
          'Fix every issue cited in Merchant Center diagnostics',
          'Re-publish policies and verify links from the homepage footer',
          'Align feed prices with live product pages',
          'Document changes, then request review through Merchant Center',
        ],
      },
      {
        type: 'callout',
        title: 'Before you submit an appeal',
        text: 'Screenshot policy URLs, pricing examples, and audit reports. Appeals without verifiable storefront fixes rarely succeed on the first attempt.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Post-recovery monitoring',
      },
      {
        type: 'paragraph',
        text: 'After reinstatement, schedule a weekly GMC audit while campaigns scale. Small catalog or theme changes can reintroduce the same disapproval patterns that caused the suspension.',
      },
    ],
    faq: {
      title: 'Suspension recovery FAQ',
      items: [
        {
          q: 'How long does Merchant Center review take?',
          a: 'Timelines vary by issue type and queue volume. Submit only after live storefront fixes are complete — re-submitting too early can delay resolution.',
        },
        {
          q: 'Should I create a new Merchant Center account?',
          a: 'Avoid circumvention. Google links business identity, domains, and payment profiles. Fix the original account unless Google explicitly directs otherwise.',
        },
        {
          q: 'Will pausing ads help reinstatement?',
          a: 'Pausing ads does not replace policy fixes. Google evaluates the storefront and account history, not only active campaign status.',
        },
      ],
    },
  },
  'google-merchant-center-requirements': {
    slug: 'google-merchant-center-requirements',
    path: '/guides/google-merchant-center-requirements',
    pageType: 'guide',
    title: 'Google Merchant Center Requirements Checklist for Ecommerce',
    description:
      'A practical checklist of Google Merchant Center store requirements — policies, product data, trust signals, and how AuditPilot maps each rule.',
    metaDescription:
      'A practical checklist of Google Merchant Center store requirements — policies, product data, and trust signals.',
    keywords: [
      'google merchant center requirements',
      'gmc store requirements',
      'merchant center checklist',
    ],
    h1: 'Google Merchant Center Requirements Checklist',
    categories: ['GMC', 'Ecommerce'],
    relatedAudit: 'gmc',
    relatedTools: ['gmc', 'seo', 'shopify-gmc', 'woocommerce-gmc'],
    relatedGuides: [
      'google-merchant-center-misrepresentation',
      'google-merchant-center-suspension',
    ],
    auditCta: {
      title: 'See which requirements your store passes today',
      body: 'Run the free GMC Compliance Audit for an itemized readiness report mapped to the checklist below.',
    },
    contentBlocks: [
      {
        type: 'paragraph',
        text: 'Before Google approves your feed, your storefront must meet baseline ecommerce policy and product data expectations. This checklist maps the signals AuditPilot evaluates in GMC Compliance Audit mode.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Store policy requirements',
      },
      {
        type: 'paragraph',
        text: 'Policies must be published on crawlable URLs and linked from every major template — not only buried in checkout or help widgets.',
      },
      {
        type: 'list',
        items: [
          'Return and refund policy accessible from the site footer',
          'Shipping policy with delivery expectations and regions served',
          'Payment methods and billing terms clearly stated',
          'Privacy policy where customer data is collected',
        ],
      },
      {
        type: 'heading',
        level: 3,
        text: 'Return and shipping pages',
      },
      {
        type: 'paragraph',
        text: 'Google expects clear return windows, refund methods, and shipping timelines. Generic “contact us for returns” copy often fails automated policy checks.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Product and business requirements',
      },
      {
        type: 'list',
        items: [
          'Accurate product titles, images, and availability on landing pages',
          'Structured product data with consistent pricing and currency',
          'Working add-to-cart or buy flow for advertised products',
          'Visible business contact information and about details',
        ],
      },
      {
        type: 'heading',
        level: 3,
        text: 'Product data and pricing consistency',
      },
      {
        type: 'paragraph',
        text: 'JSON-LD or microdata prices should match visible prices on the page. Multi-currency stores and automatic discounts need extra validation before feed submission.',
      },
      {
        type: 'callout',
        title: 'Map requirements to audit rules',
        text: 'AuditPilot GMC mode evaluates G001–G010 readiness rules plus bundled trust, policy, technical, and ads signals in one scan.',
      },
      {
        type: 'heading',
        level: 2,
        text: 'Next steps',
      },
      {
        type: 'paragraph',
        text: 'Scan your store with the free GMC audit to see which requirements pass or fail in your current setup, then prioritize fixes by severity in your readiness report.',
      },
    ],
    faq: {
      title: 'GMC requirements FAQ',
      items: [
        {
          q: 'Do I need every policy before applying to Merchant Center?',
          a: 'Yes for the regions you sell into. Missing return or shipping policies are among the most common first-time rejection reasons.',
        },
        {
          q: 'Does Shopify or WooCommerce satisfy requirements automatically?',
          a: 'Platforms provide templates, but you must publish, link, and maintain policies on your live domain. Platform defaults alone are not enough.',
        },
        {
          q: 'How does AuditPilot map to Google requirements?',
          a: 'Our GMC audit checks crawlable policy pages, product schema, pricing consistency, and purchase flow signals aligned with common Merchant Center disapproval causes.',
        },
      ],
    },
  },
}

/** Blog placeholder — programmatic SEO expansion point (same document shape as guides) */
export const SEO_BLOG_POSTS = {}

/**
 * Central SEO content registry — file-based CMS without a database.
 * Add guides to SEO_GUIDE_PAGES or posts to SEO_BLOG_POSTS.
 */
export const SEO_CONTENT_REGISTRY = {
  guide: SEO_GUIDE_PAGES,
  blog: SEO_BLOG_POSTS,
  landing: SEO_LANDING_PAGES,
}

export const SEO_BLOG_INDEX = {
  slug: 'blog',
  path: '/blog',
  pageType: 'blog-index',
  title: 'AuditPilot Blog — Ecommerce Audit Insights',
  description:
    'Guides and updates on Google Merchant Center compliance, SEO health, and ecommerce audit best practices.',
  metaDescription:
    'Guides and updates on Google Merchant Center compliance, SEO health, and ecommerce audit best practices.',
  h1: 'AuditPilot Blog',
  intro:
    'Articles on GMC compliance, SEO growth, and storefront audit best practices. New posts coming soon.',
}

export function slugifyHeading(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function getHeadingAnchorId(text, preferredId, usedIds = new Set()) {
  const base = preferredId || slugifyHeading(text) || 'section'
  let id = base
  let suffix = 2
  while (usedIds.has(id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  usedIds.add(id)
  return id
}

/** Build table of contents entries from h2/h3 content blocks */
export function buildTableOfContents(contentBlocks = []) {
  const usedIds = new Set()
  const items = []

  for (const block of contentBlocks) {
    if (block.type !== 'heading') continue
    const level = block.level || 2
    if (level < 2 || level > 3) continue

    items.push({
      id: getHeadingAnchorId(block.text, block.id, usedIds),
      text: block.text,
      level,
    })
  }

  return items
}

/** Normalize legacy metaDescription + defaults for article documents */
export function normalizeContentDocument(page) {
  if (!page) return null

  return {
    ...page,
    description: page.description || page.metaDescription || '',
    metaDescription: page.metaDescription || page.description || '',
    categories: resolveGuideCategories(page),
    contentBlocks: page.contentBlocks || [],
    faq: page.faq || null,
    relatedTools: page.relatedTools || [],
    relatedGuides: page.relatedGuides || [],
    keywords: page.keywords || [],
    auditCta: page.auditCta || null,
  }
}

export function prepareGuideDocument(page) {
  const normalized = normalizeContentDocument(page)
  if (!normalized) return null

  return {
    ...normalized,
    breadcrumbs: getGuideBreadcrumbs(normalized),
  }
}

export function prepareBlogDocument(page) {
  const normalized = normalizeContentDocument(page)
  if (!normalized) return null

  return {
    ...normalized,
    breadcrumbs: getBlogPostBreadcrumbs(normalized),
  }
}

export function getRegistryContent(pageType, slug) {
  const registry = SEO_CONTENT_REGISTRY[pageType]
  if (!registry || !slug) return null
  return registry[slug] || null
}

export function listRegistryContent(pageType) {
  const registry = SEO_CONTENT_REGISTRY[pageType]
  if (!registry) return []
  return Object.values(registry).map((doc) => normalizeContentDocument(doc))
}

export function formatSeoTitle(title) {
  if (!title) return SEO_SITE.defaultTitle
  if (title.includes(SEO_SITE.name)) return title
  return `${title}${SEO_SITE.titleSuffix}`
}

export function getSeoLandingPage(slug) {
  return SEO_LANDING_PAGES[slug] || null
}

export function getSeoGuidePage(slug) {
  const page = SEO_GUIDE_PAGES[slug]
  return prepareGuideDocument(page)
}

export function getSeoBlogPost(slug) {
  const page = SEO_BLOG_POSTS[slug]
  return prepareBlogDocument(page)
}

export function resolveRelatedTools(ids = []) {
  return ids.map((id) => SEO_TOOL_LINKS[id]).filter(Boolean)
}

export function resolveRelatedGuides(ids = []) {
  return ids.map((id) => SEO_GUIDE_LINKS[id]).filter(Boolean)
}

export function getAllGuidePages() {
  return Object.values(SEO_GUIDE_PAGES).map((guide) => normalizeContentDocument(guide))
}

export function getGuidesGroupedByCategory() {
  return SEO_CONTENT_CATEGORY_IDS.reduce((groups, categoryId) => {
    const guides = Object.values(SEO_GUIDE_PAGES).filter((guide) =>
      resolveGuideCategories(guide).includes(categoryId),
    )
    if (guides.length > 0) groups[categoryId] = guides
    return groups
  }, {})
}

export function getAuditPathForMode(mode) {
  if (mode === 'seo') return '/audit/seo'
  return '/audit/gmc'
}

export function getLandingBreadcrumbs(page) {
  return [
    { label: 'Home', path: '/' },
    { label: 'Audit Tools', path: '/#choose-audit' },
    { label: page.h1, path: page.path },
  ]
}

export function getBlogPostBreadcrumbs(page) {
  return [
    { label: 'Home', path: '/' },
    { label: 'Blog', path: SEO_BLOG_INDEX.path },
    { label: page.h1, path: page.path },
  ]
}

export function getGuideBreadcrumbs(page) {
  return [
    { label: 'Home', path: '/' },
    { label: 'GMC Guides', path: '/guides/google-merchant-center-requirements' },
    { label: page.h1, path: page.path },
  ]
}

/** Routes included in sitemap.xml — excludes transactional /report and /scan */
export function getIndexableRoutes() {
  const landingRoutes = Object.values(SEO_LANDING_PAGES).map((page) => ({
    path: page.path,
    priority: '0.8',
    changefreq: 'monthly',
  }))
  const guideRoutes = Object.values(SEO_GUIDE_PAGES).map((page) => ({
    path: page.path,
    priority: '0.7',
    changefreq: 'monthly',
  }))
  const blogRoutes = Object.values(SEO_BLOG_POSTS).map((page) => ({
    path: page.path,
    priority: '0.65',
    changefreq: 'monthly',
  }))

  return [
    { path: '/', priority: '1.0', changefreq: 'weekly' },
    { path: SEO_AUDIT_TOOL_PAGES.gmc.path, priority: '0.9', changefreq: 'monthly' },
    { path: SEO_AUDIT_TOOL_PAGES.seo.path, priority: '0.9', changefreq: 'monthly' },
    ...landingRoutes,
    { path: SEO_BLOG_INDEX.path, priority: '0.6', changefreq: 'weekly' },
    ...blogRoutes,
    ...guideRoutes,
  ]
}

/** Routes prerendered to static HTML at build time (excludes /scan, /report) */
export function getPrerenderRoutes() {
  return getIndexableRoutes()
}
