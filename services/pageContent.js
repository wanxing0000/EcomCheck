import * as cheerio from 'cheerio'
import { extractJsonLdBlocks, collectOrganizations } from './structuredData.js'
import {
  buildPolicySignal,
  detectPaymentMethods,
  detectShippingCost,
  hasPaymentContext,
} from './policyIntelligence.js'

const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'be', 'been', 'being', 'have', 'has',
  'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'shall', 'can', 'need', 'dare', 'ought', 'used', 'it', 'its', 'this', 'that', 'these',
  'those', 'i', 'you', 'he', 'she', 'we', 'they', 'what', 'which', 'who', 'whom', 'when',
  'where', 'why', 'how', 'all', 'each', 'every', 'both', 'few', 'more', 'most', 'other',
  'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than', 'too', 'very',
  'just', 'don', 'now', 'our', 'your', 'their', 'my', 'his', 'her', 'any', 'also', 'about',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'once', 'get', 'got', 'us', 'com',
  'www', 'http', 'https', 'html', 'page', 'home', 'click', 'read', 'see', 'use', 'using',
])

const MAIN_CONTENT_SELECTORS = [
  'main',
  'article',
  '[role="main"]',
  '.shopify-policy__body',
  '.policy-content',
  '.page-content',
  '.main-content',
  '#main-content',
  '.entry-content',
  '.post-content',
  '.woocommerce-TermsAndConditions',
  '#content',
  '.content',
]

const EMAIL_REGEX = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}\b/g
const PHONE_REGEX =
  /(?:\+?\d{1,3}[-.\s(])?\(?\d{2,4}\)?[-.\s)]*\d{3,4}[-.\s]\d{3,4}\b/g
const INTL_PHONE_REGEX = /\+[1-9]\d{0,3}[\s.-]?(?:\d[\s.-]?){5,14}\d/g
const LABELED_PHONE_REGEX =
  /(?:phone|tel(?:ephone)?|mobile|call(?:\s+us)?)[^:+\d]{0,40}:\s*(\+?\d[\d\s().-]{6,18})/gi
