import { handleOptions, sendJson } from '../_shared.js'
import { resolveUserFromRequest } from '../../services/auth.js'
import {
  buildHistorySummary,
  buildLatestReportComparison,
  compareSavedReportRecords,
  enrichReportHistory,
  reportBelongsToUser,
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

  const currentId = req.query?.currentId || req.query?.current
  const previousId = req.query?.previousId || req.query?.previous

  try {
    const summaries = await listReportsByUser(user.id)

    let currentRecord = null
    let previousRecord = null

    if (currentId && previousId) {
      ;[currentRecord, previousRecord] = await Promise.all([
        getReport(currentId),
        getReport(previousId),
      ])

      if (
        !reportBelongsToUser(currentRecord, user.id) ||
        !reportBelongsToUser(previousRecord, user.id)
      ) {
        sendJson(res, 403, {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You do not have access to these reports' },
        })
        return
      }
    } else {
      const comparison = await buildLatestReportComparison(summaries, getReport)
      if (comparison) {
        sendJson(res, 200, {
          success: true,
          data: { comparison },
        })
        return
      }

      sendJson(res, 200, {
        success: true,
        data: { comparison: null },
      })
      return
    }

    if (!currentRecord || !previousRecord) {
      sendJson(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report not found' },
      })
      return
    }

    const comparison = compareSavedReportRecords(currentRecord, previousRecord)

    sendJson(res, 200, {
      success: true,
      data: { comparison },
    })
  } catch (err) {
    console.error('Failed to compare reports:', err)
    sendJson(res, 500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to compare reports' },
    })
  }
}
