import { handleAudit, handleOptions, sendJson } from './_shared.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptions(req, res)
    return
  }

  if (req.method === 'POST') {
    await handleAudit(req, res)
    return
  }

  sendJson(res, 405, {
    success: false,
    error: { code: 'METHOD_NOT_ALLOWED', message: 'Method not allowed' },
  })
}
