const STORAGE_KEY = 'auditpilot_pending_guest_report'
const MAX_AGE_MS = 24 * 60 * 60 * 1000

export function storePendingGuestReport({ url, crawlResult }) {
  if (!crawlResult || typeof sessionStorage === 'undefined') return

  sessionStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      url: url || crawlResult.url || null,
      crawlResult,
      storedAt: Date.now(),
    })
  )
}

export function getPendingGuestReport() {
  if (typeof sessionStorage === 'undefined') return null

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    if (!parsed?.crawlResult) return null

    if (parsed.storedAt && Date.now() - parsed.storedAt > MAX_AGE_MS) {
      clearPendingGuestReport()
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function clearPendingGuestReport() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(STORAGE_KEY)
}

export async function claimPendingGuestReport(accessToken) {
  const pending = getPendingGuestReport()
  if (!pending?.crawlResult || !accessToken) return null

  const res = await fetch('/api/reports/save', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      url: pending.url,
      auditData: pending.crawlResult,
    }),
  })

  const json = await res.json()
  if (!res.ok || !json.success) {
    throw new Error(json.error?.message || 'Failed to save report')
  }

  clearPendingGuestReport()
  return json.data
}
