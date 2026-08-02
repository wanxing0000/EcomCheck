import { scoreAudit, scoreCategory } from './scorer.js'
import { scoreModuleResults } from '../modules/_shared/scorer.js'

const COMPLIANCE_CATEGORIES = ['gmc', 'ads', 'technical', 'trust', 'policy']

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
  seo: 'SEO',
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
  G008: {
    whyItMatters: 'Customers and Google need to know which payment methods you accept before purchase.',
    impact: 'Missing payment information reduces trust and may fail GMC website requirement checks.',
    fixSuggestion: 'Publish payment methods and billing terms on a payment policy or terms of sale page.',
  },
  G009: {
    whyItMatters: 'Product pages must allow customers to add items to cart or buy directly.',
    impact: 'Missing purchase buttons can trigger misrepresentation concerns in Google Shopping.',
    fixSuggestion: 'Ensure every product detail page has a working Add to Cart or Buy Now button.',
  },
  G010: {
    whyItMatters: 'Shipping policy quality affects buyer expectations and GMC shipping program compliance.',
    impact: 'Vague shipping policies increase disputes and may hurt Merchant Center approval.',
    fixSuggestion: 'Include delivery timeframes, regions served, and shipping costs in your shipping policy.',
  },
  S001: {
    whyItMatters: 'The title tag is the primary headline shown in search engine results.',
    impact: 'Missing or poorly sized titles reduce click-through rates from organic search.',
    fixSuggestion: 'Set a unique homepage title between 30 and 60 characters with brand and key terms.',
  },
  S002: {
    whyItMatters: 'Meta descriptions influence search snippet text and user click decisions.',
    impact: 'Weak descriptions hurt organic CTR and make listings look incomplete.',
    fixSuggestion: 'Write a compelling meta description between 120 and 160 characters.',
  },
  S003: {
    whyItMatters: 'A single H1 clarifies the main topic of the page for search engines.',
    impact: 'Missing or multiple H1 tags weaken page hierarchy and keyword focus.',
    fixSuggestion: 'Use exactly one H1 on the homepage and structure subsections with H2/H3.',
  },
  S004: {
    whyItMatters: 'Canonical URLs tell search engines which URL is the preferred version of a page.',
    impact: 'Missing or relative canonicals can cause duplicate content indexing issues.',
    fixSuggestion: 'Add an absolute canonical link tag pointing to your preferred homepage URL.',
  },
  S005: {
    whyItMatters: 'Open Graph tags control how your store appears when shared on social platforms.',
    impact: 'Missing OG tags produce plain link previews and lower social engagement.',
    fixSuggestion: 'Add og:title, og:description, and og:image meta tags to your homepage.',
  },
  S006: {
    whyItMatters: 'Organization schema helps search engines understand your brand entity.',
    impact: 'Missing organization markup reduces eligibility for brand-rich search features.',
    fixSuggestion: 'Add Organization or LocalBusiness JSON-LD with name, logo, and contact info.',
  },
  S007: {
    whyItMatters: 'Product schema enables rich product results and better organic product visibility.',
    impact: 'E-commerce sites without Product JSON-LD miss rich snippets and product discovery signals.',
    fixSuggestion: 'Implement Product JSON-LD on product detail pages with required offer fields.',
  },
  S008: {
    whyItMatters: 'robots.txt and sitemap.xml guide search engine crawling and indexing.',
    impact: 'Missing files or blocking all crawlers can prevent products from appearing in search.',
    fixSuggestion: 'Publish robots.txt, avoid Disallow: /, and submit an XML sitemap in Search Console.',
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
  const complianceScore = scores.compliance ?? scores.overall
  const { overall, gmc, highRisk, gmcHighRisk } = issueCounts

  if (overall === 0) {
    return 'Your store passed all compliance checks. You are in strong shape for Google Merchant Center and advertising.'
  }

  if (complianceScore >= 85 && gmcHighRisk === 0) {
    return `Your store is generally healthy.${gmc > 0 ? ` ${gmc} GMC advisory item(s) could still be improved.` : ''}`
  }

  if (complianceScore >= 70) {
    return `Your store is generally healthy.${gmcHighRisk > 0 ? ` ${gmcHighRisk} issue(s) may affect Google Merchant Center approval.` : ` ${overall} item(s) should be addressed to improve compliance.`}`
  }

  if (highRisk > 0) {
    return `${highRisk} high-risk issue(s) need attention before scaling ads or Google Shopping.${gmcHighRisk > 0 ? ` ${gmcHighRisk} directly affect GMC approval.` : ''}`
  }

  return `${overall} compliance item(s) were found. Address them to improve trust, ads performance, and marketplace readiness.`
}

function buildSeoSummary(seoScore, seoIssueCount) {
  if (seoScore == null) return null
  if (seoIssueCount === 0) {
    return `SEO score is ${seoScore}/100 with no open SEO issues.`
  }
  return `SEO score is ${seoScore}/100 with ${seoIssueCount} SEO item(s) to review separately from compliance.`
}

function getCoverageLabel(score) {
  if (score == null) return null
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Needs Improvement'
  return 'Critical'
}

function buildModuleCoverage(scoreMap) {
  /** @type {Record<string, { score: number, label: string }>} */
  const coverage = {}

  for (const [key, score] of Object.entries(scoreMap)) {
    if (score == null) continue
    coverage[key] = {
      score,
      label: getCoverageLabel(score),
    }
  }

  return coverage
}

/** @deprecated Use split coverage.compliance / coverage.seo — kept for legacy readers */
function buildCoverage(scores) {
  return buildModuleCoverage(
    Object.fromEntries(
      Object.entries(scores).filter(([key, value]) => key !== 'overall' && key !== 'compliance' && value != null)
    )
  )
}

