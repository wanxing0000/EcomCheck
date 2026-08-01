import { crawl } from '../services/crawler.js'

const sites = [
  'https://cosmichorrorshop.com',
  'https://narlasfableandfurcandles.co.uk',
  'https://foundersparts.com',
  'https://bshivedesign.co.uk',
]

for (const url of sites) {
  console.log('\n' + '='.repeat(60))
  console.log(url)
  try {
    const r = await crawl(url, { timeout: 25000 })
    console.log('platform:', r.platform?.name)
    console.log('pages:', Object.fromEntries(
      Object.entries(r.pages).map(([k, v]) => [k, v.found ? v.url : false])
    ))
    console.log('contactInfo:', {
      emails: r.contactInfo.emails,
      phones: r.contactInfo.phones,
      addresses: r.contactInfo.addresses?.slice(0, 2),
      sources: r.contactInfo.sources?.length,
    })
    console.log('policyCandidates:', r.policyCandidates?.slice(0, 4).map((p) => `${p.type}:${p.text?.slice(0, 30)}`))
    console.log('products:', {
      candidates: r.productsAudit?.candidateCount,
      scanned: r.productsAudit?.scannedPages,
      withSchema: r.productsAudit?.summary?.withSchema,
    })
    if (r.productsAudit?.productPages?.[0]) {
      const p = r.productsAudit.productPages[0]
      console.log('sample product:', p.url?.slice(0, 60), p.pricing?.display, p.signals)
    }
  } catch (err) {
    console.log('ERROR:', err.message)
  }
}
