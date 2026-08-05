/**
 * Fix Impact Prediction — estimates score gain and approval risk change per fix.
 * Presentation layer only; does not modify audit rules or scoring.
 */

const SUPPORTED_RULE_IDS = new Set(['G005', 'G008', 'G010', 'M001', 'M002', 'M003'])

function normalizeRiskLevel(value) {
  const level = String(value || 'medium').toLowerCase()
  if (level === 'critical') return 'high'
  if (level === 'warning') return 'medium'
  if (level === 'advisory') return 'low'
  if (['high', 'medium', 'low'].includes(level)) return level
  return 'medium'
}

function normalizeMissingList(missing = []) {
  return missing.map((item) => String(item || '').toLowerCase())
}

function includesAny(haystack, needles) {
  return needles.some((needle) => haystack.some((item) => item.includes(needle)))
}

function resolveImpactLevel(estimatedScoreGain, riskFrom, riskTo) {
  if (riskFrom !== riskTo && riskFrom === 'high') return 'high'
  if (estimatedScoreGain.max >= 10) return 'high'
  if (estimatedScoreGain.max >= 5) return 'medium'
  return 'low'
}

function buildPrediction(input, estimatedScoreGain, riskFrom, riskTo, { affectApprovalRisk = true } = {}) {
  const currentScore = input.gmcRiskScore ?? input.currentScore ?? null
  const from = normalizeRiskLevel(riskFrom)
  const to = affectApprovalRisk ? normalizeRiskLevel(riskTo) : from
  const impactLevel = resolveImpactLevel(estimatedScoreGain, from, to)

  const afterScore =
    currentScore != null
      ? {
          min: Math.min(100, currentScore + estimatedScoreGain.min),
          max: Math.min(100, currentScore + estimatedScoreGain.max),
        }
      : null

  return {
    ruleId: input.ruleId,
    estimatedScoreGain,
    riskReduction: { from, to },
    before: {
      score: currentScore,
      approvalRisk: from,
    },
    after: {
      score: afterScore,
      approvalRisk: to,
    },
    impactLevel,
  }
}

function predictG008Impact(input) {
  const missing = normalizeMissingList(input.missing)
  const rule = input.rule || {}
  const message = String(rule.message || '').toLowerCase()
  const policyMissing = (rule.policyQuality?.missing || []).map((item) => item.toLowerCase())

  const pageMissing =
    includesAny(missing, ['payment page', 'payment policy page']) ||
    /no payment (?:policy|information|page)/i.test(message) ||
    (/not detected/i.test(message) && rule.id === 'G008')

  const paymentMethodsMissing =
    includesAny(missing, ['payment method', 'payment methods']) ||
    policyMissing.includes('payment methods')

  const riskFrom = input.approvalRisk?.level || input.severity || 'medium'

  if (pageMissing) {
    return buildPrediction(input, { min: 10, max: 20 }, riskFrom, 'medium')
  }

  if (paymentMethodsMissing) {
    return buildPrediction(input, { min: 3, max: 8 }, riskFrom, riskFrom, {
      affectApprovalRisk: false,
    })
  }

  return buildPrediction(input, { min: 3, max: 8 }, riskFrom, normalizeRiskLevel(riskFrom) === 'high' ? 'medium' : 'low')
}

function predictG010Impact(input) {
  const missing = normalizeMissingList(input.missing)
  const rule = input.rule || {}
  const message = String(rule.message || '').toLowerCase()
  const policyMissing = (rule.policyQuality?.missing || []).map((item) => item.toLowerCase())

  const policyPageMissing =
    includesAny(missing, ['shipping policy', 'shipping policy page', 'shipping page']) ||
    /no shipping (?:policy|information|page)/i.test(message) ||
    (/not detected/i.test(message) && rule.id === 'G010')

  const shippingCostMissing =
    includesAny(missing, ['shipping cost', 'shipping costs']) ||
    policyMissing.includes('shipping costs')

  const riskFrom = input.approvalRisk?.level || input.severity || 'medium'

  if (policyPageMissing) {
    return buildPrediction(input, { min: 10, max: 20 }, riskFrom, 'medium')
  }

  if (shippingCostMissing) {
    return buildPrediction(input, { min: 2, max: 5 }, riskFrom, riskFrom, {
      affectApprovalRisk: false,
    })
  }

  return buildPrediction(input, { min: 2, max: 5 }, riskFrom, riskFrom, { affectApprovalRisk: false })
}

