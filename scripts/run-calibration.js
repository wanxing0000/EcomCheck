import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { crawl } from '../services/crawler.js'
import { runRules } from '../rules/index.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'
import { getCalibrationFixture } from './calibration-fixtures.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CASES_PATH = join(__dirname, 'audit-calibration-cases.json')
const FOCUS_RULES = new Set(['G008', 'G010', 'M002', 'M003'])

const AUDIT_OPTIONS = {
  auditMode: 'gmc',
  modules: ['gmc', 'ads', 'technical', 'trust'],
  legacyEnabled: true,
}

const REPORT_CONTEXT = {
  mode: 'gmc',
  legacyEnabled: true,
  executedModules: ['gmc', 'ads', 'technical', 'trust'],
}

function parseScoreRange(rangeText) {
  const match = String(rangeText || '').match(/(\d+)\s*-\s*(\d+)/)
  if (!match) return { min: 0, max: 100 }
  return { min: Number(match[1]), max: Number(match[2]) }
}

function loadCases() {
  return JSON.parse(readFileSync(CASES_PATH, 'utf8'))
}

async function loadAuditData(testCase) {
  const fixture = getCalibrationFixture(testCase.url)
  if (fixture) return fixture

  console.log(`  Crawling ${testCase.url} ...`)
  return crawl(testCase.url, { timeout: 30000 })
}

function runAudit(auditData) {
  const ruleResults = runRules(auditData, AUDIT_OPTIONS)
  const report = buildProfessionalReport(ruleResults, [], REPORT_CONTEXT)
  return { ruleResults, report }
}

function getRuleResult(ruleResults, ruleId) {
  return ruleResults.find((rule) => rule.id === ruleId)
}

function getDetectedIssues(ruleResults, report) {
  const failed = ruleResults
    .filter((rule) => !rule.passed && FOCUS_RULES.has(rule.id))
    .map((rule) => ({
      id: rule.id,
      severity: rule.severity,
      message: rule.message,
      status: rule.status,
    }))

  const actions = (report.gmcReadiness?.complianceActions || [])
    .filter((action) => FOCUS_RULES.has(action.ruleId))
    .map((action) => ({
      id: action.ruleId,
      severity: action.severity,
      message: action.problem,
      status: 'action',
    }))

  const merged = new Map()
  for (const issue of [...failed, ...actions]) {
    merged.set(issue.id, issue)
  }
  return [...merged.values()]
}

function formatEvidence(rule) {
  const found = rule?.evidence?.found || []
  if (found.length > 0) {
    return found
      .slice(0, 3)
      .map((item) => `${item.text}${item.source ? ` (${item.source})` : ''}`)
      .join(' | ')
  }

  const signal =
    rule?.policyQuality?.signals?.paymentMethods ||
    rule?.policyQuality?.signals?.shippingCost
  if (signal?.evidence) return signal.evidence

  return rule?.message || '(no evidence captured)'
}

