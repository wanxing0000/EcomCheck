import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runRules } from '../rules/index.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'
import {
  applyFixSimulation,
  getImpactCalibrationFixture,
} from './impact-calibration-fixtures.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CASES_PATH = join(__dirname, 'impact-calibration-cases.json')
const REPORT_PATH = join(__dirname, 'impact-calibration-report.json')

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

function loadCases() {
  return JSON.parse(readFileSync(CASES_PATH, 'utf8'))
}

function runAudit(auditData) {
  const ruleResults = runRules(auditData, AUDIT_OPTIONS)
  const report = buildProfessionalReport(ruleResults, [], REPORT_CONTEXT)
  return {
    ruleResults,
    report,
    gmcRiskScore: report.gmcReadiness?.gmcRiskScore ?? null,
    approvalRisk: report.gmcReadiness?.approvalRisk?.level ?? 'unknown',
    fixGuides: report.gmcReadiness?.fixGuides || [],
    complianceActions: report.gmcReadiness?.complianceActions || [],
  }
}

function summarizeFixGuides(fixGuides) {
  return fixGuides.map((guide) => ({
    ruleId: guide.ruleId,
    title: guide.title,
    missing: guide.missing || [],
    impactPrediction: guide.impactPrediction || null,
  }))
}

function classifyAccuracy(predictedGain, actualChange) {
  if (predictedGain == null || actualChange == null) {
    return { accuracy: 'unknown', confidence: 'low' }
  }

  const { min, max } = predictedGain
  if (actualChange >= min && actualChange <= max) {
    return { accuracy: 'in_range', confidence: 'high' }
  }

  const midpoint = (min + max) / 2
  const diff = Math.abs(actualChange - midpoint)

  if (actualChange < min) {
    return {
      accuracy: 'over_predicted',
      confidence: diff <= 5 ? 'medium' : 'low',
    }
  }

  if (actualChange > max) {
    return {
      accuracy: 'under_predicted',
      confidence: diff <= 5 ? 'medium' : 'low',
    }
  }

  return { accuracy: 'close', confidence: diff <= 3 ? 'medium' : 'low' }
}

function classifyRiskAccuracy(predictedBefore, predictedAfter, actualBefore, actualAfter) {
  if (!predictedBefore || !predictedAfter || !actualBefore || !actualAfter) {
    return { riskAccuracy: 'unknown' }
  }

  const predictedChanged = predictedBefore !== predictedAfter
  const actualChanged = actualBefore !== actualAfter

  if (predictedChanged === actualChanged) {
    if (!predictedChanged) return { riskAccuracy: 'unchanged_correct' }
    if (predictedAfter === actualAfter) return { riskAccuracy: 'exact_match' }
    return { riskAccuracy: 'direction_match' }
  }

  if (predictedChanged && !actualChanged) return { riskAccuracy: 'risk_over_predicted' }
  return { riskAccuracy: 'risk_under_predicted' }
}

function comparePrediction(guide, beforeAudit, afterAudit) {
  const prediction = guide.impactPrediction
  const predictedGain = prediction?.estimatedScoreGain || null
  const actualChange =
    beforeAudit.gmcRiskScore != null && afterAudit.gmcRiskScore != null
      ? afterAudit.gmcRiskScore - beforeAudit.gmcRiskScore
      : null
  const baselineDistorted = (beforeAudit.gmcRiskScore ?? 100) < 25

  const { accuracy, confidence } = classifyAccuracy(predictedGain, actualChange)
  const riskCheck = classifyRiskAccuracy(
    prediction?.riskBefore,
    prediction?.riskAfter,
    beforeAudit.approvalRisk,
    afterAudit.approvalRisk
  )

  let adjustedAccuracy = accuracy
  if (baselineDistorted && accuracy === 'under_predicted') {
    adjustedAccuracy = 'distorted_baseline'
  }

  return {
    ruleId: guide.ruleId,
    predictedGain,
    actualChange,
    accuracy: adjustedAccuracy,
    confidence: baselineDistorted ? 'low' : confidence,
    baselineDistorted,
    riskBefore: beforeAudit.approvalRisk,
    riskAfter: afterAudit.approvalRisk,
    predictedRiskBefore: prediction?.riskBefore ?? null,
    predictedRiskAfter: prediction?.riskAfter ?? null,
    ...riskCheck,
  }
}

