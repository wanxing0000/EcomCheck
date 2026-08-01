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