const ADDRESS_REGEX =
  /\d{1,5}\s+[\w\s]{2,30}(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)\.?(?:,\s*[\w\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?/gi

const REGION_SELECTORS = {
  footer: 'footer, [role="contentinfo"], .site-footer, #footer, .footer, .wd-footer',
  header: 'header, [role="banner"], .site-header, #header, .header, .whb-header',
  contact:
    '.contact, .contact-us, .contact-page, [class*="contact"], .elementor-icon-list, .wd-contact',
}

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

const REFUND_KEYWORDS = /\b(refund|money.?back|reimbursement|reimbursed)\b/i
const RETURN_KEYWORDS = /\b(return|send back|exchange|returned items?)\b/i
const RETURN_WINDOW_PATTERNS = [
  /\b(\d{1,3})\s*(?:calendar\s*)?days?\b/i,
  /\b(\d{1,2})\s*weeks?\b/i,
  /\b(\d{1,2})\s*months?\b/i,
  /\bwithin\s+(\d{1,3})\s*days?\b/i,
  /\breturn\s+(?:period|window|timeframe)\b/i,
]
const CONDITION_KEYWORDS = [
  /\bunused\b/i,
  /\bunopened\b/i,
  /\boriginal condition\b/i,
  /\boriginal packaging\b/i,
  /\btags attached\b/i,
  /\bresalable\b/i,
  /\bwearable\b/i,
  /\bdefective\b/i,
  /\bdamaged\b/i,
]

const SHIPPING_KEYWORDS = /\b(shipping|delivery|dispatch|fulfillment|ship(?:ping)?\s+policy)\b/i
const DELIVERY_TIME_PATTERNS = [
  /\b\d{1,3}\s*(?:business\s*)?days?\b/i,
  /\b\d{1,2}\s*weeks?\b/i,
  /\b(?:within|up to)\s+\d{1,3}\s*days?\b/i,
  /\bestimated delivery\b/i,
  /\bprocessing time\b/i,
]
const SHIPPING_REGION_PATTERNS = [
  /\b(?:worldwide|international|domestic|nationwide)\b/i,
  /\b(?:united states|u\.?s\.?a?\.?|united kingdom|u\.?k\.?|europe|canada|australia)\b/i,
  /\b(?:ships to|deliver(?:y)? to|available in)\b/i,
]
const SHIPPING_COST_PATTERNS = [
  /\bfree(?:\s+\w+){0,3}\s+shipping\b/i,
  /\bfree(?:\s+\w+){0,3}\s+delivery\b/i,
  /\bfree shipping\b/i,
  /\bfree delivery\b/i,
  /\bshipping is free\b/i,
  /\bno shipping charge\b/i,
  /\bzero shipping fee\b/i,
  /\bcomplimentary shipping\b/i,
  /\$0 shipping\b/i,
  /\bshipping (?:cost|fee|rate|charge)s?\b/i,
  /\bflat rate\b/i,
  /\bcalculated at checkout\b/i,
  /\bshipping (?:is|starts at)\s+\$/i,
]

const PAYMENT_KEYWORDS = /\b(payment|pay(?:ment)?s?|billing|checkout|purchase|order|accept(?:s|ed)?)\b/i
const PAYMENT_METHOD_PATTERNS = [
  /\bcredit card(?:s)?\b/i,
  /\bdebit card(?:s)?\b/i,
  /\bpaypal\b/i,
  /\bstripe\b/i,
  /\bapple pay\b/i,
  /\bgoogle pay\b/i,
  /\bbank transfer\b/i,
  /\bvisa\b/i,
  /\bmastercard\b/i,
  /\bamerican express\b/i,
  /\bamex\b/i,
  /\bklarna\b/i,
  /\bshop pay\b/i,
  /\bcard payments?\b/i,
  /\bsecure checkout\b/i,
  /\bcheckout provider\b/i,
  /\bwe accept\b/i,
]
const PAYMENT_CURRENCY_PATTERNS = [
  /\b(?:usd|eur|gbp|cad|aud)\b/i,
  /\bcurrency\b/i,
  /\b(?:all prices|prices are) (?:in|shown in)\b/i,
]

function buildPolicyQualityResult({ textLength, checks, missingLabels, riskMessages, signals = {} }) {
  const passedChecks = Object.values(checks).filter(Boolean).length
  const qualityScore = Math.round((passedChecks / Object.keys(checks).length) * 100)

  return {
    textLength,
    checks,
    signals,
    qualityScore,
    missing: missingLabels,
    risks: riskMessages,
  }
}

function extractBodyText($) {
  $('script, style, noscript, iframe, svg, nav, header, footer').remove()

  for (const selector of MAIN_CONTENT_SELECTORS) {
    const el = $(selector)
    if (el.length) {
      return normalizeWhitespace(el.first().text())
    }
  }

  return normalizeWhitespace($('body').text())
}

function extractFooterText($) {
  const footer = $(REGION_SELECTORS.footer).first()
  if (!footer.length) return ''
  return normalizeWhitespace(footer.text())
}

function extractKeywords(text, title, h1, limit = 10) {
  const combined = `${title} ${h1} ${text}`.toLowerCase()
  const words = combined.match(/[a-z]{3,}/g) || []
  const freq = {}

  for (const word of words) {
    if (STOP_WORDS.has(word) || word.length > 20) continue
    freq[word] = (freq[word] || 0) + 1
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }))
}

function extractSchemaAddresses($) {
  const addresses = []

  $('[itemtype*="PostalAddress"], [itemprop="address"]').each((_, el) => {
    const text = normalizeWhitespace($(el).text())
    if (text.length >= 10 && text.length <= 300) {
      addresses.push(text)
    }
  })

  $('[itemprop="streetAddress"]').each((_, el) => {
    const street = normalizeWhitespace($(el).text())
    const locality = normalizeWhitespace($('[itemprop="addressLocality"]').first().text())
    const region = normalizeWhitespace($('[itemprop="addressRegion"]').first().text())
    const postal = normalizeWhitespace($('[itemprop="postalCode"]').first().text())
    const parts = [street, locality, region, postal].filter(Boolean)
    if (parts.length >= 2) {
      addresses.push(parts.join(', '))
    }
  })

  return addresses
}

