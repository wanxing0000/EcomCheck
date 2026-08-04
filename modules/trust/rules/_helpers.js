import * as cheerio from 'cheerio'
import { extractJsonLdBlocks, collectOrganizations } from '../../../services/structuredData.js'
import { getBodyTextFromHtml } from '../../../services/pageContent.js'

const STRONG_ADDRESS_LABEL_PATTERN =
  /\b(?:mailing\s+address|postal\s+address|registered\s+(?:office|address)|business\s+address|office\s+address|headquarters|company\s+location)\b/i

const ADDRESS_LABEL_WITH_COLON_PATTERN =
  /\b(?:mailing\s+address|postal\s+address|registered\s+(?:office|address)|business\s+address|office\s+address|headquarters|company\s+location|location|address)\s*:/i

const UK_POSTCODE_PATTERN = /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/i
const US_ZIP_PATTERN = /\b\d{5}(?:-\d{4})?\b/
const CA_POSTAL_PATTERN = /\b[A-Z]\d[A-Z]\s*\d[A-Z]\d\b/i
const STREET_NUMBER_PATTERN = /\b\d{1,5}\s+[A-Za-z0-9][\w\s,.-]{2,60}\b/
const STREET_SUFFIX_PATTERN =
  /\b(?:street|st|road|rd|avenue|ave|lane|ln|drive|dr|way|boulevard|blvd|court|ct|place|pl|crescent|close|terrace|park)\b/i
const COUNTRY_PATTERN =
  /\b(?:United Kingdom|UK|United States(?: of America)?|USA|U\.S\.A\.|Canada|Australia|Germany|France|Netherlands|Ireland|New Zealand|Singapore|Hong Kong|Japan|China|India|Spain|Italy|Mexico|Brazil|Belgium|Sweden|Norway|Denmark|Finland|Austria|Switzerland|Poland|Portugal|South Africa|United Arab Emirates|UAE)\b/i
const STATE_PROVINCE_PATTERN =
  /\b(?:Alabama|Alaska|Arizona|Arkansas|California|Colorado|Connecticut|Delaware|Florida|Georgia|Hawaii|Idaho|Illinois|Indiana|Iowa|Kansas|Kentucky|Louisiana|Maine|Maryland|Massachusetts|Michigan|Minnesota|Mississippi|Missouri|Montana|Nebraska|Nevada|New Hampshire|New Jersey|New Mexico|New York|North Carolina|North Dakota|Ohio|Oklahoma|Oregon|Pennsylvania|Rhode Island|South Carolina|South Dakota|Tennessee|Texas|Utah|Vermont|Virginia|Washington|West Virginia|Wisconsin|Wyoming|Ontario|Quebec|British Columbia|Alberta|Manitoba|Saskatchewan|Nova Scotia|New Brunswick|Newfoundland|Prince Edward Island|Northwest Territories|Yukon|Nunavut|England|Scotland|Wales|Northern Ireland)\b/i

const KEY_PAGE_SCAN_SOURCES = [
  { pageKey: 'homepage', label: 'homepage' },
  { pageKey: 'contactUs', label: 'contact page' },
  { pageKey: 'aboutUs', label: 'about page' },
  { pageKey: 'privacyPolicy', label: 'privacy policy' },
  { pageKey: 'refundPolicy', label: 'terms page' },
  { pageKey: 'shippingPolicy', label: 'terms page' },
  { pageKey: 'paymentPolicy', label: 'terms page' },
]

const FOOTER_SELECTORS =
  'footer, [role="contentinfo"], .site-footer, #footer, .footer, .wd-footer'

