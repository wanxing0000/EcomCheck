import { crawl } from '../services/crawler.js'
import { businessIdentityRule } from '../modules/trust/rules/M001-business-identity.js'

const url = process.argv[2] || 'https://narlasfableandfurcandles.co.uk'

console.log('Diagnosing M001 address detection for:', url)
const auditData = await crawl(url, { timeout: 25000 })
const result = businessIdentityRule.check(auditData)
const debug = result.trustDetails?.addressDebug

console.log('\n=== Data sources available to M001 ===')
console.log(JSON.stringify(debug?.dataSources, null, 2))

console.log('\n=== Pages detected (auditData.pages + pageContent) ===')
for (const page of debug?.pages || []) {
  console.log(
    `- ${page.pageKey}: found=${page.found} fetched=${page.fetched} url=${page.url}\n` +
      `  bodyText=${page.bodyTextLength} chars footerText=${page.footerTextLength} chars\n` +
      `  bodyKeywords=${JSON.stringify(page.bodyKeywords)} footerKeywords=${JSON.stringify(page.footerKeywords)}`
  )
}

console.log('\n=== Text passed to address detector ===')
for (const input of debug?.detectorInputs || []) {
  console.log(
    `- ${input.source}: ${input.textLength} chars, keywords=${JSON.stringify(input.keywords)}`
  )
}

console.log('\n=== M001 result ===')
console.log('address signal:', result.trustDetails?.signals?.address)
console.log('addressEvidence:', result.trustDetails?.addressEvidence)

if (!result.trustDetails?.signals?.address) {
  console.log('\n=== address=false debug ===')
  console.log(JSON.stringify({
    addressDetected: false,
    searchedPages: debug?.searchedPages,
    textSample: debug?.textSample,
  }, null, 2))
}
