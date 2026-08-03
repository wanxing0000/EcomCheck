/**
 * Local development server for API routes.
 * Run: npm run dev:api
 *
 * Loads root .env via dotenv/config (local dev only — not used on Vercel).
 */
import './bootstrap-env.js'
import 'dotenv/config'
import { createServer } from 'http'
import healthHandler from '../api/health.js'
import auditHandler from '../api/audit.js'
import usageHandler from '../api/usage.js'
import reportsHandler from '../api/reports.js'
import reportsMineHandler from '../api/reports/mine.js'
import reportsSaveHandler from '../api/reports/save.js'
import reportByIdHandler from '../api/reports/[id].js'
import { sendJson } from '../api/_shared.js'

const PORT = process.env.PORT || 3000

const server = createServer(async (req, res) => {
  const { method, url } = req

  if (method === 'GET' && url === '/api/health') {
    healthHandler(req, res)
    return
  }

  if (method === 'POST' && url === '/api/audit') {
    await auditHandler(req, res)
    return
  }

  if (method === 'GET' && url.startsWith('/api/usage')) {
    await usageHandler(req, res)
    return
  }

  if (method === 'POST' && url === '/api/reports/save') {
    await reportsSaveHandler(req, res)
    return
  }

  if (method === 'GET' && url === '/api/reports/mine') {
    await reportsMineHandler(req, res)
    return
  }

  if (method === 'GET' && url === '/api/reports') {
    await reportsHandler(req, res)
    return
  }

  const reportMatch = url.match(/^\/api\/reports\/([^/?#]+)$/)
  if (method === 'GET' && reportMatch) {
    req.query = { id: reportMatch[1] }
    await reportByIdHandler(req, res)
    return
  }

  sendJson(res, 404, {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Not found' },
  })
})

server.listen(PORT, () => {
  console.log(`AuditPilot API running at http://localhost:${PORT}`)
  console.log(`  GET  /api/health`)
  console.log(`  POST /api/audit`)
  console.log(`  GET  /api/usage`)
  console.log(`  POST /api/reports/save`)
  console.log(`  GET  /api/reports/mine`)
  console.log(`  GET  /api/reports`)
  console.log(`  GET  /api/reports/:id`)
})
