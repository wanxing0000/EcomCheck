import { scoreAudit, scoreCategory } from './scorer.js'

const SEVERITY_LABELS = {
  high: 'High Risk',
  medium: 'Attention',
  low: 'Recommendation',
  warning: 'Advisory',
}

const CATEGORY_LABELS = {
  trust: 'Trust',
  policy: 'Policy',
  technical: 'Technical',
  ads: 'Ads',
  gmc: 'GMC',
}

const RULE_GUIDANCE = {
  T001: {
    whyItMatters: 'Customers and ad platforms need a way to reach your business for support and verification.',
    impact: 'Missing contact details reduce buyer trust and can block Meta Ads or marketplace verification.',
    fixSuggestion: 'Add email, phone, or business address to your footer, contact page, or about page.',
  },
  T002: {
    whyItMatters: 'An About page helps shoppers understand who they are buying from.',
    impact: 'Weak trust signals can lower conversion rates and ad account approval success.',
    fixSuggestion: 'Create an About Us page with your brand story, mission, and team or company background.',
  },
  P001: {
    whyItMatters: 'Privacy policies are legally required in many regions and expected by payment providers.',
    impact: 'Missing privacy policy may violate GDPR/CCPA expectations and reduce platform trust.',
    fixSuggestion: 'Publish a privacy policy page and link it in your website footer.',
  },
  P002: {
    whyItMatters: 'Clear refund terms set buyer expectations and reduce chargebacks.',
    impact: 'Missing refund policy increases dispute risk and may fail marketplace compliance checks.',
    fixSuggestion: 'Create a refund or returns policy page covering timelines, conditions, and how to request a refund.',
  },
  P003: {
    whyItMatters: 'Shipping information helps customers understand delivery times and costs before purchase.',
    impact: 'Missing shipping policy can increase cart abandonment and customer service inquiries.',
    fixSuggestion: 'Add a shipping policy page covering regions, costs, carriers, and delivery timelines.',
  },
  K001: {
    whyItMatters: 'HTTPS encrypts customer data and is required for secure checkout and modern browsers.',
    impact: 'Non-HTTPS sites trigger browser warnings and hurt SEO and conversion rates.',
    fixSuggestion: 'Install an SSL certificate and redirect all HTTP traffic to HTTPS.',
  },
  K002: {
    whyItMatters: 'robots.txt tells search engines which pages they may crawl.',
    impact: 'Misconfigured or missing robots.txt can hide products from search or expose admin pages.',
    fixSuggestion: 'Add a robots.txt file at your domain root with appropriate allow/disallow rules.',
  },
  K003: {
    whyItMatters: 'A sitemap helps search engines discover product and policy pages faster.',
    impact: 'Missing sitemap can slow indexing of new products and category pages.',
    fixSuggestion: 'Generate sitemap.xml and submit it via Google Search Console.',
  },
  K004: {
    whyItMatters: 'Title and meta description affect click-through rates from search and social previews.',
    impact: 'Poor meta tags reduce organic traffic and make ads look unprofessional when shared.',
    fixSuggestion: 'Add unique page titles and meta descriptions to your homepage and key landing pages.',
  },
  A001: {
    whyItMatters: 'Meta Pixel tracks conversions and enables retargeting on Facebook and Instagram.',
    impact: 'Without pixel data, Meta Ads optimization and conversion reporting will be limited.',
    fixSuggestion: 'Install Meta Pixel via your theme, GTM, or Shopify/WooCommerce integration.',
  },
  A002: {
    whyItMatters: 'Google Tag enables conversion tracking for Google Ads and Analytics.',
    impact: 'Missing tags reduce campaign optimization and make ROAS harder to measure.',
    fixSuggestion: 'Install Google Tag Manager or gtag.js with your Google Ads / GA4 measurement ID.',
  },
  A003: {
    whyItMatters: 'Product JSON-LD helps Google understand your products for Shopping and rich results.',
    impact: 'Missing product schema limits dynamic remarketing and organic product visibility.',
    fixSuggestion: 'Add valid Product schema with name, image, price, and availability on product pages.',
  },
  G001: {
    whyItMatters: 'Google Merchant Center requires product price in structured data for Shopping listings.',
    impact: 'Missing offers.price can cause product disapprovals in Google Shopping.',
    fixSuggestion: 'Add offers.price to Product JSON-LD on every product detail page.',
  },
  G002: {
    whyItMatters: 'GMC requires availability status so Google knows if items are in stock.',
    impact: 'Missing availability may lead to listing suspensions or poor ad performance.',
    fixSuggestion: 'Include offers.availability (e.g. InStock) in your Product JSON-LD.',
  },
  G003: {
    whyItMatters: 'Google Merchant Center requires clear return and refund information.',
    impact: 'May cause Merchant Center suspension, disapproved listings, or reduced buyer trust.',
    fixSuggestion: 'Create a Refund & Returns Policy page and link it in your footer.',
  },
  G004: {
    whyItMatters: 'GMC expects a shipping policy so customers know delivery terms before buying.',
    impact: 'Missing shipping policy can block Google Shopping approval in some regions.',
    fixSuggestion: 'Publish a shipping policy covering delivery areas, costs, and timeframes.',
  },
  G005: {
    whyItMatters: 'Product identifiers (brand, GTIN, MPN) improve Google Shopping match quality.',
    impact: 'Missing identifiers may reduce ad visibility but usually will not block basic listings.',
    fixSuggestion: 'Add brand, SKU, GTIN, or MPN fields to your Product JSON-LD where available.',
  },
  G006: {
    whyItMatters: 'Price shown to customers must match the price sent to Google Merchant Center.',
    impact: 'Price mismatches are a common cause of GMC disapprovals and account warnings.',
    fixSuggestion: 'Ensure Product JSON-LD offers.price matches the visible price on each product page.',
  },
  G007: {
    whyItMatters: 'GMC uses business contact details to verify seller legitimacy.',
    impact: 'Incomplete business information may delay Merchant Center verification.',
    fixSuggestion: 'Display business email, phone, and address on your website footer or contact page.',
  },
}