function isValidEmail(email) {
  const lower = email.toLowerCase().trim()
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,10}$/i.test(lower)) return false
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.gif')) return false
  if (lower.includes('example.com') || lower.includes('sentry.io')) return false
  if (lower.includes('@2x') || lower.includes('@3x')) return false
  return true
}

const ADDRESS_FALSE_POSITIVE =
  /select options|this product|add to cart|free standard|pieces dnd|pieces golden|supplement st|woocommerce|copyright/i

function isValidAddress(address, source = 'regex') {
  if (!address || typeof address !== 'string') return false
  const text = normalizeWhitespace(address)
  if (text.length < 12 || text.length > 220) return false
  if (ADDRESS_FALSE_POSITIVE.test(text)) return false
  if (source === 'schema' || source === 'schema:PostalAddress') return true
  return /\b(street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl|crescent|close|terrace|park)\b/i.test(
    text
  )
}

function formatSchemaAddress(address) {
  if (!address) return null
  if (typeof address === 'string') return normalizeWhitespace(address)
  if (typeof address !== 'object') return null
  const parts = [
    address.streetAddress,
    address.addressLocality,
    address.addressRegion,
    address.postalCode,
    address.addressCountry,
  ].filter(Boolean)
  return parts.length >= 2 ? parts.join(', ') : null
}

function extractOrganizationContact(html, page, sources, seen) {
  const emails = []
  const phones = []
  const addresses = []

  for (const block of extractJsonLdBlocks(html)) {
    const organizations = []
    collectOrganizations(block, organizations)

    for (const org of organizations) {
      if (org.email && isValidEmail(org.email)) {
        emails.push(org.email)
        addContactSource(sources, seen, 'email', org.email, 'schema', page)
      }
      if (org.telephone && isValidPhone(String(org.telephone))) {
        const phone = normalizePhone(String(org.telephone))
        phones.push(phone)
        addContactSource(sources, seen, 'phone', phone, 'schema', page)
      }
      const formatted = formatSchemaAddress(org.address)
      if (formatted && isValidAddress(formatted, 'schema')) {
        addresses.push(formatted)
        addContactSource(sources, seen, 'address', formatted, 'schema', page)
      }
    }
  }

  return { emails, phones, addresses }
}

function addContactSource(sources, seen, type, value, source, page) {
  if (!value) return
  const key = `${type}:${String(value).toLowerCase()}`
  if (seen.has(key)) return
  seen.add(key)
  sources.push({ type, value, source, page })
}

function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false

  const trimmed = phone.trim()
  const digits = trimmed.replace(/\D/g, '')

  if (digits.length < 10 || digits.length > 15) return false
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false
  if (/^1[67]\d{8,}$/.test(digits) && !trimmed.startsWith('+')) return false

  return true
}

function normalizePhone(phone) {
  return phone.replace(/\s+/g, ' ').trim()
}

function addPhoneCandidate(candidates, seen, value, source, page) {
  if (!value || !isValidPhone(value)) return

  const normalized = normalizePhone(value)
  const key = normalized.replace(/\D/g, '')
  if (seen.has(key)) return

  seen.add(key)
  candidates.push({ value: normalized, source, page })
}

function addPhoneSource(sources, sourceSeen, candidates, seen, value, source, page) {
  addPhoneCandidate(candidates, seen, value, source, page)
  if (value && isValidPhone(value)) {
    addContactSource(sources, sourceSeen, 'phone', normalizePhone(value), source, page)
  }
}

function extractPhoneCandidatesFromText(text, page, source, candidates, seen, sources, sourceSeen) {
  if (!text) return

  for (const match of text.match(INTL_PHONE_REGEX) || []) {
    addPhoneSource(sources, sourceSeen, candidates, seen, match, source, page)
  }

  for (const match of text.match(PHONE_REGEX) || []) {
    addPhoneSource(sources, sourceSeen, candidates, seen, match, source, page)
  }

  let labeledMatch
  const labeledRegex = new RegExp(LABELED_PHONE_REGEX.source, LABELED_PHONE_REGEX.flags)
  while ((labeledMatch = labeledRegex.exec(text)) !== null) {
    addPhoneSource(sources, sourceSeen, candidates, seen, labeledMatch[1], `${source}:labeled`, page)
  }
}