function predictM001Impact(input) {
  const riskFrom = input.approvalRisk?.level || input.severity || 'medium'
  return buildPrediction(input, { min: 10, max: 20 }, riskFrom, 'medium')
}

function predictM002Impact(input) {
  const missing = normalizeMissingList(input.missing)
  const rule = input.rule || {}
  const gapClassification = rule.policyQualityReport?.policyGapClassification
  const riskFrom = input.approvalRisk?.level || input.severity || 'medium'

  const keyPolicyMissing =
    includesAny(missing, ['refund policy page', 'shipping policy page', 'payment policy page', 'policy page']) ||
    (gapClassification?.riskMissing || []).some((item) => /policy page/i.test(item))

  if (keyPolicyMissing) {
    return buildPrediction(input, { min: 10, max: 20 }, riskFrom, 'medium')
  }

  const optimizationOnly =
    gapClassification?.optimizationMissing?.length > 0 && gapClassification?.riskMissing?.length === 0

  if (optimizationOnly || includesAny(missing, ['return conditions', 'contact information', 'sufficient content length'])) {
    return buildPrediction(input, { min: 2, max: 5 }, riskFrom, riskFrom, {
      affectApprovalRisk: false,
    })
  }

  return buildPrediction(input, { min: 10, max: 20 }, riskFrom, 'medium')
}

function predictM003Impact(input) {
  const rule = input.rule || {}
  const gapClassification = rule.productTrustReport?.gapClassification
  const missing = normalizeMissingList(input.missing)
  const riskFrom = input.approvalRisk?.level || input.severity || 'medium'

  const hasRiskGaps =
    (gapClassification?.riskMissing?.length ?? 0) > 0 ||
    includesAny(missing, [
      'product description',
      'product images',
      'specifications',
      'material',
      'contact or order',
      'main product image',
    ])

  if (hasRiskGaps) {
    const riskTo = riskFrom === 'high' ? 'medium' : riskFrom
    return buildPrediction(input, { min: 8, max: 15 }, riskFrom, riskTo)
  }

  return buildPrediction(input, { min: 2, max: 5 }, riskFrom, riskFrom, { affectApprovalRisk: false })
}

function predictG005Impact(input) {
  const riskFrom = input.approvalRisk?.level || input.severity || 'low'
  return buildPrediction(input, { min: 1, max: 3 }, riskFrom, riskFrom, { affectApprovalRisk: false })
}

const RULE_PREDICTORS = {
  G008: predictG008Impact,
  G010: predictG010Impact,
  M001: predictM001Impact,
  M002: predictM002Impact,
  M003: predictM003Impact,
  G005: predictG005Impact,
}

/**
 * @param {{
 *   ruleId: string,
 *   severity?: string,
 *   currentScore?: number|null,
 *   gmcRiskScore?: number|null,
 *   approvalRisk?: { level?: string }|string|null,
 *   missing?: string[],
 *   detected?: string[],
 *   rule?: object|null,
 * }} input
 */
export function predictFixImpact(input) {
  if (!input?.ruleId || !SUPPORTED_RULE_IDS.has(input.ruleId)) {
    return null
  }

  const predictor = RULE_PREDICTORS[input.ruleId]
  if (!predictor) return null

  const approvalRisk =
    typeof input.approvalRisk === 'string'
      ? { level: input.approvalRisk }
      : input.approvalRisk || { level: input.severity || 'medium' }

  return predictor({
    ...input,
    approvalRisk,
  })
}

export function toFixGuideImpactPrediction(prediction) {
  if (!prediction) return null

  return {
    estimatedScoreGain: prediction.estimatedScoreGain,
    riskBefore: prediction.riskReduction.from,
    riskAfter: prediction.riskReduction.to,
    impactLevel: prediction.impactLevel,
    before: prediction.before,
    after: prediction.after,
  }
}

export { SUPPORTED_RULE_IDS as FIX_IMPACT_RULE_IDS }