function analyzeCalibration(testCase, { ruleResults, report }) {
  const falsePositives = []
  const falseNegatives = []
  const score = report.gmcReadiness?.gmcRiskScore ?? report.scores?.gmc ?? report.scores?.compliance
  const approvalRisk = report.gmcReadiness?.approvalRisk?.level ?? 'unknown'
  const scoreRange = parseScoreRange(testCase.expectedScoreRange)
  const expectedRisk = testCase.expectedRisk

  const g008 = getRuleResult(ruleResults, 'G008')
  const g010 = getRuleResult(ruleResults, 'G010')
  const m002 = getRuleResult(ruleResults, 'M002')
  const m003 = getRuleResult(ruleResults, 'M003')

  const paymentSignal = g008?.policyQuality?.signals?.paymentMethods
  const shippingSignal = g010?.policyQuality?.signals?.shippingCost

  if (paymentSignal?.detected === 'found' && !g008?.policyQuality?.checks?.paymentMethods) {
    falsePositives.push({
      rule: 'G008',
      reason: 'Payment methods detected in page text but checks.paymentMethods is false',
      evidence: paymentSignal.evidence,
      whyWrong: 'Accepted payment methods are present in policy text and should not be flagged as missing.',
    })
  }

  if (
    paymentSignal?.detected === 'found' &&
    g008 &&
    !g008.passed &&
    (g008.message || '').toLowerCase().includes('payment methods')
  ) {
    falsePositives.push({
      rule: 'G008',
      reason: g008.message,
      evidence: formatEvidence(g008),
      whyWrong: 'Payment methods were detected with evidence, so G008 should not fail for missing payment methods.',
    })
  }

  if (
    paymentSignal?.detected === 'found' &&
    g008?.policyQuality?.checks?.paymentMethods &&
    g008 &&
    !g008.passed &&
    (g008.policyQuality?.missing || []).some((item) =>
      ['sufficient content length', 'currency or pricing terms'].includes(item)
    )
  ) {
    falsePositives.push({
      rule: 'G008',
      reason: g008.message,
      evidence: `${paymentSignal.evidence} | missing: ${(g008.policyQuality?.missing || []).join(', ')}`,
      whyWrong:
        'Payment methods (Visa/Mastercard/PayPal/Apple Pay/Google Pay) are clearly present; failing on page length or currency terms alone is a false alarm for payment-method coverage.',
    })
  }

  if (shippingSignal?.detected === 'found' && !g010?.policyQuality?.checks?.shippingCost) {
    falsePositives.push({
      rule: 'G010',
      reason: 'Shipping cost/free shipping detected in text but checks.shippingCost is false',
      evidence: shippingSignal.evidence,
      whyWrong: 'Free shipping or shipping cost language is present and should satisfy shipping cost checks.',
    })
  }

  if (
    shippingSignal?.detected === 'found' &&
    g010 &&
    (g010.policyQuality?.missing || []).includes('shipping costs')
  ) {
    falsePositives.push({
      rule: 'G010',
      reason: g010.message,
      evidence: shippingSignal.evidence,
      whyWrong: 'Shipping cost evidence exists but G010 still lists shipping costs as missing.',
    })
  }

  if (
    shippingSignal?.detected === 'found' &&
    g010?.policyQuality?.checks?.shippingCost &&
    g010 &&
    !g010.passed &&
    (g010.policyQuality?.missing || []).every((item) =>
      ['sufficient content length', 'shipping regions'].includes(item)
    )
  ) {
    falsePositives.push({
      rule: 'G010',
      reason: g010.message,
      evidence: `${shippingSignal.evidence} (${shippingSignal.type}) | missing: ${(g010.policyQuality?.missing || []).join(', ')}`,
      whyWrong:
        'Shipping cost type (free/flat/calculated) is correctly detected; failing only on minimum length or region wording is overly strict for shipping-cost coverage.',
    })
  }

  if (
    testCase.notes?.toLowerCase().includes('shipping included') &&
    shippingSignal?.detected !== 'found' &&
    ((g010 && !g010.passed) ||
      (g010?.policyQuality?.missing || []).includes('shipping costs'))
  ) {
    falsePositives.push({
      rule: 'G010',
      reason: g010.message,
      evidence: g010.policyQuality?.textSample || formatEvidence(g010),
      whyWrong:
        '"Shipping is included in the product price" should be recognized as shipping-cost coverage but policyIntelligence did not match it.',
    })
  }

  if (
    m002?.policyQualityReport?.averageScore >= 70 &&
    m002?.policyQualityReport?.lowestScore >= 60 &&
    !m002.passed &&
    (m002.misrepresentationLevel === 'high' || m002.severity === 'high')
  ) {
    falsePositives.push({
      rule: 'M002',
      reason: m002.message,
      evidence: `Average policy score ${m002.policyQualityReport.averageScore}/100`,
      whyWrong: 'Policy pages are substantive and should not be escalated to high severity.',
    })
  }

  if (
    m002?.policyQualityReport?.averageScore >= 75 &&
    !m002.passed &&
    (testCase.notes || '').toLowerCase().includes('m002')
  ) {
    falsePositives.push({
      rule: 'M002',
      reason: m002.message,
      evidence: `Average ${m002.policyQualityReport.averageScore}/100, outcome ${m002.policyQualityReport.outcome || 'unknown'}`,
      whyWrong:
        'Policies are substantive on average but M002 still fails — likely over-penalizing optimization-only gaps.',
    })
  }

  if (
    m003?.productTrustReport?.averageScore >= 70 &&
    m003?.productTrustReport?.scannedPages > 0 &&
    m003 &&
    !m003.passed
  ) {
    falsePositives.push({
      rule: 'M003',
      reason: m003.message,
      evidence: `Average product trust score ${m003.productTrustReport.averageScore}/100 across ${m003.productTrustReport.scannedPages} page(s)`,
      whyWrong: 'Score is at or above the M003 pass threshold (70) and should not be flagged.',
    })
  }

  if (testCase.url === 'fixture:payment-none') {
    if (g008?.passed || paymentSignal?.detected === 'found') {
      falseNegatives.push({
        rule: 'G008',
        reason: 'Expected missing payment methods on negative control case',
        evidence: formatEvidence(g008),
        whyWrong: 'No payment methods are present, so G008 should remain failed.',
      })
    }
  }

  if (score != null && (score < scoreRange.min || score > scoreRange.max)) {
    falsePositives.push({
      rule: 'SCORE',
      reason: `Score ${score} outside expected range ${testCase.expectedScoreRange}`,
      evidence: report.gmcReadiness?.approvalRisk?.summary || report.quickSummary,
      whyWrong: `Expected score within ${testCase.expectedScoreRange} for this calibration case.`,
    })
  }

  if (expectedRisk === 'low' && approvalRisk === 'high') {
    falsePositives.push({
      rule: 'APPROVAL_RISK',
      reason: `Approval risk ${approvalRisk} higher than expected ${expectedRisk}`,
      evidence: (report.gmcReadiness?.approvalRisk?.riskFactors || [])
        .slice(0, 3)
        .map((factor) => `${factor.id}:${factor.severity}`)
        .join(', '),
      whyWrong: 'Case notes indicate this site/fixture should be low approval risk.',
    })
  }

  if (expectedRisk === 'medium' && approvalRisk === 'low' && testCase.url === 'fixture:payment-none') {
    falseNegatives.push({
      rule: 'APPROVAL_RISK',
      reason: `Approval risk ${approvalRisk} lower than expected ${expectedRisk}`,
      evidence: report.gmcReadiness?.approvalRisk?.summary,
      whyWrong: 'Negative control should not appear fully ready for Merchant Center.',
    })
  }

  return {
    score,
    approvalRisk,
    detectedIssues: getDetectedIssues(ruleResults, report),
    falsePositives: dedupeFindings(falsePositives),
    falseNegatives: dedupeFindings(falseNegatives),
  }
}