function normalizeScanText(text) {
  return String(text || '')
    .replace(/\r\n/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim()
}

function truncateMatchedText(text, maxLength = 240) {
  const normalized = normalizeScanText(text)
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 3)}...`
}

function scoreAddressBlock(text) {
  let score = 0
  if (STREET_NUMBER_PATTERN.test(text)) score += 1
  if (STREET_SUFFIX_PATTERN.test(text)) score += 2
  if (UK_POSTCODE_PATTERN.test(text)) score += 3
  if (US_ZIP_PATTERN.test(text)) score += 2
  if (CA_POSTAL_PATTERN.test(text)) score += 2
  if (COUNTRY_PATTERN.test(text)) score += 2
  if (STATE_PROVINCE_PATTERN.test(text)) score += 1
  if (ADDRESS_LABEL_WITH_COLON_PATTERN.test(text)) score += 1
  return score
}

function extractLabeledAddressBlock(text, matchIndex) {
  const slice = text.slice(matchIndex, matchIndex + 500)
  const lines = slice.split(/\n+/).slice(0, 8)
  return normalizeScanText(lines.join('\n'))
}

function findAddressEvidenceInText(text, sourceLabel) {
  const normalized = normalizeScanText(text)
  if (!normalized) return null

  const labelRegex =
    /\b(?:mailing\s+address|postal\s+address|registered\s+(?:office|address)|business\s+address|office\s+address|headquarters|company\s+location|location|address)\b/gi

  for (const match of normalized.matchAll(labelRegex)) {
    const label = match[0]
    const block = extractLabeledAddressBlock(normalized, match.index)
    const isStrongLabel = STRONG_ADDRESS_LABEL_PATTERN.test(label)
    const blockScore = scoreAddressBlock(block)

    if (isStrongLabel || blockScore >= 3) {
      return {
        found: true,
        source: sourceLabel,
        matchedText: truncateMatchedText(block),
      }
    }
  }

  if (scoreAddressBlock(normalized) >= 4) {
    const streetMatch = normalized.match(
      new RegExp(
        `${STREET_NUMBER_PATTERN.source}.{0,120}(?:${STREET_SUFFIX_PATTERN.source}|${UK_POSTCODE_PATTERN.source}|${US_ZIP_PATTERN.source}|${COUNTRY_PATTERN.source})`,
        'i'
      )
    )
    if (streetMatch) {
      return {
        found: true,
        source: sourceLabel,
        matchedText: truncateMatchedText(streetMatch[0]),
      }
    }

    const postalMatch =
      normalized.match(
        new RegExp(
          `${STREET_NUMBER_PATTERN.source}[\\s\\S]{0,180}(?:${UK_POSTCODE_PATTERN.source}|${US_ZIP_PATTERN.source}|${CA_POSTAL_PATTERN.source})`,
          'i'
        )
      ) ||
      normalized.match(
        new RegExp(`${UK_POSTCODE_PATTERN.source}[\\s\\S]{0,80}${COUNTRY_PATTERN.source}`, 'i')
      )

    if (postalMatch) {
      return {
        found: true,
        source: sourceLabel,
        matchedText: truncateMatchedText(postalMatch[0]),
      }
    }
  }

  return null
}

function extractFooterText(html) {
  if (!html) return ''
  try {
    const $ = cheerio.load(html)
    const footer = $(FOOTER_SELECTORS).first()
    return normalizeScanText(footer.text())
  } catch {
    return ''
  }
}

function textKeywordFlags(text) {
  const lower = String(text || '').toLowerCase()
  return {
    mailing: lower.includes('mailing'),
    address: lower.includes('address'),
    street: lower.includes('street'),
    postal: lower.includes('postal'),
  }
}

function collectAddressScanSources(auditData) {
  const sources = []

  if (auditData.html) {
    sources.push({ label: 'homepage (html fallback)', text: getBodyTextFromHtml(auditData.html) })
    const footerText = extractFooterText(auditData.html)
    if (footerText) {
      sources.push({ label: 'footer (html fallback)', text: footerText })
    }
  }

  for (const { pageKey, label } of KEY_PAGE_SCAN_SOURCES) {
    const content = auditData.pageContent?.[pageKey]
    if (content?.bodyText) {
      sources.push({ label, text: content.bodyText })
    }
    if (content?.footerText) {
      sources.push({ label: `${label} footer`, text: content.footerText })
    }
  }

  for (const item of auditData.contactInfo?.sources || []) {
    if (item.type !== 'address' || !item.value) continue
    sources.push({
      label: item.page ? `${item.page} contact info` : 'contact info',
      text: String(item.value),
    })
  }

  return sources
}

export function buildAddressDetectionDebug(auditData, addressDetection = null) {
  const detection = addressDetection || detectBusinessAddress(auditData)
  const pagesMeta = auditData.pages || {}
  const pageContent = auditData.pageContent || {}
  const scanKeys = [
    'homepage',
    'contactUs',
    'aboutUs',
    'privacyPolicy',
    'refundPolicy',
    'shippingPolicy',
    'paymentPolicy',
  ]

  const scannedPages = scanKeys.map((pageKey) => {
    const meta = pagesMeta[pageKey]
    const content = pageContent[pageKey]
    const bodyText = content?.bodyText || ''
    const footerText = content?.footerText || ''

    return {
      pageKey,
      found: pageKey === 'homepage' ? Boolean(content?.fetched ?? bodyText.length > 0) : Boolean(meta?.found),
      url: content?.url || meta?.url || (pageKey === 'homepage' ? auditData.url || null : null),
      fetched: content?.fetched ?? false,
      bodyTextLength: bodyText.length,
      footerTextLength: footerText.length,
      bodyKeywords: textKeywordFlags(bodyText),
      footerKeywords: textKeywordFlags(footerText),
    }
  })

  const detectorInputs = collectAddressScanSources(auditData).map((source) => ({
    source: source.label,
    textLength: source.text.length,
    keywords: textKeywordFlags(source.text),
  }))

  const combinedText = collectAddressScanSources(auditData)
    .map((source) => source.text)
    .join('\n')

  const debug = {
    dataSources: {
      auditDataHtml: Boolean(auditData.html),
      auditDataPages: Boolean(auditData.pages),
      auditDataPageContent: Boolean(auditData.pageContent),
      auditDataContactInfo: Boolean(auditData.contactInfo),
      contactInfoAddressCount: auditData.contactInfo?.addresses?.length ?? 0,
      note:
        'M001 reads auditData.pageContent (bodyText/footerText), auditData.contactInfo, and auditData.html. Crawler does not pass html to rules — only pageContent + contactInfo.',
    },
    pages: scannedPages,
    detectorInputs,
    addressDetected: detection.hasAddress,
  }

  if (!detection.hasAddress) {
    debug.addressDetected = false
    debug.searchedPages = detectorInputs
      .filter((input) => input.textLength > 0)
      .map((input) => input.source)
    debug.textSample = combinedText.slice(0, 500) || '(no text reached address detector)'
  }

  return debug
}

export function detectBusinessAddress(auditData) {
  const existingAddresses = [...(auditData.contactInfo?.addresses || [])]
  const detectedAddresses = [...existingAddresses]
  let addressEvidence = { found: false, source: null, matchedText: null }

  if (existingAddresses.length > 0) {
    const addrSource = auditData.contactInfo?.sources?.find((item) => item.type === 'address')
    addressEvidence = {
      found: true,
      source: addrSource?.page || 'contact info',
      matchedText: truncateMatchedText(existingAddresses[0]),
    }
  }

  for (const { label, text } of collectAddressScanSources(auditData)) {
    const evidence = findAddressEvidenceInText(text, label)
    if (!evidence) continue

    addressEvidence = evidence
    const candidate = evidence.matchedText.split('\n')[0]?.trim()
    if (candidate && candidate.length >= 8 && !detectedAddresses.includes(candidate)) {
      detectedAddresses.push(candidate)
    }
    break
  }

  return {
    addresses: detectedAddresses.slice(0, 5),
    hasAddress: detectedAddresses.length > 0 || addressEvidence.found,
    addressEvidence,
  }
}

const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com',
  'googlemail.com',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'yahoo.com',
  'icloud.com',
  'me.com',
  'proton.me',
  'protonmail.com',
  'aol.com',
  'mail.com',
  'gmx.com',
  'yandex.com',
  'qq.com',
  '163.com',
])

const SPEC_KEYWORD_PATTERNS = [
  /\bmaterial(s)?\b/i,
  /\bfabric\b/i,
  /\bsize(s)?\b/i,
  /\bdimension(s)?\b/i,
  /\bweight\b/i,
  /\bspecification(s)?\b/i,
  /\bcm\b/i,
  /\binch(es)?\b/i,
  /\bml\b/i,
  /\boz\b/i,
]

const MARKETING_HEAVY_PATTERNS = [
  /\bbest ever\b/i,
  /\blimited time\b/i,
  /\bact now\b/i,
  /\b#\d+\s+best seller\b/i,
  /\bfree gift\b/i,
  /\b100%\s+(?:satisfaction|guarantee)\b/i,
]

function normalizeHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

function emailDomain(email) {
  const parts = String(email).toLowerCase().split('@')
  return parts.length === 2 ? parts[1] : null
}

export function isFreeEmail(email) {
  const domain = emailDomain(email)
  return domain ? FREE_EMAIL_DOMAINS.has(domain) : false
}

export function isDomainEmail(email, siteUrl) {
  const domain = emailDomain(email)
  const host = normalizeHost(siteUrl)
  if (!domain || !host) return false
  if (isFreeEmail(email)) return false
  return domain === host || host.endsWith(`.${domain}`) || domain.endsWith(`.${host}`)
}

export function detectCompanyName(auditData) {
  const candidates = []

  const orgBlocks = []
  if (auditData.html) {
    extractJsonLdBlocks(auditData.html).forEach((block) => collectOrganizations(block, orgBlocks))
  }
  for (const org of orgBlocks) {
    if (org.name) candidates.push(String(org.name).trim())
  }

  if (auditData.meta?.title) candidates.push(auditData.meta.title.split('|')[0].trim())
  if (auditData.seo?.structuredData?.organization?.name) {
    candidates.push(auditData.seo.structuredData.organization.name)
  }

  const about = auditData.pageContent?.aboutUs
  if (about?.h1 && about.h1.length >= 3) candidates.push(about.h1.trim())
  if (about?.title && about.title.length >= 3) candidates.push(about.title.trim())

  const unique = [...new Set(candidates.filter((name) => name && name.length >= 2))]
  return unique[0] || null
}

export function analyzeBusinessIdentity(auditData) {
  const { contactInfo } = auditData
  const emails = contactInfo?.emails || []
  const phones = contactInfo?.phones || []
  const addressDetection = detectBusinessAddress(auditData)
  const addresses = addressDetection.addresses
  const addressEvidence = addressDetection.addressEvidence
  const companyName = detectCompanyName(auditData)
  const siteUrl = auditData.url || auditData.crawlResult?.url

  const domainEmails = emails.filter((email) => isDomainEmail(email, siteUrl))
  const freeEmails = emails.filter((email) => isFreeEmail(email))
  const hasPhone = phones.length > 0
  const hasAddress = addressDetection.hasAddress
  const hasCompanyName = Boolean(companyName)
  const hasDomainEmail = domainEmails.length > 0

  const signals = {
    companyName: hasCompanyName,
    address: hasAddress,
    phone: hasPhone,
    domainEmail: hasDomainEmail,
  }

  const presentCount = Object.values(signals).filter(Boolean).length
  const missing = Object.entries(signals)
    .filter(([, ok]) => !ok)
    .map(([key]) => key)

  let riskLevel = 'low'
  if (presentCount <= 1 || (emails.length > 0 && !hasDomainEmail && freeEmails.length === emails.length)) {
    riskLevel = 'high'
  } else if (presentCount <= 2 || !hasDomainEmail) {
    riskLevel = 'medium'
  } else if (presentCount === 4) {
    riskLevel = 'low'
  } else {
    riskLevel = 'medium'
  }

  if (presentCount === 0) {
    riskLevel = 'critical'
  }

  return {
    companyName,
    emails,
    domainEmails,
    freeEmails,
    phones,
    addresses,
    addressEvidence,
    addressDebug: buildAddressDetectionDebug(auditData, addressDetection),
    signals,
    presentCount,
    missing,
    riskLevel,
  }
}

export function resolvePolicyContentFetchStatus(found, content) {
  if (!found) return null
  if (!content || content.fetched === false) return 'failed'
  const textLength = content.textLength ?? 0
  if (textLength === 0) return 'empty'
  return 'success'
}

const POLICY_FETCH_UNAVAILABLE_MESSAGE =
  'Policy page found, but content could not be analyzed because the page content was unavailable to crawler.'

export function buildPolicyQualitySnapshot(auditData) {
  const policies = [
    {
      id: 'refund',
      label: 'Refund Policy',
      pageKey: 'refundPolicy',
      page: auditData.pages?.refundPolicy,
      content: auditData.pageContent?.refundPolicy,
    },
    {
      id: 'shipping',
      label: 'Shipping Policy',
      pageKey: 'shippingPolicy',
      page: auditData.pages?.shippingPolicy,
      content: auditData.pageContent?.shippingPolicy,
    },
    {
      id: 'payment',
      label: 'Payment Policy',
      pageKey: 'paymentPolicy',
      page: auditData.pages?.paymentPolicy,
      content: auditData.pageContent?.paymentPolicy,
    },
  ]

  return policies.map((policy) => {
    const found = Boolean(policy.page?.found && policy.page?.url)
    const contentFetchStatus = resolvePolicyContentFetchStatus(found, policy.content)
    const quality =
      contentFetchStatus === 'success' ? policy.content?.policyQuality || null : null
    const qualityScore =
      contentFetchStatus === 'success' ? (quality?.qualityScore ?? 0) : null

    let missing = []
    let risks = []
    let analysisMessage = null

    if (!found) {
      missing = ['policy page']
      risks = [`No ${policy.label.toLowerCase()} page detected.`]
    } else if (contentFetchStatus === 'failed') {
      analysisMessage = POLICY_FETCH_UNAVAILABLE_MESSAGE
    } else if (contentFetchStatus === 'empty') {
      missing = ['policy content']
      risks = [`${policy.label} page returned no analyzable content.`]
    } else {
      missing = quality?.missing || []
      risks = quality?.risks || []
    }

    return {
      ...policy,
      found,
      fetched: contentFetchStatus === 'success' || contentFetchStatus === 'empty',
      contentFetchStatus,
      qualityScore,
      quality,
      missing,
      risks,
      analysisMessage,
    }
  })
}

export function summarizePolicyQuality(policies) {
  const scorable = policies.filter((policy) => policy.contentFetchStatus === 'success')
  const fetchFailed = policies.filter((policy) => policy.contentFetchStatus === 'failed')
  const empty = policies.filter((policy) => policy.contentFetchStatus === 'empty')
  const missing = policies.filter((policy) => !policy.found)

  if (scorable.length === 0) {
    if (missing.length === policies.length) {
      return {
        averageScore: 0,
        lowestScore: 0,
        policies,
        scorableCount: 0,
        fetchFailedCount: fetchFailed.length,
        riskLevel: 'high',
      }
    }

    if (fetchFailed.length > 0 && missing.length === 0 && empty.length === 0) {
      return {
        averageScore: null,
        lowestScore: null,
        policies,
        scorableCount: 0,
        fetchFailedCount: fetchFailed.length,
        riskLevel: 'low',
        fetchUnavailableOnly: true,
      }
    }

    if (fetchFailed.length > 0 && scorable.length === 0) {
      return {
        averageScore: null,
        lowestScore: null,
        policies,
        scorableCount: 0,
        fetchFailedCount: fetchFailed.length,
        riskLevel: missing.length > 0 ? 'high' : 'low',
      }
    }

    return {
      averageScore: 0,
      lowestScore: 0,
      policies,
      scorableCount: 0,
      fetchFailedCount: fetchFailed.length,
      riskLevel: 'high',
    }
  }

  const scores = scorable.map((policy) => policy.qualityScore ?? 0)
  const averageScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length)
  const lowestScore = Math.min(...scores)

  let riskLevel = 'low'
  if (lowestScore < 40) riskLevel = 'high'
  else if (lowestScore < 70) riskLevel = 'medium'

  return {
    averageScore,
    lowestScore,
    policies,
    scorableCount: scorable.length,
    fetchFailedCount: fetchFailed.length,
    riskLevel,
  }
}

function countImagesFromProduct(product) {
  if (!product?.fields?.image) return 0
  return 1
}

function looksMarketingHeavy(name) {
  if (!name) return false
  if (name.length < 12 && /!/.test(name)) return true
  return MARKETING_HEAVY_PATTERNS.some((pattern) => pattern.test(name))
}

function averageNumbers(values) {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function buildTrustFactor(name, score, detected, missing, recommendation) {
  return {
    name,
    score: Math.max(0, Math.min(100, Math.round(score))),
    detected,
    missing,
    recommendation,
  }
}

function collectSchemaAttributePresence(product) {
  const fields = product?.fields || {}
  return {
    brand: Boolean(fields.brand),
    sku: Boolean(fields.sku),
    gtin: Boolean(fields.gtin),
    mpn: Boolean(fields.mpn),
  }
}

function analyzePageTrustSnapshot(page, pageScore) {
  const products = page.products || []
  const best = products.find((product) => product.valid) || products[0]
  const name = best?.name || page.productName || ''
  const htmlSignals = pageScore?.htmlSignals || []
  const trustContent = page.trustContent || {}
  const schemaAttrs = collectSchemaAttributePresence(best)
  const descriptionLength = trustContent.descriptionLength ?? 0
  const imageCount = Math.max(trustContent.imageCount ?? 0, countImagesFromProduct(best))
  const hasSpecifications =
    Boolean(trustContent.hasSpecifications) ||
    htmlSignals.some((signal) => SPEC_KEYWORD_PATTERNS.some((pattern) => pattern.test(signal)))
  const marketingHeavy = Boolean(trustContent.marketingHeavy) || looksMarketingHeavy(name)
  const htmlAttributes = trustContent.htmlAttributes || {}

  return {
    url: page.url,
    name,
    descriptionLength,
    imageCount,
    imagesWithAlt: trustContent.imagesWithAlt ?? 0,
    hasMainImage: Boolean(trustContent.hasMainImage || imageCount > 0),
    hasSpecifications,
    marketingHeavy,
    schemaAttrs,
    htmlAttributes,
    hasReviews: Boolean(trustContent.hasReviews),
    hasGuarantee: Boolean(trustContent.hasGuarantee),
    hasContactOrOrder:
      Boolean(trustContent.hasContactOrOrder) ||
      Boolean(page.signals?.addToCart || page.signals?.buyNow),
    htmlSignals,
  }
}

function scoreDescriptionQuality(snapshot) {
  let score = 0
  const detected = []
  const missing = []

  if (snapshot.descriptionLength >= 300) {
    score += 40
    detected.push(`description length (${snapshot.descriptionLength} characters)`)
  } else if (snapshot.descriptionLength >= 120) {
    score += 25
    detected.push(`short description (${snapshot.descriptionLength} characters)`)
  } else if (snapshot.descriptionLength > 0) {
    score += 10
    missing.push('longer product description')
  } else {
    missing.push('product description')
  }

  if (snapshot.hasSpecifications) {
    score += 25
    detected.push('specifications or sizing details')
  } else {
    missing.push('specifications')
  }

  if (snapshot.htmlAttributes.material || snapshot.htmlAttributes.size) {
    score += 20
    detected.push('factual attributes in page copy')
  } else {
    missing.push('factual attributes (material, size, dimensions)')
  }

  if (!snapshot.marketingHeavy) {
    score += 15
    detected.push('substantive copy (not marketing-only)')
  } else {
    missing.push('substantive product copy instead of marketing slogans')
  }

  const recommendation =
    missing.length > 0
      ? `Expand the product description with ${missing.slice(0, 3).join(', ')}.`
      : 'Product description quality looks sufficient.'

  return buildTrustFactor(
    'Product Description Quality',
    score,
    detected,
    missing,
    recommendation
  )
}

function scoreImageSignals(snapshot) {
  let score = 0
  const detected = []
  const missing = []

  if (snapshot.imageCount >= 3) {
    score += 45
    detected.push(`${snapshot.imageCount} product images`)
  } else if (snapshot.imageCount >= 1) {
    score += 25
    detected.push(`${snapshot.imageCount} product image(s)`)
    missing.push('additional product images')
  } else {
    missing.push('product images')
  }

  if (snapshot.hasMainImage) {
    score += 30
    detected.push('main product image')
  } else {
    missing.push('main product image')
  }

  if (snapshot.imagesWithAlt >= 1) {
    score += 25
    detected.push(`alt text on ${snapshot.imagesWithAlt} image(s)`)
  } else if (snapshot.imageCount > 0) {
    missing.push('descriptive alt text on product images')
  }

  const recommendation =
    missing.length > 0
      ? `Add ${missing.slice(0, 3).join(', ')} to improve buyer confidence.`
      : 'Product image signals look sufficient.'

  return buildTrustFactor('Product Image Signals', score, detected, missing, recommendation)
}

function scoreAttributeCompleteness(snapshots) {
  const attributeKeys = ['brand', 'material', 'size', 'color', 'model', 'sku']
  const detected = []
  const missing = []

  const presence = {
    brand: snapshots.some((snapshot) => snapshot.schemaAttrs.brand),
    material: snapshots.some((snapshot) => snapshot.htmlAttributes.material),
    size: snapshots.some((snapshot) => snapshot.htmlAttributes.size),
    color: snapshots.some((snapshot) => snapshot.htmlAttributes.color),
    model: snapshots.some((snapshot) => snapshot.htmlAttributes.model),
    sku: snapshots.some(
      (snapshot) => snapshot.schemaAttrs.sku || snapshot.schemaAttrs.gtin || snapshot.schemaAttrs.mpn
    ),
  }

  for (const key of attributeKeys) {
    if (presence[key]) detected.push(key)
    else missing.push(key)
  }

  const score = Math.round((detected.length / attributeKeys.length) * 100)
  const recommendation =
    missing.length > 0
      ? `Add missing product attributes: ${missing.slice(0, 4).join(', ')} in schema or visible product details.`
      : 'Product attribute coverage looks strong.'

  return buildTrustFactor(
    'Product Attribute Completeness',
    score,
    detected,
    missing,
    recommendation
  )
}

function scorePageTrustSignals(snapshot) {
  let score = 0
  const detected = []
  const missing = []

  if (snapshot.hasReviews) {
    score += 35
    detected.push('customer reviews or ratings')
  } else {
    missing.push('customer reviews or ratings')
  }

  if (snapshot.hasGuarantee) {
    score += 30
    detected.push('guarantee or warranty language')
  } else {
    missing.push('guarantee or warranty information')
  }

  if (snapshot.hasContactOrOrder) {
    score += 35
    detected.push('contact, shipping, or purchase action')
  } else {
    missing.push('contact or order information')
  }

  const recommendation =
    missing.length > 0
      ? `Strengthen page trust with ${missing.slice(0, 3).join(', ')}.`
      : 'Product page trust signals look sufficient.'

  return buildTrustFactor(
    'Product Page Trust Signals',
    score,
    detected,
    missing,
    recommendation
  )
}

function deriveProductTrustRiskLevel(factors, snapshots) {
  if (snapshots.length === 0) return 'medium'

  const descriptionFactor = factors.find((factor) => factor.name === 'Product Description Quality')
  const imageFactor = factors.find((factor) => factor.name === 'Product Image Signals')
  const attributeFactor = factors.find((factor) => factor.name === 'Product Attribute Completeness')

  const criticallyEmptyPages = snapshots.filter(
    (snapshot) => snapshot.descriptionLength < 50 && snapshot.imageCount === 0
  ).length

  const missingDescription = descriptionFactor?.missing?.includes('product description')
  const missingImages = imageFactor?.missing?.includes('product images')

  if (criticallyEmptyPages >= Math.ceil(snapshots.length / 2)) {
    return 'high'
  }

  if (missingDescription && missingImages) {
    return 'high'
  }

  if (
    (descriptionFactor?.score ?? 100) < 25 &&
    (imageFactor?.score ?? 100) < 25 &&
    (attributeFactor?.score ?? 100) < 30
  ) {
    return 'high'
  }

  if (factors.some((factor) => factor.score < 65)) {
    return 'medium'
  }

  if (factors.some((factor) => factor.missing.length >= 2)) {
    return 'medium'
  }

  return 'low'
}

function buildProductTrustMessage(report) {
  if (report.scannedPages === 0) {
    return 'No product pages were scanned to evaluate product trust signals.'
  }

  if (report.riskLevel === 'low') {
    return `Product pages provide solid trust signals (${report.score}/100 across ${report.scannedPages} page(s)).`
  }

  const issueSummaries = report.factors
    .filter((factor) => factor.missing.length > 0)
    .map((factor) => `${factor.name}: ${factor.missing.slice(0, 2).join(', ')}`)

  return `Product trust analysis (${report.score}/100 across ${report.scannedPages} page(s)). ${issueSummaries.join(' · ')}`
}

function buildProductTrustRecommendation(report) {
  if (report.scannedPages === 0) {
    return 'Ensure product detail pages are linked from your homepage so AuditPilot can review descriptions, images, and specifications.'
  }

  return report.factors
    .filter((factor) => factor.missing.length > 0)
    .map((factor) => factor.recommendation)
    .slice(0, 3)
    .join(' ')
}

export function analyzeProductPagesTrust(auditData) {
  const productPages = auditData.productsAudit?.productPages || []
  const pageScores = auditData.productsAudit?.pageScores || []
  const scoreByUrl = new Map(pageScores.map((entry) => [entry.url, entry]))

  if (productPages.length === 0) {
    const emptyReport = {
      score: 0,
      scannedPages: 0,
      averageScore: 0,
      lowestScore: 0,
      pages: [],
      factors: [],
      riskLevel: 'medium',
    }
    return {
      ...emptyReport,
      summaryMessage: buildProductTrustMessage(emptyReport),
      summaryRecommendation: buildProductTrustRecommendation(emptyReport),
    }
  }

  const snapshots = productPages.map((page) => analyzePageTrustSnapshot(page, scoreByUrl.get(page.url)))

  const perSnapshotFactors = snapshots.map((snapshot) => ({
    description: scoreDescriptionQuality(snapshot),
    images: scoreImageSignals(snapshot),
    pageTrust: scorePageTrustSignals(snapshot),
  }))

  const descriptionFactor = buildTrustFactor(
    'Product Description Quality',
    averageNumbers(perSnapshotFactors.map((entry) => entry.description.score)),
    [...new Set(perSnapshotFactors.flatMap((entry) => entry.description.detected))],
    [...new Set(perSnapshotFactors.flatMap((entry) => entry.description.missing))],
    perSnapshotFactors[0].description.recommendation
  )

  const imageFactor = buildTrustFactor(
    'Product Image Signals',
    averageNumbers(perSnapshotFactors.map((entry) => entry.images.score)),
    [...new Set(perSnapshotFactors.flatMap((entry) => entry.images.detected))],
    [...new Set(perSnapshotFactors.flatMap((entry) => entry.images.missing))],
    perSnapshotFactors[0].images.recommendation
  )

  const attributeFactor = scoreAttributeCompleteness(snapshots)
  const pageTrustFactor = buildTrustFactor(
    'Product Page Trust Signals',
    averageNumbers(perSnapshotFactors.map((entry) => entry.pageTrust.score)),
    [...new Set(perSnapshotFactors.flatMap((entry) => entry.pageTrust.detected))],
    [...new Set(perSnapshotFactors.flatMap((entry) => entry.pageTrust.missing))],
    perSnapshotFactors[0].pageTrust.recommendation
  )

  const factors = [descriptionFactor, imageFactor, attributeFactor, pageTrustFactor]
  const factorScores = factors.map((factor) => factor.score)
  const score = averageNumbers(factorScores)
  const averageScore = score
  const lowestScore = Math.min(...factorScores)
  const riskLevel = deriveProductTrustRiskLevel(factors, snapshots)

  const pages = snapshots.map((snapshot, index) => ({
    url: snapshot.url,
    name: snapshot.name,
    trustScore: averageNumbers([
      perSnapshotFactors[index].description.score,
      perSnapshotFactors[index].images.score,
      perSnapshotFactors[index].pageTrust.score,
    ]),
    descriptionLength: snapshot.descriptionLength,
    imageCount: snapshot.imageCount,
    htmlSignals: snapshot.htmlSignals,
  }))

  return {
    score,
    scannedPages: productPages.length,
    averageScore,
    lowestScore,
    factors,
    pages,
    riskLevel,
    summaryMessage: buildProductTrustMessage({
      score,
      scannedPages: productPages.length,
      riskLevel,
      factors,
    }),
    summaryRecommendation: buildProductTrustRecommendation({
      scannedPages: productPages.length,
      factors,
    }),
  }
}

export function misrepresentationLevelToSeverity(level) {
  switch (level) {
    case 'critical':
      return 'high'
    case 'high':
      return 'high'
    case 'medium':
      return 'medium'
    case 'low':
      return 'low'
    default:
      return 'medium'
  }
}
