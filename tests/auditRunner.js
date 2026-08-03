import { readFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const API_BASE = (
  process.env.AUDITPILOT_API_URL ||
  process.env.ECOMCHECK_API_URL ||
  'http://localhost:3000'
).replace(/\/$/, '')
const AUDIT_TIMEOUT_MS = Number(
  process.env.AUDITPILOT_AUDIT_TIMEOUT_MS ||
    process.env.ECOMCHECK_AUDIT_TIMEOUT_MS ||
    180_000
)

const sites = JSON.parse(readFileSync(join(__dirname, 'sites.json'), 'utf8'))

function capitalize(value) {
  if (!value) return 'Unknown'
  const labels = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    wordpress: 'WordPress',
  }
  return labels[value.toLowerCase()] || value.charAt(0).toUpperCase() + value.slice(1)
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), options.timeout ?? 30_000)

  try {
    const res = await fetch(url, { ...options, signal: controller.signal })
    const body = await res.json().catch(() => ({}))
    return { ok: res.ok, status: res.status, body }
  } finally {
    clearTimeout(timer)
  }
}

async function checkApiHealth() {
  const { ok, body } = await fetchJson(`${API_BASE}/api/health`)
  if (!ok || body.status !== 'ok') {
    throw new Error(`API health check failed at ${API_BASE}/api/health`)
  }
}

async function runAudit(url, retries = 1) {
  let lastError

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const { ok, status, body } = await fetchJson(`${API_BASE}/api/audit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
        timeout: AUDIT_TIMEOUT_MS,
      })

      if (!ok || !body.success) {
        const message = body.error?.message || `HTTP ${status}`
        throw new Error(message)
      }

      return body.data
    } catch (err) {
      lastError = err
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
    }
  }

  throw lastError
}

function getRule(data, id) {
  return data.rules?.find((rule) => rule.id === id)
}

function evaluateSite(site, data) {
  const checks = []
  const expect = site.expect || {}

  const platformActual = data.platform?.name || null
  const platformPass = platformActual === site.platform
  checks.push({
    key: 'platform',
    label: 'Platform',
    pass: platformPass,
    detail: capitalize(platformActual),
    expected: capitalize(site.platform),
  })

  const scannedPages = data.productsAudit?.scannedPages ?? 0
  const minScanned = expect.minScanned ?? 1
  checks.push({
    key: 'productScan',
    label: 'Product Scan',
    pass: scannedPages >= minScanned,
    detail: `${scannedPages} page(s) scanned`,
    expected: `>= ${minScanned}`,
  })

  const gmcReady =
    typeof data.gmc?.score === 'number' &&
    Array.isArray(data.gmc?.rules) &&
    data.gmc.rules.length > 0
  checks.push({
    key: 'gmcModule',
    label: 'GMC Module',
    pass: gmcReady,
    detail: gmcReady ? `score ${data.gmc.score}` : 'missing GMC data',
    expected: 'score + rules',
  })

  const reportReady = Boolean(data.report?.quickSummary && data.report?.scores)
  checks.push({
    key: 'report',
    label: 'Report',
    pass: reportReady,
    detail: reportReady ? 'generated' : 'missing report payload',
    expected: 'quickSummary + scores',
  })

  if (typeof expect.gmc === 'boolean') {
    const highIssues = (data.gmc?.issues || []).filter((issue) => issue.severity === 'high')
    const gmcPass = highIssues.length === 0
    checks.push({
      key: 'gmc',
      label: 'GMC',
      pass: gmcPass === expect.gmc,
      detail: gmcPass ? 'PASS' : 'FAIL',
      expected: expect.gmc ? 'PASS' : 'FAIL',
    })
  }

  if (typeof expect.productSchema === 'boolean') {
    const a003 = getRule(data, 'A003')
    const schemaPass = a003?.passed === true
    checks.push({
      key: 'productSchema',
      label: 'Product Schema',
      pass: schemaPass === expect.productSchema,
      detail: schemaPass ? 'PASS' : 'FAIL',
      expected: expect.productSchema ? 'PASS' : 'FAIL',
    })
  }

  if (typeof expect.refundPolicy === 'boolean') {
    const refundFound = data.pages?.refundPolicy?.found === true
    checks.push({
      key: 'refundPolicy',
      label: 'Refund Policy',
      pass: refundFound === expect.refundPolicy,
      detail: refundFound ? 'found' : 'missing',
      expected: expect.refundPolicy ? 'found' : 'missing',
    })
  }

  const failed = checks.filter((check) => !check.pass)
  return { checks, failed, pass: failed.length === 0 }
}

function printSiteResult(site, result, error) {
  if (error) {
    console.log(`✗ ${site.name}`)
    console.log(`  error: ${error.message}`)
    return
  }

  const icon = result.pass ? '✓' : '✗'
  console.log(`${icon} ${site.name}`)

  const platformCheck = result.checks.find((check) => check.key === 'platform')
  if (platformCheck) {
    console.log(`  platform: ${platformCheck.detail}`)
  }

  for (const key of ['gmc', 'productSchema', 'refundPolicy']) {
    const check = result.checks.find((item) => item.key === key)
    if (check) {
      console.log(`  ${check.label}: ${check.detail}`)
    }
  }

  if (!result.pass) {
    for (const check of result.failed) {
      if (['gmc', 'productSchema', 'refundPolicy', 'platform'].includes(check.key)) continue
      console.log(`  ${check.label}: expected ${check.expected}, got ${check.detail}`)
    }
    for (const check of result.failed.filter((item) =>
      ['gmc', 'productSchema', 'refundPolicy', 'platform'].includes(item.key)
    )) {
      console.log(`  regression: ${check.label} expected ${check.expected}, got ${check.detail}`)
    }
  }
}

async function main() {
  console.log('================================')
  console.log('')
  console.log('AuditPilot Regression Test')
  console.log('')

  let passed = 0
  let failed = 0

  try {
    await checkApiHealth()
  } catch (err) {
    console.log(`✗ API health check failed: ${err.message}`)
    console.log('')
    console.log('Start the API first: npm run dev:api')
    process.exit(1)
  }

  for (const site of sites) {
    try {
      const data = await runAudit(site.url)
      const result = evaluateSite(site, data)
      printSiteResult(site, result)
      if (result.pass) passed += 1
      else failed += 1
    } catch (err) {
      printSiteResult(site, null, err)
      failed += 1
    }
    console.log('')
  }

  console.log('Result:')
  console.log(`${passed} passed`)
  console.log(`${failed} failed`)
  console.log('')
  console.log('================================')

  process.exit(failed > 0 ? 1 : 0)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