function dedupeFindings(items) {
  const seen = new Set()
  return items.filter((item) => {
    const key = `${item.rule}|${item.reason}|${item.evidence}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function printCaseReport(testCase, result, error = null) {
  console.log('\n' + '='.repeat(72))
  console.log(`Case: ${testCase.name}`)
  console.log('='.repeat(72))

  if (error) {
    console.log('Website:', testCase.url)
    console.log('Score:', 'ERROR')
    console.log('Approval Risk:', 'ERROR')
    console.log('Detected Issues:', error.message)
    console.log('False Positives:', '(skipped due to error)')
    console.log('False Negatives:', '(skipped due to error)')
    return { ...result, error: error.message }
  }

  console.log('Website:', testCase.url)
  console.log('Score:', result.score ?? 'n/a')
  console.log('Approval Risk:', result.approvalRisk)
  console.log(
    'Detected Issues:',
    result.detectedIssues.length
      ? result.detectedIssues.map((issue) => `${issue.id} (${issue.severity})`).join(', ')
      : '(none)'
  )

  console.log('False Positives:', result.falsePositives.length)
  for (const item of result.falsePositives) {
    console.log(`  Rule: ${item.rule}`)
    console.log(`  Reason: ${item.reason}`)
    console.log(`  Evidence: ${item.evidence}`)
    console.log(`  Why wrong: ${item.whyWrong}`)
  }

  console.log('False Negatives:', result.falseNegatives.length)
  for (const item of result.falseNegatives) {
    console.log(`  Rule: ${item.rule}`)
    console.log(`  Reason: ${item.reason}`)
    console.log(`  Evidence: ${item.evidence}`)
    console.log(`  Why wrong: ${item.whyWrong}`)
  }

  return result
}

async function main() {
  const cases = loadCases()
  const summary = []

  console.log('Audit Accuracy Calibration Report')
  console.log(`Cases loaded: ${cases.length}`)
  console.log(`Focus rules: ${[...FOCUS_RULES].join(', ')}`)

  for (const testCase of cases) {
    try {
      const auditData = await loadAuditData(testCase)
      const auditResult = runAudit(auditData)
      const analysis = analyzeCalibration(testCase, auditResult)
      const caseReport = printCaseReport(testCase, analysis)
      summary.push({
        name: testCase.name,
        url: testCase.url,
        ...caseReport,
      })
    } catch (error) {
      const caseReport = printCaseReport(testCase, {}, error)
      summary.push({
        name: testCase.name,
        url: testCase.url,
        ...caseReport,
      })
    }
  }

  const totalFalsePositives = summary.reduce(
    (count, entry) => count + (entry.falsePositives?.length || 0),
    0
  )
  const totalFalseNegatives = summary.reduce(
    (count, entry) => count + (entry.falseNegatives?.length || 0),
    0
  )

  console.log('\n' + '='.repeat(72))
  console.log('Calibration Summary')
  console.log('='.repeat(72))
  console.log(`Cases run: ${summary.length}`)
  console.log(`Total false positives: ${totalFalsePositives}`)
  console.log(`Total false negatives: ${totalFalseNegatives}`)
  console.log(`Errors: ${summary.filter((entry) => entry.error).length}`)

  const reportPath = join(__dirname, 'calibration-report.json')
  writeFileSync(
    reportPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        focusRules: [...FOCUS_RULES],
        totals: {
          cases: summary.length,
          falsePositives: totalFalsePositives,
          falseNegatives: totalFalseNegatives,
          errors: summary.filter((entry) => entry.error).length,
        },
        cases: summary,
      },
      null,
      2
    )
  )

  console.log(`Report written: ${reportPath}`)
}

main().catch((error) => {
  console.error('Calibration runner failed:', error)
  process.exit(1)
})
