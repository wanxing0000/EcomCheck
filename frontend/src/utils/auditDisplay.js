import {
  DEFAULT_AUDIT_MODE,
  GMC_AUDIT_PRODUCT,
  SEO_AUDIT_PRODUCT,
  getAuditProductForMode,
} from '../data/auditProducts.js'

export function getAuditMode(auditData) {
  if (auditData?.auditMode) return auditData.auditMode
  if (auditData?.auditPlan?.mode) return auditData.auditPlan.mode
  // Legacy saved reports without mode metadata default to internal full compatibility
  if (!auditData?.auditMode && !auditData?.auditPlan) return 'full'
  return DEFAULT_AUDIT_MODE
}

export function getAuditProduct(auditData) {
  if (auditData?.auditProduct) return auditData.auditProduct
  return getAuditProductForMode(getAuditMode(auditData))
}

export function isFullAudit(auditData) {
  return getAuditMode(auditData) === 'full'
}

export function isGmcAuditProduct(auditData) {
  const mode = getAuditMode(auditData)
  return mode === 'gmc' || mode === 'full'
}

export function isSeoAuditProduct(auditData) {
  const mode = getAuditMode(auditData)
  return mode === 'seo' || mode === 'full'
}

export function isLegacyEnabled(auditData) {
  if (auditData?.auditPlan?.legacyEnabled != null) {
    return auditData.auditPlan.legacyEnabled
  }
  return isFullAudit(auditData) || getAuditMode(auditData) === 'gmc'
}

export function isModuleExecuted(auditData, moduleId) {
  const status = auditData?.moduleStatus?.[moduleId]
  if (status != null) return status.executed

  if (isFullAudit(auditData)) {
    if (moduleId === 'gmc') return Boolean(auditData?.gmc)
    return Boolean(auditData?.modules?.[moduleId])
  }

  const mode = getAuditMode(auditData)
  if (mode === 'gmc') {
    if (moduleId === 'gmc') return Boolean(auditData?.gmc)
    if (moduleId === 'ads' || moduleId === 'technical') {
      return Boolean(auditData?.modules?.[moduleId])
    }
    return false
  }

  if (mode === 'seo') {
    return moduleId === 'seo' && Boolean(auditData?.modules?.[moduleId])
  }

  return false
}

export function showTrustPolicySection(auditData) {
  if (!isLegacyEnabled(auditData)) return false

  const mode = getAuditMode(auditData)
  return mode === 'full' || mode === 'gmc' || mode === 'custom'
}

export function showIssueCategory(auditData, category) {
  if (category === 'gmc') return isGmcAuditProduct(auditData) && isModuleExecuted(auditData, 'gmc')
  if (category === 'seo') return isSeoAuditProduct(auditData) && isModuleExecuted(auditData, 'seo')
  if (category === 'ads') return isGmcAuditProduct(auditData) && isModuleExecuted(auditData, 'ads')
  if (category === 'technical') {
    return isGmcAuditProduct(auditData) && isModuleExecuted(auditData, 'technical')
  }
  if (category === 'trust' || category === 'policy') return showTrustPolicySection(auditData)
  return false
}

