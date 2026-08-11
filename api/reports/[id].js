import { handleOptions, sendJson } from '../_shared.js'
import { resolveUserFromRequest } from '../../services/auth.js'
import { getReport } from '../../services/reportStorage.js'

/**
 * User-owned reports require a matching JWT. Legacy rows without userId remain public.
 */
export function canAccessReport(report, user) {
  if (!report?.userId) return true
  return Boolean(user && user.id === report.userId)
}

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

  const id = req.query?.id

  try {
    const report = await getReport(id)

    if (!report) {
      sendJson(res, 404, {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Report not found' },
      })
      return
    }

    const user = await resolveUserFromRequest(req)
    if (!canAccessReport(report, user)) {
      sendJson(res, 403, {
        success: false,
        error: { code: 'FORBIDDEN', message: 'You do not have access to this report' },
      })
      return
    }

    sendJson(res, 200, {
      success: true,
      data: report,
    })
  } catch (err) {
    console.error('Failed to load report:', err)
    sendJson(res, 500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load report' },
    })
  }
}
