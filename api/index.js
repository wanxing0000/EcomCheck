import { sendJson, handleOptions } from './_shared.js'

/** GET /api — API root info (Vercel Serverless Function) */
export default function handler(req, res) {
  if (req.method === 'OPTIONS') {
    handleOptions(req, res)
    return
  }

  sendJson(res, 200, {
    service: 'ecomcheck-api',
    version: '0.3.4',
    endpoints: {
      health: 'GET /api/health',
      audit: 'POST /api/audit',
    },
  })
}
