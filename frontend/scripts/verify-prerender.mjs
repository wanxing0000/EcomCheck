import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { getPrerenderRoutes } from '../src/data/seoPages.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const distDir = join(__dirname, '../dist')

const checks = {
  '/audit/gmc': 'GMC Compliance Audit',
  '/audit/shopify-gmc': 'Shopify Google Merchant Center Audit',
  '/guides/google-merchant-center-requirements': 'Google Merchant Center Requirements Checklist',
}

for (const route of getPrerenderRoutes()) {
  const file =
    route.path === '/'
      ? join(distDir, 'index.html')
      : join(distDir, ...route.path.slice(1).split('/'), 'index.html')
  const html = readFileSync(file, 'utf8')
  const rootMatch = html.match(/<div id="root">([\s\S]*)<\/div>\s*<script/)
  const root = rootMatch?.[1] || ''
  const hasH1 = root.includes('<h1')
  const marker = checks[route.path]
  const hasMarker = marker ? root.includes(marker) : true
  console.log(`${route.path}: root=${root.length} chars, h1=${hasH1}, marker=${hasMarker}`)
}
