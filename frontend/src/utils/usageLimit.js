import { GMC_DAILY_FREE_LIMIT } from '../data/gmcProduct.js'

const CLIENT_ID_KEY = 'ecomcheck_client_id'

export function getOrCreateClientId() {
  if (typeof window === 'undefined') return 'anonymous'

  let id = localStorage.getItem(CLIENT_ID_KEY)
  if (!id) {
    id = `ec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
    localStorage.setItem(CLIENT_ID_KEY, id)
  }
  return id
}

export function getDefaultGmcUsage() {
  return {
    unlimited: false,
    dailyLimit: GMC_DAILY_FREE_LIMIT,
    used: 0,
    remaining: GMC_DAILY_FREE_LIMIT,
    allowed: true,
  }
}

export async function fetchUsageStatus(mode = 'gmc') {
  const clientId = getOrCreateClientId()

  try {
    const res = await fetch(`/api/usage?mode=${encodeURIComponent(mode)}&clientId=${encodeURIComponent(clientId)}`)
    const json = await res.json()
    if (json.success && json.data) return json.data
  } catch {
    // Fall back to local default when API unavailable
  }

  return { ...getDefaultGmcUsage(), clientId, mode }
}

export function formatUsageLabel(usage) {
  if (!usage) return `${GMC_DAILY_FREE_LIMIT} free scans per day`
  if (usage.unlimited) return 'Unlimited scans'
  const remaining = usage.remaining ?? GMC_DAILY_FREE_LIMIT
  const limit = usage.dailyLimit ?? GMC_DAILY_FREE_LIMIT
  return `${remaining} of ${limit} free scans left today`
}
