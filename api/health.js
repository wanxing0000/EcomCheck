import { handleOptions, sendJson } from './_shared.js'

export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptions(req, res)
    return
  }

  if (req.method === 'GET') {
    sendJson(res, 200, {
      status: 'ok',
      service: 'ecomcheck-api',
      version: '0.3.4',
    })
    return
  }

  sendJson(res, 405, {
    success: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
  })
}