function extractPhoneCandidatesFromRegions($, page, candidates, seen, sources, sourceSeen) {
  for (const [region, selector] of Object.entries(REGION_SELECTORS)) {
    $(selector).each((_, el) => {
      const text = $(el).text()
      extractPhoneCandidatesFromText(text, page, region, candidates, seen, sources, sourceSeen)

      $(el)
        .find('a[href^="tel:"]')
        .each((__, link) => {
          const href = $(link).attr('href') || ''
          const phone = href.replace(/^tel:/i, '').trim()
          addPhoneSource(sources, sourceSeen, candidates, seen, phone, `${region}:tel`, page)
        })
    })
  }
}

function extractAddressesFromRegions($, page, sources, sourceSeen) {
  const addresses = []

  for (const [region, selector] of Object.entries(REGION_SELECTORS)) {
    $(selector).each((_, el) => {
      const text = normalizeWhitespace($(el).text())
      for (const match of text.match(ADDRESS_REGEX) || []) {
        const addr = normalizeWhitespace(match)
        if (!isValidAddress(addr, region)) continue
        addresses.push(addr)
        addContactSource(sources, sourceSeen, 'address', addr, region, page)
      }
    })
  }

  return addresses
}

/**
 * Extract normalized body text from HTML.
 */
export function getBodyTextFromHtml(html) {
  const $ = cheerio.load(html)
  return extractBodyText($)
}

/**
 * Extract footer text from HTML without stripping footer from the DOM first.
 */
export function getFooterTextFromHtml(html) {
  const $ = cheerio.load(html)
  return extractFooterText($)
}

/**
 * Analyze return/refund policy page quality for GMC compliance.
 * @param {string} text - Normalized page body text
 * @param {{ emails?: string[], phones?: string[], addresses?: string[] }} pageContact
 */
export function analyzeReturnPolicyQuality(text, pageContact = {}) {
  const textLength = text.length

  const refundKeywords = REFUND_KEYWORDS.test(text)
  const returnKeywords = RETURN_KEYWORDS.test(text)

  const returnWindowMatches = []
  for (const pattern of RETURN_WINDOW_PATTERNS) {
    const match = text.match(pattern)
    if (match) returnWindowMatches.push(match[0])
  }
  const returnWindow = returnWindowMatches.length > 0

  const conditionMatches = []
  for (const pattern of CONDITION_KEYWORDS) {
    const match = text.match(pattern)
    if (match) conditionMatches.push(match[0])
  }
  const condition = conditionMatches.length > 0

  const contactDetails = {
    emails: pageContact.emails || [],
    phones: pageContact.phones || [],
    addresses: pageContact.addresses || [],
  }
  const hasContactInfo =
    contactDetails.emails.length > 0 ||
    contactDetails.phones.length > 0 ||
    contactDetails.addresses.length > 0 ||
    /\bcontact us\b/i.test(text) ||
    /\bcustomer service\b/i.test(text)

  const checks = {
    sufficientLength: textLength >= 100,
    refundKeywords,
    returnKeywords,
    returnWindow,
    condition,
    contactInformation: hasContactInfo,
  }

  const missing = []
  if (!checks.sufficientLength) missing.push('sufficient content length')
  if (!checks.refundKeywords) missing.push('refund keywords')
  if (!checks.returnKeywords) missing.push('return keywords')
  if (!checks.returnWindow) missing.push('return window')
  if (!checks.condition) missing.push('return conditions')
  if (!checks.contactInformation) missing.push('contact information')

  const passedChecks = Object.values(checks).filter(Boolean).length
  const qualityScore = Math.round((passedChecks / Object.keys(checks).length) * 100)

  const risks = []
  if (!checks.refundKeywords && !checks.returnKeywords) {
    risks.push('Policy text lacks clear refund or return language.')
  }
  if (!checks.returnWindow) risks.push('No return window or time limit detected.')
  if (!checks.condition) risks.push('Return conditions (e.g. unused, original packaging) not found.')
  if (!checks.contactInformation) risks.push('No contact information for return inquiries.')

  return {
    textLength,
    checks,
    returnWindowMatches: [...new Set(returnWindowMatches)].slice(0, 5),
    conditionMatches: [...new Set(conditionMatches)].slice(0, 5),
    contactDetails,
    qualityScore,
    missing,
    risks,
  }
}

