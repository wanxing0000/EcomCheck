import { crawl } from '../services/crawler.js'
import { extractProductsFromHtml } from '../services/adsDetect.js'
import { runRules } from '../rules/index.js'
import { scoreAudit } from '../services/scorer.js'

const SITE = 'https://cosmichorrorshop.com'

const result = await crawl(SITE)
const ruleResults = runRules(result)
const { score, issues } = scoreAudit(ruleResults)
result.rules = ruleResults
result.score = score
result.issues = issues

console.log('=== HOMEPAGE ===')
console.log('URL:', result.url)
console.log('Platform:', result.platform?.name, `(${result.platform?.confidence})`)
console.log('Total links:', result.linksCount)
console.log('Internal links:', result.links?.internal)

// Count /product/ candidates from homepage HTML
const res = await fetch(SITE)
const html = await res.text()
const base = new URL(SITE)
const linkRegex = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi
const candidates = new Set()
let match
while ((match = linkRegex.exec(html)) !== null) {
  try {
    const abs = new URL(match[1].trim(), base)
    if (abs.hostname !== base.hostname) continue
    if (/\/product\/[^/?#]+/i.test(abs.pathname)) {
      candidates.add(abs.href)
    }
  } catch {
    // skip
  }
}

console.log('\n=== CANDIDATE DISCOVERY ===')
console.log('WooCommerce /product/ candidates on homepage:', candidates.size)
console.log('Actually scanned (max 5):', result.productsAudit?.scannedPages)
console.log('Sample URLs:', [...candidates].slice(0, 6))

console.log('\n=== PRODUCT SCHEMA (all scanned pages) ===')
for (const page of result.productsAudit?.productPages || []) {
  const pr = await fetch(page.url)
  const phtml = await pr.text()
  const products = extractProductsFromHtml(phtml)
  const p = products[0]

  console.log('\nURL:', page.url)
  if (!p) {
    console.log('  NO Product JSON-LD')
    continue
  }

  console.log('  name:', p.name)
  console.log('  required fields:')
  for (const f of ['name', 'image', 'price', 'availability']) {
    console.log(`    ${f}: ${p.fields[f] ? 'OK' : 'MISSING'}`)
  }
  console.log('  recommended fields:')
  for (const f of ['brand', 'sku', 'gtin', 'mpn']) {
    console.log(`    ${f}: ${p.fields[f] ? 'OK' : 'MISSING'}`)
  }
  console.log('  valid (required complete):', p.valid)
  console.log('  complete (all fields):', p.complete)
}

console.log('\n=== AGGREGATE ===')
console.log('detectedProducts:', result.productsAudit?.detectedProducts)
console.log('validProducts:', result.productsAudit?.validProducts)
console.log('missingFields:', result.productsAudit?.missingFields)

console.log('\n=== ALL RULES ===')
for (const r of result.rules || []) {
  console.log(`${r.id} [${r.category}] ${r.passed ? 'PASS' : 'FAIL'}: ${r.message}`)
}

console.log('\nScore:', result.score)
console.log('Failed rules:', result.issues?.map((i) => i.id).join(', ') || 'none')
