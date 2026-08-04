/**
 * Policy text intelligence — enhanced keyword/semantic detection with evidence.
 * Presentation/analysis layer only; does not change rule pass/fail structure.
 */

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

function extractEvidenceSnippet(text, matchIndex, matchLength = 0) {
  if (!text || matchIndex == null || matchIndex < 0) return ''

  const sentenceStart = Math.max(
    text.lastIndexOf('.', matchIndex - 1),
    text.lastIndexOf('!', matchIndex - 1),
    text.lastIndexOf('?', matchIndex - 1),
    text.lastIndexOf('\n', matchIndex - 1)
  )
  const sentenceEndCandidates = [
    text.indexOf('.', matchIndex + matchLength),
    text.indexOf('!', matchIndex + matchLength),
    text.indexOf('?', matchIndex + matchLength),
    text.indexOf('\n', matchIndex + matchLength),
  ].filter((index) => index >= 0)

  const sentenceEnd =
    sentenceEndCandidates.length > 0 ? Math.min(...sentenceEndCandidates) + 1 : text.length

  let snippet = text.slice(
    sentenceStart >= 0 ? sentenceStart + 1 : 0,
    Math.min(text.length, sentenceEnd)
  )

  snippet = normalizeWhitespace(snippet)

  if (snippet.length >= 12) return snippet

  const padStart = Math.max(0, matchIndex - 40)
  const padEnd = Math.min(text.length, matchIndex + Math.max(matchLength, 20) + 60)
  return normalizeWhitespace(text.slice(padStart, padEnd))
}

function findFirstPatternMatch(text, patternEntries) {
  let bestMatch = null

  for (const entry of patternEntries) {
    const regex = entry.pattern.global ? entry.pattern : new RegExp(entry.pattern.source, entry.pattern.flags)
    regex.lastIndex = 0
    const match = regex.exec(text)
    if (!match) continue

    const candidate = {
      label: entry.label,
      type: entry.type,
      match: match[0],
      index: match.index,
    }

    if (!bestMatch || match.index < bestMatch.index) {
      bestMatch = candidate
    }
  }

  return bestMatch
}

function findAllPatternMatches(text, patternEntries) {
  const matches = []
  const seenLabels = new Set()

  for (const entry of patternEntries) {
    const regex = entry.pattern.global ? entry.pattern : new RegExp(entry.pattern.source, entry.pattern.flags)
    regex.lastIndex = 0
    const match = regex.exec(text)
    if (!match || seenLabels.has(entry.label)) continue

    seenLabels.add(entry.label)
    matches.push({
      label: entry.label,
      type: entry.type,
      match: match[0],
      index: match.index,
    })
  }

  matches.sort((a, b) => a.index - b.index)
  return matches
}

function formatMatchedLabels(matches) {
  if (matches.length === 0) return ''
  if (matches.length === 1) return matches[0].match
  if (matches.length === 2) return `${matches[0].match} and ${matches[1].match}`
  return `${matches.slice(0, -1).map((item) => item.match).join(', ')} and ${matches[matches.length - 1].match}`
}

const PAYMENT_METHOD_PATTERN_ENTRIES = [
  { pattern: /\bvisa\b/i, label: 'Visa', type: 'visa' },
  { pattern: /\bmastercard\b/i, label: 'Mastercard', type: 'mastercard' },
  { pattern: /\bcredit card(?:s)?\b/i, label: 'Credit card', type: 'credit_card' },
  { pattern: /\bdebit card(?:s)?\b/i, label: 'Debit card', type: 'debit_card' },
  { pattern: /\bamex\b/i, label: 'Amex', type: 'amex' },
  { pattern: /\bamerican express\b/i, label: 'American Express', type: 'american_express' },
  { pattern: /\bpaypal\b/i, label: 'PayPal', type: 'paypal' },
  { pattern: /\bapple pay\b/i, label: 'Apple Pay', type: 'apple_pay' },
  { pattern: /\bgoogle pay\b/i, label: 'Google Pay', type: 'google_pay' },
  { pattern: /\bklarna\b/i, label: 'Klarna', type: 'klarna' },
  { pattern: /\bstripe\b/i, label: 'Stripe', type: 'stripe' },
  { pattern: /\bshop pay\b/i, label: 'Shop Pay', type: 'shop_pay' },
  { pattern: /\bbank transfer\b/i, label: 'Bank transfer', type: 'bank_transfer' },
  { pattern: /\bcard payments?\b/i, label: 'Card payments', type: 'card_payments' },
  { pattern: /\bsecure checkout\b/i, label: 'Secure checkout', type: 'secure_checkout' },
  { pattern: /\bcheckout provider\b/i, label: 'Checkout provider', type: 'checkout_provider' },
  { pattern: /\bwe accept\b/i, label: 'We accept', type: 'acceptance_statement' },
  { pattern: /\baccepts?\s+(?:visa|mastercard|paypal|amex|credit|debit|payment)/i, label: 'Accepts payments', type: 'acceptance_statement' },
]