function enrichIssue(rule) {
  const guidance = RULE_GUIDANCE[rule.id] || {}
  const severity = rule.severity || 'medium'

  return {
    id: rule.id,
    severity,
    severityLabel: SEVERITY_LABELS[severity] || severity,
    category: rule.category,
    categoryLabel: CATEGORY_LABELS[rule.category] || rule.category,
    title: rule.name,
    message: rule.message,
    whyItMatters: guidance.whyItMatters || rule.description || '',
    impact: guidance.impact || 'May affect compliance readiness for advertising and marketplaces.',
    fixSuggestion: rule.recommendation || guidance.fixSuggestion || '',
  }
}

function buildQuickSummary(scores, issueCounts) {
  const { overall, gmc, highRisk, gmcHighRisk } = issueCounts

  if (overall === 0) {
    return 'Your store passed all compliance checks. You are in strong shape for Google Merchant Center and advertising.'
  }

  if (scores.overall >= 85 && gmcHighRisk === 0) {
    return `Your store is generally healthy.${gmc > 0 ? ` ${gmc} GMC advisory item(s) could still be improved.` : ''}`
  }

  if (scores.overall >= 70) {
    return `Your store is generally healthy.${gmcHighRisk > 0 ? ` ${gmcHighRisk} issue(s) may affect Google Merchant Center approval.` : ` ${overall} item(s) should be addressed to improve compliance.`}`
  }

  if (highRisk > 0) {
    return `${highRisk} high-risk issue(s) need attention before scaling ads or Google Shopping.${gmcHighRisk > 0 ? ` ${gmcHighRisk} directly affect GMC approval.` : ''}`
  }

  return `${overall} compliance item(s) were found. Address them to improve trust, ads performance, and marketplace readiness.`
}

/**
 * Build seller-facing professional audit report from rule results.
 * Does not change rule pass/fail outcomes — presentation layer only.
 * @param {import('../rules/types.js').RuleResult[]} ruleResults
 * @param {Array} [extraWarnings]
 */
export function buildProfessionalReport(ruleResults, extraWarnings = []) {
  const overallResult = scoreAudit(ruleResults)
  const gmcResult = scoreCategory(ruleResults, 'gmc')
  const adsResult = scoreCategory(ruleResults, 'ads')
  const technicalResult = scoreCategory(ruleResults, 'technical')

  const failedRules = ruleResults.filter((rule) => !rule.passed)
  const warningRules = failedRules.filter((rule) => rule.severity === 'warning')

  const warningIssues = [
    ...warningRules.map(enrichIssue),
    ...extraWarnings.map((warn) =>
      enrichIssue({
        id: warn.id,
        name: warn.name,
        category: warn.category || 'gmc',
        severity: 'warning',
        message: warn.message,
        recommendation: RULE_GUIDANCE[warn.id]?.fixSuggestion || '',
        description: '',
      })
    ),
  ]

  const issueItems = failedRules
    .filter((rule) => rule.severity !== 'warning')
    .map(enrichIssue)

  const allIssues = [...issueItems, ...warningIssues]

  const issuesByCategory = {
    trust: allIssues.filter((i) => i.category === 'trust'),
    policy: allIssues.filter((i) => i.category === 'policy'),
    technical: allIssues.filter((i) => i.category === 'technical'),
    ads: allIssues.filter((i) => i.category === 'ads'),
    gmc: allIssues.filter((i) => i.category === 'gmc'),
  }

  const gmcHighRisk = issuesByCategory.gmc.filter((i) => i.severity === 'high').length

  return {
    quickSummary: buildQuickSummary(
      {
        overall: overallResult.score,
        gmc: gmcResult.score,
        ads: adsResult.score,
        technical: technicalResult.score,
      },
      {
        overall: allIssues.length,
        gmc: issuesByCategory.gmc.length,
        highRisk: allIssues.filter((i) => i.severity === 'high').length,
        gmcHighRisk,
      }
    ),
    scores: {
      overall: overallResult.score,
      gmc: gmcResult.score,
      ads: adsResult.score,
      technical: technicalResult.score,
    },
    issueCounts: {
      total: allIssues.length,
      highRisk: allIssues.filter((i) => i.severity === 'high').length,
      attention: allIssues.filter((i) => i.severity === 'medium').length,
      recommendation: allIssues.filter((i) => i.severity === 'low' || i.severity === 'warning').length,
      byCategory: Object.fromEntries(
        Object.entries(issuesByCategory).map(([key, items]) => [key, items.length])
      ),
    },
    issues: allIssues,
    issuesByCategory,
  }
}

export { SEVERITY_LABELS, CATEGORY_LABELS, RULE_GUIDANCE }