function buildCalibrationFindings(comparisons) {
  const findings = []
  const byRule = new Map()

  for (const item of comparisons) {
    if (!byRule.has(item.ruleId)) byRule.set(item.ruleId, [])
    byRule.get(item.ruleId).push(item)
  }

  for (const [ruleId, items] of byRule.entries()) {
    const over = items.filter((item) => item.accuracy === 'over_predicted')
    const under = items.filter((item) => item.accuracy === 'under_predicted')
    const inRange = items.filter((item) => item.accuracy === 'in_range')
    const riskOver = items.filter((item) => item.riskAccuracy === 'risk_over_predicted')

    if (over.length > 0) {
      const avgActual = Math.round(
        over.reduce((sum, item) => sum + (item.actualChange ?? 0), 0) / over.length
      )
      findings.push({
        ruleId,
        finding: 'over_predicted',
        samples: over.length,
        averageActualChange: avgActual,
        recommendation: `Reduce ${ruleId} estimatedScoreGain — simulated gains averaged ${avgActual} points.`,
      })
    }

    if (under.length > 0) {
      const eligibleUnder = under.filter((item) => !item.baselineDistorted)
      if (eligibleUnder.length > 0) {
        const avgActual = Math.round(
          eligibleUnder.reduce((sum, item) => sum + (item.actualChange ?? 0), 0) /
            eligibleUnder.length
        )
        findings.push({
          ruleId,
          finding: 'under_predicted',
          samples: eligibleUnder.length,
          averageActualChange: avgActual,
          recommendation: `Increase ${ruleId} estimatedScoreGain — simulated gains averaged ${avgActual} points.`,
        })
      }
    }

    const distorted = items.filter((item) => item.baselineDistorted)
    if (distorted.length > 0) {
      findings.push({
        ruleId,
        finding: 'distorted_baseline',
        samples: distorted.length,
        recommendation: `${ruleId} compared against collapsed baseline score (<25) — exclude from gain tuning.`,
      })
    }

    if (inRange.length > 0 && over.length === 0 && under.length === 0) {
      findings.push({
        ruleId,
        finding: 'calibrated',
        samples: inRange.length,
        recommendation: `${ruleId} gain range appears reasonable in current fixtures.`,
      })
    }

    if (riskOver.length > 0) {
      findings.push({
        ruleId,
        finding: 'risk_over_predicted',
        samples: riskOver.length,
        recommendation: `${ruleId} predicted approval-risk reduction did not occur after simulated fix.`,
      })
    }
  }

  return findings
}

function runCase(testCase) {
  const auditData = getImpactCalibrationFixture(testCase.url)
  if (!auditData) {
    throw new Error(`Missing impact calibration fixture for ${testCase.url}`)
  }

  const beforeAudit = runAudit(auditData)
  const focusRules = new Set(testCase.focusRules || [])
  const guidesToSimulate = beforeAudit.fixGuides.filter(
    (guide) => focusRules.size === 0 || focusRules.has(guide.ruleId)
  )

  const simulations = []

  for (const guide of guidesToSimulate) {
    if (!guide.impactPrediction) continue

    const simulatedData = applyFixSimulation(auditData, guide.ruleId)
    const afterAudit = runAudit(simulatedData)
    const comparison = comparePrediction(guide, beforeAudit, afterAudit)

    simulations.push({
      ruleId: guide.ruleId,
      predictedGain: guide.impactPrediction.estimatedScoreGain,
      after: {
        estimatedScore: afterAudit.gmcRiskScore,
        estimatedRisk: afterAudit.approvalRisk,
      },
      comparison,
    })
  }

  return {
    name: testCase.name,
    url: testCase.url,
    notes: testCase.notes,
    before: {
      gmcRiskScore: beforeAudit.gmcRiskScore,
      approvalRisk: { level: beforeAudit.approvalRisk },
      fixGuides: summarizeFixGuides(beforeAudit.fixGuides),
    },
    simulations,
  }
}