const SHIPPING_COST_PATTERN_ENTRIES = [
  { pattern: /\bfree standard shipping\b/i, label: 'Free standard shipping', type: 'free_shipping' },
  { pattern: /\bfree(?:\s+\w+){0,3}\s+shipping\b/i, label: 'Free shipping', type: 'free_shipping' },
  { pattern: /\bfree(?:\s+\w+){0,3}\s+delivery\b/i, label: 'Free delivery', type: 'free_shipping' },
  { pattern: /\bfree shipping\b/i, label: 'Free shipping', type: 'free_shipping' },
  { pattern: /\bfree delivery\b/i, label: 'Free delivery', type: 'free_shipping' },
  { pattern: /\bshipping is free\b/i, label: 'Shipping is free', type: 'free_shipping' },
  { pattern: /\bno shipping charge\b/i, label: 'No shipping charge', type: 'free_shipping' },
  { pattern: /\bzero shipping fee\b/i, label: 'Zero shipping fee', type: 'free_shipping' },
  { pattern: /\bcomplimentary shipping\b/i, label: 'Complimentary shipping', type: 'free_shipping' },
  { pattern: /\$0 shipping\b/i, label: '$0 shipping', type: 'free_shipping' },
  { pattern: /\bflat rate shipping\b/i, label: 'Flat rate shipping', type: 'flat_rate' },
  { pattern: /\bflat rate\b/i, label: 'Flat rate', type: 'flat_rate' },
  { pattern: /\bshipping (?:cost|fee|rate|charge)s?\b/i, label: 'Shipping cost', type: 'shipping_cost_terms' },
  { pattern: /\bcalculated at checkout\b/i, label: 'Calculated at checkout', type: 'calculated_checkout' },
  { pattern: /\bshipping (?:is|starts at)\s+\$/i, label: 'Priced shipping', type: 'priced_shipping' },
]

const PAYMENT_CONTEXT_PATTERN = /\b(payment|pay(?:ment)?s?|billing|checkout|purchase|order|accept(?:s|ed)?)\b/i

export function detectPaymentMethods(text = '') {
  const normalized = normalizeWhitespace(text)
  const matches = findAllPatternMatches(normalized, PAYMENT_METHOD_PATTERN_ENTRIES)

  if (matches.length === 0) {
    return {
      detected: 'not_found',
      type: null,
      evidence: '',
      matches: [],
      found: false,
    }
  }

  const primary = matches[0]
  const evidence = extractEvidenceSnippet(normalized, primary.index, primary.match.length) || formatMatchedLabels(matches)

  return {
    detected: 'found',
    type: matches.length > 1 ? 'multiple_methods' : primary.type,
    evidence,
    matches: matches.map((item) => item.match),
    found: true,
  }
}

export function detectShippingCost(text = '') {
  const normalized = normalizeWhitespace(text)
  const match = findFirstPatternMatch(normalized, SHIPPING_COST_PATTERN_ENTRIES)

  if (!match) {
    return {
      detected: 'not_found',
      type: null,
      evidence: '',
      matches: [],
      found: false,
    }
  }

  return {
    detected: 'found',
    type: match.type,
    evidence: extractEvidenceSnippet(normalized, match.index, match.match.length) || match.match,
    matches: [match.match],
    found: true,
  }
}

export function hasPaymentContext(text = '') {
  return PAYMENT_CONTEXT_PATTERN.test(normalizeWhitespace(text))
}

export function buildPolicySignal(detectedResult) {
  return {
    detected: detectedResult.detected,
    type: detectedResult.type,
    evidence: detectedResult.evidence,
    matches: detectedResult.matches,
  }
}
