import { createServer } from 'http'
import { crawl, CrawlerError, CrawlerErrorCode } from '../services/crawler.js'
import { runRules } from '../rules/index.js'
import { scoreAudit } from '../services/scorer.js'

const PORT = process.env.PORT || 3000

const ERROR_STATUS = {
  [CrawlerErrorCode.INVALID_URL]: 400,
  [CrawlerErrorCode.TIMEOUT]: 408,
  [CrawlerErrorCode.UNREACHABLE]: 502,
}

function sendJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  })
  res.end(JSON.stringify(body))
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let data = ''
    req.on('data', (chunk) => {
      data += chunk
      if (data.length > 1_048_576) {
        reject(new Error('Request body too large'))
        req.destroy()
      }
    })
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {})
      } catch {
        reject(new Error('Invalid JSON body'))
      }
    })
    req.on('error', reject)
  })
}

async function handleAudit(req, res) {
  let body
  try {
    body = await readJsonBody(req)
  } catch (err) {
    sendJson(res, 400, {
      success: false,
      error: { code: 'INVALID_REQUEST', message: err.message },
    })
    return
  }

  const { url } = body

  if (!url) {
    sendJson(res, 400, {
      success: false,
      error: { code: CrawlerErrorCode.INVALID_URL, message: 'URL is required' },
    })
    return
  }

  try {
    const crawlResult = await crawl(url)
    const ruleResults = runRules(crawlResult)
    const { score, issues, recommendations, summary } = scoreAudit(ruleResults)

    sendJson(res, 200, {
      success: true,
      data: {
        ...crawlResult,
        score,
        issues,
        recommendations,
        rules: ruleResults,
        summary,
      },
    })
  } catch (err) {
    if (err instanceof CrawlerError) {
      sendJson(res, ERROR_STATUS[err.code] || 500, {
        success: false,
        error: { code: err.code, message: err.message },
      })
      return
    }

    console.error('Unexpected audit error:', err)
    sendJson(res, 500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    })
  }
}

const server = createServer(async (req, res) => {
  const { method, url } = req

  if (method === 'OPTIONS') {
    sendJson(res, 204, {})
    return
  }

  if (method === 'GET' && url === '/api/health') {
    sendJson(res, 200, { status: 'ok', service: 'ecomcheck-api', version: '0.3.2' })
    return
  }

  if (method === 'POST' && url === '/api/audit') {
    await handleAudit(req, res)
    return
  }

  sendJson(res, 404, {
    success: false,
    error: { code: 'NOT_FOUND', message: 'Not found' },
  })
})

server.listen(PORT, () => {
  console.log(`EcomCheck API running at http://localhost:${PORT}`)
  console.log(`  GET  /api/health`)
  console.log(`  POST /api/audit`)
})
