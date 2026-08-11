import { handleAudit, handleOptions, sendJson } from './_shared.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptions(req, res)
    return
  }

  if (req.method === 'POST') {
    try {
      await handleAudit(req, res)
    } catch (err) {
      console.error('Unhandled audit handler error:', err)
      if (!res.headersSent) {
        sendJson(res, 500, {
          success: false,
          error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
        })
      }
    }
    return
  }

  sendJson(res, 405, {
    success: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
  })
}
