import { handleOptions, readJsonBody, sendJson } from '../_shared.js'
import { resolveUserFromRequest } from '../../services/auth.js'
import { recordAuditUsage } from '../../services/auditUsage.js'
import { saveReport } from '../../services/reportStorage.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptions(req, res)
    return
  }

  if (req.method !== 'POST') {
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

  const { url, auditData } = body

  if (!auditData || typeof auditData !== 'object') {
    sendJson(res, 400, {
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'auditData is required' },
    })
    return
  }

  const reportUrl = url || auditData.url
  if (!reportUrl) {
    sendJson(res, 400, {
      success: false,
      error: { code: 'INVALID_REQUEST', message: 'url is required' },
    })
    return
  }

  const auditMode = auditData.auditMode || auditData.auditPlan?.mode || 'gmc'

  try {
    const saved = await saveReport(reportUrl, auditData, {
      userId: user.id,
      auditMode,
    })

    try {
      await recordAuditUsage(user.id, auditMode)
    } catch (err) {
      console.error('Usage record error:', err.message || err)
    }

    sendJson(res, 200, {
      success: true,
      data: saved,
    })
  } catch (err) {
    console.error('Failed to save report:', err)
    sendJson(res, 500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to save report' },
    })
  }
}
