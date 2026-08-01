import { crawl, CrawlerError, CrawlerErrorCode } from '../services/crawler.js'
import { runRules } from '../rules/index.js'
import { scoreAudit, scoreCategory } from '../services/scorer.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'

function buildGmcRiskDetails(gmcRules) {
  const byId = Object.fromEntries(gmcRules.map((rule) => [rule.id, rule]))

  return {
    returnPolicy: byId.G003?.policyQuality ?? null,
    priceConsistency: byId.G006?.priceRisks ?? null,
    businessInformation: byId.G007?.businessInfo ?? null,
  }
}

export const ERROR_STATUS = {
  [CrawlerErrorCode.INVALID_URL]: 400,
  [CrawlerErrorCode.TIMEOUT]: 408,
  [CrawlerErrorCode.UNREACHABLE]: 502,
}

export function sendJson(res, statusCode, body) {
  res.statusCode = statusCode
  res.setHeader('Content-Type', 'application/json')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.end(JSON.stringify(body))
}

export function readJsonBody(req) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return Promise.resolve(req.body)
    if (typeof req.body === 'string') {
      try {
        return Promise.resolve(req.body ? JSON.parse(req.body) : {})
      } catch {
        return Promise.reject(new Error('Invalid JSON body'))
      }
    }
  }

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

export async function handleAudit(req, res) {
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
    const gmc = scoreCategory(ruleResults, 'gmc')
    const gmcRules = ruleResults.filter((rule) => rule.category === 'gmc')
    const riskDetails = buildGmcRiskDetails(gmcRules)

    const g006Warnings = (riskDetails.priceConsistency?.pageWarnings || []).map((warn) => ({
      id: 'G006',
      name: 'Product Price Consistency',
      category: 'gmc',
      severity: 'warning',
      message: warn.message,
    }))

    const mergedGmcWarnings = [...gmc.warnings, ...g006Warnings]
    const report = buildProfessionalReport(ruleResults, g006Warnings)

    sendJson(res, 200, {
      success: true,
      data: {
        ...crawlResult,
        score,
        issues,
        recommendations,
        rules: ruleResults,
        summary,
        report,
        gmc: {
          score: gmc.score,
          issues: gmc.issues,
          warnings: mergedGmcWarnings,
          recommendations: gmc.recommendations,
          summary: {
            ...gmc.summary,
            warnings: mergedGmcWarnings.length,
          },
          passedRules: gmc.passedRules,
          rules: gmc.rules,
          riskDetails,
        },
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

export function handleOptions(req, res) {
  sendJson(res, 204, {})
}
