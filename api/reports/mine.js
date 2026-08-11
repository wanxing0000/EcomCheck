import { handleOptions, sendJson } from '../_shared.js'
import { resolveUserFromRequest } from '../../services/auth.js'
import { countUsageByUser } from '../../services/auditUsage.js'
import {
  buildHistorySummary,
  buildLatestReportComparison,
  enrichReportHistory,
} from '../../services/auditHistoryIntelligence.js'
import { getReport, listReportsByUser } from '../../services/reportStorage.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptions(req, res)
    return
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, {
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
    })
    return
  }

  const user = await resolveUserFromRequest(req)
  if (!user) {
    sendJson(res, 401, {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Login required' },
    })
    return
  }

  try {
    const [reports, usage] = await Promise.all([
      listReportsByUser(user.id),
      countUsageByUser(user.id),
    ])

    const enrichedReports = enrichReportHistory(reports)
    const historySummary = buildHistorySummary(reports)
    const latestComparison = await buildLatestReportComparison(reports, getReport)

    sendJson(res, 200, {
      success: true,
      data: {
        user: { id: user.id, email: user.email },
        reports: enrichedReports,
        stats: {
          totalAudits: usage.total,
          gmcAudits: usage.gmc,
          seoAudits: usage.seo,
          savedReports: reports.length,
        },
        historySummary,
        latestComparison,
      },
    })
  } catch (err) {
    console.error('Failed to list user reports:', err)
    sendJson(res, 500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load reports' },
    })
  }
}