export function getPrimaryScoreRings(auditData, scores = {}, counts = {}) {
  const product = getAuditProduct(auditData)
  const rings = []

  const pushRing = (label, value, subtext) => {
    if (value == null) return
    rings.push({ label, value, subtext, size: rings.length === 0 ? 'lg' : 'md' })
  }

  switch (product.primaryScore) {
    case 'compliance+seo':
      pushRing(
        'Compliance Score',
        scores.compliance ?? scores.overall,
        `${counts.complianceTotal ?? 0} compliance item${counts.complianceTotal === 1 ? '' : 's'} to review`
      )
      pushRing(
        'SEO Health Score',
        scores.seo,
        `${counts.seoTotal ?? 0} SEO item${counts.seoTotal === 1 ? '' : 's'} to review`
      )
      break
    case 'gmc':
      pushRing(
        'GMC Readiness Score',
        scores.gmc ?? scores.compliance ?? scores.overall,
        `${counts.complianceTotal ?? counts.total ?? 0} item${(counts.complianceTotal ?? counts.total) === 1 ? '' : 's'} to review`
      )
      break
    case 'seo':
      pushRing(
        'SEO Health Score',
        scores.seo ?? scores.overall,
        `${counts.seoTotal ?? 0} SEO item${counts.seoTotal === 1 ? '' : 's'} to review`
      )
      break
    case 'ads':
      pushRing('Ads Score', scores.ads ?? scores.overall, `${counts.total ?? 0} item(s) to review`)
      break
    case 'technical':
      pushRing(
        'Technical Score',
        scores.technical ?? scores.overall,
        `${counts.total ?? 0} item(s) to review`
      )
      break
    case 'trust+policy':
      pushRing('Trust Score', scores.trust, null)
      pushRing('Policy Score', scores.policy, null)
      break
    default:
      pushRing('Overall Score', scores.overall, `${counts.total ?? 0} item(s) to review`)
  }

  if (rings.length === 0 && scores.overall != null) {
    pushRing('Overall Score', scores.overall, `${counts.total ?? 0} item(s) to review`)
  }

  return rings
}

export function getComplianceScoreEntries(scores = {}) {
  const entries = [
    { label: 'Compliance', value: scores.compliance },
    { label: 'GMC', value: scores.gmc },
    { label: 'Ads', value: scores.ads },
    { label: 'Technical', value: scores.technical },
    { label: 'Trust', value: scores.trust },
    { label: 'Policy', value: scores.policy },
  ]

  return entries.filter((entry) => entry.value != null)
}

export function getReportSubtitle(auditData) {
  const product = getAuditProduct(auditData)
  return product.description || GMC_AUDIT_PRODUCT.description
}

export function getReportTitle(auditData) {
  const mode = getAuditMode(auditData)
  if (mode === 'gmc') return 'GMC Readiness Report'
  if (mode === 'seo') return 'SEO Health Report'
  return `${getAuditProduct(auditData).name} Report`
}

export function getReportProductLabel(auditData) {
  const mode = getAuditMode(auditData)
  if (mode === 'gmc') return GMC_AUDIT_PRODUCT.name
  if (mode === 'seo') return SEO_AUDIT_PRODUCT.name
  return getAuditProduct(auditData).name
}

export function buildComplianceRiskAreas(scores = {}, issueGroups = {}) {
  const statusFor = (score, issues = []) => {
    if (issues.length === 0 && (score == null || score >= 85)) return 'pass'
    if (issues.some((issue) => issue.severity === 'high' || issue.severity === 'medium')) {
      return 'critical'
    }
    if (issues.length > 0 || (score != null && score < 70)) return 'warning'
    return 'pass'
  }

  return [
    {
      id: 'ads',
      label: 'Ads',
      score: scores.ads,
      status: statusFor(scores.ads, issueGroups.ads),
      failedRules: (issueGroups.ads || []).map((issue) => issue.id),
    },
    {
      id: 'technical',
      label: 'Technical',
      score: scores.technical,
      status: statusFor(scores.technical, issueGroups.technical),
      failedRules: (issueGroups.technical || []).map((issue) => issue.id),
    },
    {
      id: 'trust-policy',
      label: 'Trust & Policy',
      score:
        scores.trust != null && scores.policy != null
          ? Math.round((scores.trust + scores.policy) / 2)
          : scores.trust ?? scores.policy,
      status: statusFor(
        scores.trust ?? scores.policy,
        [...(issueGroups.trust || []), ...(issueGroups.policy || [])]
      ),
      failedRules: [...(issueGroups.trust || []), ...(issueGroups.policy || [])].map((issue) => issue.id),
    },
  ]
}