/**
 * Analyze shipping policy page quality for GMC compliance.
 * @param {string} text
 */
export function analyzeShippingPolicyQuality(text) {
  const textLength = text.length
  const shippingKeywords = SHIPPING_KEYWORDS.test(text)

  const deliveryTime = DELIVERY_TIME_PATTERNS.some((pattern) => pattern.test(text))
  const shippingRegions = SHIPPING_REGION_PATTERNS.some((pattern) => pattern.test(text))
  const shippingCostSignal = detectShippingCost(text)
  const shippingCost = shippingCostSignal.found

  const checks = {
    sufficientLength: textLength >= 80,
    shippingKeywords,
    deliveryTime,
    shippingRegions,
    shippingCost,
  }

  const signals = {
    shippingCost: buildPolicySignal(shippingCostSignal),
  }

  const missing = []
  if (!checks.sufficientLength) missing.push('sufficient content length')
  if (!checks.shippingKeywords) missing.push('shipping keywords')
  if (!checks.deliveryTime) missing.push('delivery timeframes')
  if (!checks.shippingRegions) missing.push('shipping regions')
  if (!checks.shippingCost) missing.push('shipping costs')

  const risks = []
  if (!checks.shippingKeywords) risks.push('Policy text lacks clear shipping or delivery language.')
  if (!checks.deliveryTime) risks.push('No delivery timeframes detected.')
  if (!checks.shippingRegions) risks.push('Shipping regions or delivery areas not specified.')
  if (!checks.shippingCost) risks.push('Shipping costs or free shipping terms not found.')

  return buildPolicyQualityResult({
    textLength,
    checks,
    signals,
    missingLabels: missing,
    riskMessages: risks,
  })
}

/**
 * Analyze payment / terms page quality for GMC compliance.
 * @param {string} text
 * @param {{ pageSource?: string }} [options]
 */
export function analyzePaymentPolicyQuality(text, options = {}) {
  const textLength = text.length
  const paymentKeywords = PAYMENT_KEYWORDS.test(text) || hasPaymentContext(text)
  const paymentMethodsSignal = detectPaymentMethods(text)
  const paymentMethods = paymentMethodsSignal.found
  const currencyOrPricing = PAYMENT_CURRENCY_PATTERNS.some((pattern) => pattern.test(text))
  const hasPaymentSignals = paymentKeywords && (paymentMethods || currencyOrPricing)

  const checks = {
    sufficientLength: textLength >= 80,
    paymentKeywords,
    paymentMethods,
    currencyOrPricing,
    hasPaymentSignals,
  }

  const signals = {
    paymentMethods: buildPolicySignal(paymentMethodsSignal),
  }

  const missing = []
  if (!checks.sufficientLength) missing.push('sufficient content length')
  if (!checks.paymentKeywords) missing.push('payment keywords')
  if (!checks.paymentMethods) missing.push('payment methods')
  if (!checks.currencyOrPricing) missing.push('currency or pricing terms')
  if (!checks.hasPaymentSignals) missing.push('actionable payment information')

  const risks = []
  if (!checks.paymentKeywords) {
    risks.push('Page lacks clear payment or billing language.')
  }
  if (!checks.paymentMethods) {
    risks.push('Accepted payment methods (card, PayPal, etc.) not detected.')
  }
  if (options.pageSource === 'terms-of-service' && !checks.hasPaymentSignals) {
    risks.push('Terms of Service page found but no actionable payment information detected.')
  }

  return {
    ...buildPolicyQualityResult({
      textLength,
      checks,
      signals,
      missingLabels: missing,
      riskMessages: risks,
    }),
    pageSource: options.pageSource || 'dedicated',
  }
}

/**
 * Parse HTML and extract page content metadata.
 */