function printReportSummary(report) {
  console.log('\n' + '='.repeat(72))
  console.log('Impact Prediction Accuracy Report')
  console.log('='.repeat(72))
  console.log(`Cases: ${report.cases.length}`)
  console.log(`Comparisons: ${report.totals.comparisons}`)
  console.log(`In range: ${report.totals.inRange}`)
  console.log(`Over predicted: ${report.totals.overPredicted}`)
  console.log(`Under predicted: ${report.totals.underPredicted}`)

  for (const testCase of report.cases) {
    console.log('\n' + '-'.repeat(72))
    console.log(`Case: ${testCase.name}`)
    console.log(`Before score: ${testCase.before.gmcRiskScore} | risk: ${testCase.before.approvalRisk.level}`)
    for (const sim of testCase.simulations) {
      const cmp = sim.comparison
      console.log(
        `  ${cmp.ruleId}: predicted +${cmp.predictedGain?.min}~+${cmp.predictedGain?.max} | actual +${cmp.actualChange} | ${cmp.accuracy} (${cmp.confidence})`
      )
      console.log(
        `    risk: ${cmp.riskBefore} -> ${cmp.riskAfter} (predicted ${cmp.predictedRiskBefore} -> ${cmp.predictedRiskAfter}) [${cmp.riskAccuracy}]`
      )
    }
  }

  if (report.calibrationFindings.length > 0) {
    console.log('\nCalibration findings:')
    for (const finding of report.calibrationFindings) {
      console.log(`  [${finding.ruleId}] ${finding.finding}: ${finding.recommendation}`)
    }
  }

  if (report.gainAdjustments.length > 0) {
    console.log('\nRecommended gain adjustments:')
    for (const adj of report.gainAdjustments) {
      console.log(`  ${adj.ruleId} ${adj.scenario}: ${JSON.stringify(adj.from)} -> ${JSON.stringify(adj.to)}`)
    }
  }
}

function deriveGainAdjustments(findings, comparisons) {
  const adjustments = []
  const eligible = comparisons.filter(
    (item) => !item.baselineDistorted && item.accuracy !== 'distorted_baseline'
  )

  for (const finding of findings) {
    if (finding.finding === 'over_predicted') {
      const samples = eligible.filter(
        (item) => item.ruleId === finding.ruleId && item.accuracy === 'over_predicted'
      )
      const avg = finding.averageActualChange ?? 0
      for (const sample of samples) {
        const current = sample.predictedGain
        if (!current) continue
        const newMax = Math.max(avg + 2, Math.min(current.max, avg + 3))
        const newMin = Math.max(0, Math.min(current.min, Math.max(1, avg - 1)))
        adjustments.push({
          ruleId: finding.ruleId,
          scenario: sample.ruleId,
          from: current,
          to: { min: newMin, max: newMax },
        })
      }
    }

    if (finding.finding === 'under_predicted') {
      const samples = eligible.filter(
        (item) => item.ruleId === finding.ruleId && item.accuracy === 'under_predicted'
      )
      if (samples.length === 0) continue
      const avg = finding.averageActualChange ?? 0
      for (const sample of samples) {
        const current = sample.predictedGain
        if (!current) continue
        adjustments.push({
          ruleId: finding.ruleId,
          scenario: sample.ruleId,
          from: current,
          to: {
            min: Math.max(current.min, Math.max(1, avg - 2)),
            max: Math.max(current.max, avg + 2),
          },
        })
      }
    }
  }

  return adjustments
}

async function main() {
  const cases = loadCases()
  const caseReports = []
  const allComparisons = []

  console.log('Impact Prediction Calibration')
  console.log(`Cases loaded: ${cases.length}`)

  for (const testCase of cases) {
    console.log(`\nRunning ${testCase.name} ...`)
    const caseReport = runCase(testCase)
    caseReports.push(caseReport)
    allComparisons.push(...caseReport.simulations.map((sim) => sim.comparison))
  }

  const calibrationFindings = buildCalibrationFindings(allComparisons)
  const gainAdjustments = deriveGainAdjustments(calibrationFindings, allComparisons)

  const report = {
    generatedAt: new Date().toISOString(),
    totals: {
      cases: caseReports.length,
      comparisons: allComparisons.length,
      inRange: allComparisons.filter((item) => item.accuracy === 'in_range').length,
      overPredicted: allComparisons.filter((item) => item.accuracy === 'over_predicted').length,
      underPredicted: allComparisons.filter((item) => item.accuracy === 'under_predicted').length,
    },
    calibrationFindings,
    gainAdjustments,
    comparisons: allComparisons.map((item) => ({
      ruleId: item.ruleId,
      predictedGain: item.predictedGain,
      actualChange: item.actualChange,
      accuracy: item.accuracy,
      confidence: item.confidence,
      riskAccuracy: item.riskAccuracy,
    })),
    cases: caseReports,
  }

  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2))
  printReportSummary(report)
  console.log(`\nReport written: ${REPORT_PATH}`)
}

main().catch((error) => {
  console.error('Impact calibration failed:', error)
  process.exit(1)
})
