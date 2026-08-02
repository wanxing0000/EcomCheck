import * as cheerio from 'cheerio'
import { summarizeStructuredData } from './structuredData.js'

export const MAX_ROBOTS_BODY_CHARS = 8192
const MAX_H1_SAMPLES = 5
const MAX_H1_TEXT_CHARS = 120

function normalizeWhitespace(text) {
  return text.replace(/\s+/g, ' ').trim()
}

/**
 * Detect whether robots.txt blocks all crawlers from the entire site.
 * @param {string|null} body
 */
export function parseRobotsBlocksAll(body) {
  if (!body) return false

  const lines = body.split('\n').map((line) => line.trim())
  let appliesToAllAgents = true

  for (const line of lines) {
    if (!line || line.startsWith('#')) continue

    const userAgentMatch = line.match(/^User-agent:\s*(.+)$/i)
    if (userAgentMatch) {
      const agent = userAgentMatch[1].trim().toLowerCase()
      appliesToAllAgents = agent === '*'
      continue
    }

    if (!appliesToAllAgents) continue

    const disallowMatch = line.match(/^Disallow:\s*(.*)$/i)
    if (!disallowMatch) continue

    const path = disallowMatch[1].trim()
    if (path === '/' || path === '/*') {
      return true
    }
  }

  return false
}

/**
 * Extract homepage SEO signals without storing raw HTML.
 * @param {string} html
 * @param {{ title?: string, description?: string }} meta
 */
export function extractHomepageSeo(html, meta = {}) {
  const $ = cheerio.load(html)
  const h1Elements = $('h1')
    .map((_, el) => normalizeWhitespace($(el).text()))
    .get()
    .filter(Boolean)

  const title = meta.title?.trim() || ''
  const description = meta.description?.trim() || ''

  return {
    h1Count: h1Elements.length,
    h1Texts: h1Elements
      .slice(0, MAX_H1_SAMPLES)
      .map((text) => text.slice(0, MAX_H1_TEXT_CHARS)),
    titleLength: title.length,
    descriptionLength: description.length,
  }
}

/**
 * Build SEO structured data summary for audit payload.
 * @param {string} html
 * @param {object|null} productsAudit
 */
export function buildStructuredDataSummary(html, productsAudit) {
  return summarizeStructuredData(html, productsAudit)
}