export function parsePageContent(html, pageUrl) {
  const $ = cheerio.load(html)

  const title = normalizeWhitespace($('title').first().text())
  const h1 = normalizeWhitespace($('h1').first().text())
  const footerText = extractFooterText($)
  const text = extractBodyText($)
  const keywords = extractKeywords(text, title, h1)

  return {
    url: pageUrl,
    fetched: true,
    title,
    h1,
    textLength: text.length,
    bodyText: text.slice(0, 50000),
    footerText: footerText.slice(0, 20000),
    keywords,
    policyQuality: null,
  }
}

/**
 * Extract contact information from HTML.
 * @param {string} html
 * @param {{ page?: string }} [options]
 */
export function extractContactInfo(html, options = {}) {
  const page = options.page || 'unknown'
  const $ = cheerio.load(html)
  const phoneCandidates = []
  const seenPhones = new Set()
  const sources = []
  const sourceSeen = new Set()

  const orgContact = extractOrganizationContact(html, page, sources, sourceSeen)
  const emails = [...orgContact.emails]
  const phones = [...orgContact.phones]
  const addresses = [...orgContact.addresses]

  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const email = href.replace(/^mailto:/i, '').split('?')[0].trim()
    if (email && isValidEmail(email)) {
      emails.push(email)
      addContactSource(sources, sourceSeen, 'email', email, 'mailto', page)
    }
  })

  for (const [region, selector] of Object.entries(REGION_SELECTORS)) {
    $(selector).each((_, el) => {
      const regionText = $(el).text()
      for (const match of regionText.match(EMAIL_REGEX) || []) {
        if (!isValidEmail(match)) continue
        emails.push(match)
        addContactSource(sources, sourceSeen, 'email', match, region, page)
      }
    })
  }

  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const phone = href.replace(/^tel:/i, '').trim()
    addPhoneSource(sources, sourceSeen, phoneCandidates, seenPhones, phone, 'tel:link', page)
  })

  extractPhoneCandidatesFromText(
    $('body').text(),
    page,
    'body',
    phoneCandidates,
    seenPhones,
    sources,
    sourceSeen
  )
  extractPhoneCandidatesFromRegions($, page, phoneCandidates, seenPhones, sources, sourceSeen)

  for (const addr of extractSchemaAddresses($)) {
    if (!isValidAddress(addr, 'schema:PostalAddress')) continue
    addresses.push(addr)
    addContactSource(sources, sourceSeen, 'address', addr, 'schema:PostalAddress', page)
  }

  addresses.push(...extractAddressesFromRegions($, page, sources, sourceSeen))

  for (const candidate of phoneCandidates) {
    phones.push(candidate.value)
  }

  return {
    emails: [...new Set(emails)].slice(0, 10),
    phones: [...new Set(phones)].slice(0, 10),
    addresses: [...new Set(addresses)].slice(0, 5),
    phoneCandidates: phoneCandidates.slice(0, 20),
    sources: sources.slice(0, 40),
  }
}

/**
 * Merge multiple contact info objects, deduplicating values.
 */
export function mergeContactInfo(sources) {
  const merged = { emails: [], phones: [], addresses: [], phoneCandidates: [], sources: [] }
  const seenPhoneDigits = new Set()
  const sourceSeen = new Set()

  for (const source of sources) {
    if (!source) continue
    merged.emails.push(...(source.emails || []))
    merged.phones.push(...(source.phones || []))
    merged.addresses.push(...(source.addresses || []))

    for (const candidate of source.phoneCandidates || []) {
      const digits = candidate.value?.replace(/\D/g, '')
      if (!digits || seenPhoneDigits.has(digits)) continue
      seenPhoneDigits.add(digits)
      merged.phoneCandidates.push(candidate)
    }

    for (const item of source.sources || []) {
      const key = `${item.type}:${String(item.value).toLowerCase()}:${item.source}:${item.page}`
      if (sourceSeen.has(key)) continue
      sourceSeen.add(key)
      merged.sources.push(item)
    }
  }

  const phones = [...new Set([...merged.phones, ...merged.phoneCandidates.map((c) => c.value)])].slice(
    0,
    10
  )

  return {
    emails: [...new Set(merged.emails)].slice(0, 10),
    phones,
    addresses: [...new Set(merged.addresses)].slice(0, 5),
    phoneCandidates: merged.phoneCandidates.slice(0, 20),
    sources: merged.sources.slice(0, 40),
  }
}
