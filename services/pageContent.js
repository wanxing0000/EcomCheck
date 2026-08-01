import * as cheerio from 'cheerio'

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
const PHONE_REGEX = /(?:\+?\d{1,3}[-.\s(])?\(?\d{2,4}\)?[-.\s)]*\d{3,4}[-.\s]\d{3,4}\b/g
const ADDRESS_REGEX =
  /\d{1,5}\s+[\w\s]{2,30}(?:street|st|avenue|ave|road|rd|boulevard|blvd|drive|dr|lane|ln|way|court|ct|place|pl)\.?(?:,\s*[\w\s]+,\s*[A-Z]{2}\s*\d{5}(?:-\d{4})?)?/gi

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
  const lower = email.toLowerCase()
  if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.gif')) return false
  if (lower.includes('example.com') || lower.includes('sentry.io')) return false
  if (lower.includes('@2x') || lower.includes('@3x')) return false
  return true
}

function isValidPhone(phone) {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 10 && digits.length <= 15
}

/**
 * Extract normalized body text from HTML.
 */
export function getBodyTextFromHtml(html) {
  const $ = cheerio.load(html)
  return extractBodyText($)
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
 * Parse HTML and extract page content metadata.
 */
export function parsePageContent(html, pageUrl) {
  const $ = cheerio.load(html)

  const title = normalizeWhitespace($('title').first().text())
  const h1 = normalizeWhitespace($('h1').first().text())
  const text = extractBodyText($)
  const keywords = extractKeywords(text, title, h1)

  return {
    url: pageUrl,
    fetched: true,
    title,
    h1,
    textLength: text.length,
    keywords,
    policyQuality: null,
  }
}

/**
 * Extract contact information from HTML.
 */
export function extractContactInfo(html) {
  const $ = cheerio.load(html)
  const text = $('body').text()

  const mailtoEmails = []
  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const email = href.replace(/^mailto:/i, '').split('?')[0].trim()
    if (email && isValidEmail(email)) mailtoEmails.push(email)
  })

  const telPhones = []
  $('a[href^="tel:"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const phone = href.replace(/^tel:/i, '').trim()
    if (phone && isValidPhone(phone)) telPhones.push(phone)
  })

  const regexEmails = [...new Set(text.match(EMAIL_REGEX) || [])].filter(isValidEmail)
  const regexPhones = [...new Set(text.match(PHONE_REGEX) || [])].filter(isValidPhone)
  const schemaAddresses = extractSchemaAddresses($)
  const regexAddresses = [...new Set(text.match(ADDRESS_REGEX) || [])]
    .map(normalizeWhitespace)
    .filter((a) => a.length >= 15 && a.length <= 200)

  const emails = [...new Set([...mailtoEmails, ...regexEmails])].slice(0, 10)
  const phones = [...new Set([...telPhones, ...regexPhones])].slice(0, 10)
  const addresses = [...new Set([...schemaAddresses, ...regexAddresses])].slice(0, 5)

  return { emails, phones, addresses }
}

/**
 * Merge multiple contact info objects, deduplicating values.
 */
export function mergeContactInfo(sources) {
  const merged = { emails: [], phones: [], addresses: [] }

  for (const source of sources) {
    if (!source) continue
    merged.emails.push(...(source.emails || []))
    merged.phones.push(...(source.phones || []))
    merged.addresses.push(...(source.addresses || []))
  }

  return {
    emails: [...new Set(merged.emails)].slice(0, 10),
    phones: [...new Set(merged.phones)].slice(0, 10),
    addresses: [...new Set(merged.addresses)].slice(0, 5),
  }
}
