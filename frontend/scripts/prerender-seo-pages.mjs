import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'
import { getPrerenderRoutes } from '../src/data/seoPages.js'
import { buildHeadInjection, buildPageMeta } from '../src/prerender/resolvePageMeta.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const frontendDir = join(__dirname, '..')
const distDir = join(frontendDir, 'dist')
const serverEntry = join(distDir, 'server', 'entry-server.js')

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function stripDefaultSeoMeta(html) {
  return html
    .replace(/<meta name="description"[^>]*>\s*/g, '')
    .replace(/<meta name="robots"[^>]*>\s*/g, '')
    .replace(/<link rel="canonical"[^>]*>\s*/g, '')
    .replace(/<meta property="og:[^"]+"[^>]*>\s*/g, '')
    .replace(/<meta name="twitter:[^"]+"[^>]*>\s*/g, '')
}

function assembleHtml(template, bodyHtml, meta) {
  let html = stripDefaultSeoMeta(template)

  html = html.replace(/<title>[^<]*<\/title>/, `<title>${escapeHtml(meta.title)}</title>`)

  const headInjection = buildHeadInjection(meta)
  if (headInjection) {
    html = html.replace('</head>', `    ${headInjection}\n  </head>`)
  }

  html = html.replace(/<div id="root"><\/div>/, `<div id="root">${bodyHtml}</div>`)

  return html
}

function outputPathForRoute(routePath) {
  if (routePath === '/') {
    return join(distDir, 'index.html')
  }

  const segments = routePath.replace(/^\//, '').split('/')
  return join(distDir, ...segments, 'index.html')
}

async function main() {
  const template = readFileSync(join(distDir, 'index.html'), 'utf8')
  const { renderPage } = await import(pathToFileURL(serverEntry).href)
  const routes = getPrerenderRoutes()

  let success = 0

  for (const route of routes) {
    const meta = buildPageMeta(route.path)
    if (!meta) {
      console.warn(`Skip prerender (no meta): ${route.path}`)
      continue
    }

    const bodyHtml = renderPage(route.path)
    if (!bodyHtml.includes('<h1')) {
      console.warn(`Warning: no h1 in prerender output for ${route.path}`)
    }

    const html = assembleHtml(template, bodyHtml, meta)
    const outFile = outputPathForRoute(route.path)
    mkdirSync(dirname(outFile), { recursive: true })
    writeFileSync(outFile, html, 'utf8')
    console.log(`Prerendered ${route.path} -> ${outFile.replace(distDir, 'dist')}`)
    success += 1
  }

  console.log(`Prerender complete: ${success}/${routes.length} SEO pages`)
}

main().catch((err) => {
  console.error('Prerender failed:', err)
  process.exit(1)
})
