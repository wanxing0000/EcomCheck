import { writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { getIndexableRoutes, getSiteBaseUrl } from '../src/data/seoPages.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '../public')
const baseUrl = getSiteBaseUrl()

const routes = getIndexableRoutes()
const lastmod = new Date().toISOString().slice(0, 10)

const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (route) => `  <url>
    <loc>${baseUrl}${route.path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${route.changefreq || 'monthly'}</changefreq>
    <priority>${route.priority || '0.5'}</priority>
  </url>`,
  )
  .join('\n')}
</urlset>
`

const robotsTxt = `# EcomCheck — allow indexable marketing pages; block transactional views
User-agent: *
Allow: /

Disallow: /scan
Disallow: /report

Sitemap: ${baseUrl}/sitemap.xml
`

writeFileSync(join(publicDir, 'sitemap.xml'), sitemapXml, 'utf8')
writeFileSync(join(publicDir, 'robots.txt'), robotsTxt, 'utf8')

console.log(`Generated sitemap.xml and robots.txt for ${baseUrl} (${routes.length} URLs)`)
