import { sendJson, handleOptions } from './_shared.js'
import { getUsageStatus, resolveClientId } from '../services/usageLimit.js'

/** GET /api/usage?mode=gmc&clientId=... */
export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptions(req, res)
    return
  }

  if (req.method !== 'GET') {
    sendJson(res, 405, {
      success: false,
      error: { code: 'METHOD_NOT_ALLOWED', message: 'GET only' },
    })
    return
  }

  const url = new URL(req.url || '/', 'http://localhost')
  const mode = url.searchParams.get('mode') || 'gmc'
  const clientId = url.searchParams.get('clientId') || resolveClientId(req, {})

  try {
    const status = await getUsageStatus(clientId, mode)
    sendJson(res, 200, {
      success: true,
      data: status,
    })
  } catch (err) {
    console.error('Usage status error:', err.message || err)
    sendJson(res, 500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to load usage status' },
    })
  }
}