function buildSplitCoverage(scores) {
  return {
    compliance: buildModuleCoverage({
      gmc: scores.gmc,
      ads: scores.ads,
      technical: scores.technical,
      trust: scores.trust,
      policy: scores.policy,
    }),
    seo: buildModuleCoverage({
      seo: scores.seo,
    }),
  }
}

function buildHealthStatus(scores, issueCounts) {
  const complianceScore = scores.compliance ?? scores.overall
  if (issueCounts.complianceTotal === 0) return 'healthy'
  if (issueCounts.highRisk > 0 || complianceScore < 50) return 'critical'
  if (complianceScore >= 85 && issueCounts.highRisk === 0) return 'healthy'
  return 'needs_attention'
}

function buildExecutiveHeadline(healthStatus, issueCounts) {
  const complianceTotal = issueCounts.complianceTotal ?? issueCounts.overall ?? issueCounts.total

  if (healthStatus === 'healthy' && complianceTotal === 0) {
    return 'Your store is in excellent shape for Google Shopping and advertising.'
  }

  if (healthStatus === 'healthy') {
    return 'Your store is generally healthy, with a few optional improvements available.'
  }

  if (healthStatus === 'critical') {
    return 'Your store has critical compliance gaps that should be fixed before scaling ads or Google Shopping.'
  }

  return 'Your store is generally healthy, but several trust and advertising signals can be improved.'
}

function buildTopPriorities(allIssues, limit = 5) {
  const severityOrder = { high: 0, medium: 1, low: 2, warning: 3 }

  return [...allIssues]
    .sort((a, b) => (severityOrder[a.severity] ?? 9) - (severityOrder[b.severity] ?? 9))
    .slice(0, limit)
    .map((issue, index) => ({
      priority: index + 1,
      title: issue.title,
      category: issue.categoryLabel || issue.category,
      impact: issue.impact,
      action: issue.fixSuggestion,
    }))
}

function buildImprovementRoadmap(allIssues) {
  const toItem = (issue) => ({
    title: issue.title,
    category: issue.categoryLabel || issue.category,
    reason: issue.message,
    expectedImpact: issue.impact,
  })

  return {
    immediate: allIssues.filter((issue) => issue.severity === 'high').map(toItem),
    recommended: allIssues.filter((issue) => issue.severity === 'medium').map(toItem),
    future: allIssues
      .filter((issue) => issue.severity === 'low' || issue.severity === 'warning')
      .map(toItem),
  }
}

function buildExecutiveSummary(scores, issueCounts, allIssues, quickSummary) {
  const healthStatus = buildHealthStatus(scores, issueCounts)
  const complianceIssues = allIssues.filter((issue) => issue.category !== 'seo')
  const seoIssues = allIssues.filter((issue) => issue.category === 'seo')

  return {
    headline: buildExecutiveHeadline(healthStatus, issueCounts),
    healthStatus,
    summary: quickSummary,
    complianceScore: scores.compliance ?? scores.overall,
    seoScore: scores.seo ?? null,
    seoSummary: buildSeoSummary(scores.seo, seoIssues.length),
    topPriorities: buildTopPriorities(complianceIssues),
    seoPriorities: buildTopPriorities(seoIssues, 3),
  }
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
  const trustResult = scoreCategory(ruleResults, 'trust')
  const policyResult = scoreCategory(ruleResults, 'policy')
  const seoResult = scoreCategory(ruleResults, 'seo')

  const complianceRules = ruleResults.filter((rule) => COMPLIANCE_CATEGORIES.includes(rule.category))
  const complianceResult = scoreModuleResults(complianceRules)

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
    seo: allIssues.filter((i) => i.category === 'seo'),
  }

  const gmcHighRisk = issuesByCategory.gmc.filter((i) => i.severity === 'high').length
  const complianceIssues = allIssues.filter((issue) => issue.category !== 'seo')

  const scores = {
    overall: overallResult.score,
    compliance: complianceResult.score,
    gmc: gmcResult.score,
    ads: adsResult.score,
    technical: technicalResult.score,
    trust: trustResult.score,
    policy: policyResult.score,
    seo: seoResult.score,
  }

  const issueCounts = {
    total: allIssues.length,
    complianceTotal: complianceIssues.length,
    seoTotal: issuesByCategory.seo.length,
    highRisk: complianceIssues.filter((i) => i.severity === 'high').length,
    attention: complianceIssues.filter((i) => i.severity === 'medium').length,
    recommendation: complianceIssues.filter(
      (i) => i.severity === 'low' || i.severity === 'warning'
    ).length,
    byCategory: Object.fromEntries(
      Object.entries(issuesByCategory).map(([key, items]) => [key, items.length])
    ),
    overall: complianceIssues.length,
    gmc: issuesByCategory.gmc.length,
    gmcHighRisk,
    seo: issuesByCategory.seo.length,
  }

  const quickSummary = buildQuickSummary(scores, issueCounts)

  return {
    quickSummary,
    executiveSummary: buildExecutiveSummary(scores, issueCounts, allIssues, quickSummary),
    improvementRoadmap: buildImprovementRoadmap(complianceIssues),
    coverage: buildSplitCoverage(scores),
    scores,
    issueCounts: {
      total: issueCounts.total,
      complianceTotal: issueCounts.complianceTotal,
      seoTotal: issueCounts.seoTotal,
      highRisk: issueCounts.highRisk,
      attention: issueCounts.attention,
      recommendation: issueCounts.recommendation,
      byCategory: issueCounts.byCategory,
    },
    issues: allIssues,
    issuesByCategory,
  }
}

export { SEVERITY_LABELS, CATEGORY_LABELS, RULE_GUIDANCE }
