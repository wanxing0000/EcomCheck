import { handleOptions, sendJson } from './_shared.js'
import { listReports } from '../services/reportStorage.js'

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

  try {
    const reports = await listReports()
    sendJson(res, 200, {
      success: true,
      data: reports,
    })
  } catch (err) {
    console.error('Failed to list reports:', err)
    sendJson(res, 500, {
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to list reports' },
    })
  }
}
