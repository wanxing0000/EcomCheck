import { productTrustSignalsRule } from '../modules/trust/rules/M003-product-trust.js'
import { analyzeProductPagesTrust, PRODUCT_TRUST_PASS_SCORE } from '../modules/trust/rules/_helpers.js'
import { runRules } from '../rules/index.js'
import { buildProfessionalReport } from '../services/reportBuilder.js'
import { buildComplianceActions } from '../services/complianceActionBuilder.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

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

function buildNormalProductAudit() {
  return {
    url: 'https://example-store.com',
    productsAudit: {
      scannedPages: 1,
      productPages: [
        {
          url: 'https://example-store.com/products/premium-tee',
          fetched: true,
          hasProductSchema: true,
          signals: { addToCart: true, schema: true, price: true, availability: true },
          products: [
            {
              valid: true,
              name: 'Premium Cotton Tee',
              fields: {
                name: true,
                image: true,
                price: true,
                availability: true,
                brand: true,
                sku: true,
              },
            },
          ],
          trustContent: {
            descriptionLength: 320,
            hasSpecifications: true,
            marketingHeavy: false,
            imageCount: 3,
            imagesWithAlt: 2,
            hasMainImage: true,
            htmlAttributes: { material: true, size: true, color: false, model: false },
            hasReviews: false,
            hasGuarantee: false,
            hasContactOrOrder: true,
          },
        },
      ],
      pageScores: [
        {
          url: 'https://example-store.com/products/premium-tee',
          htmlSignals: ['Product JSON-LD', 'price', 'add-to-cart', 'material', 'size'],
        },
      ],
    },
  }
}

function buildLowQualityProductAudit() {
  return {
    url: 'https://example-store.com',
    productsAudit: {
      scannedPages: 1,
      productPages: [
        {
          url: 'https://example-store.com/products/blank',
          fetched: true,
          hasProductSchema: false,
          signals: { addToCart: false, schema: false, price: false, availability: false },
          products: [
            {
              valid: false,
              name: 'Blank Item',
              fields: { name: true, image: false, price: false, availability: false, brand: false },
            },
          ],
          trustContent: {
            descriptionLength: 0,
            hasSpecifications: false,
            marketingHeavy: false,
            imageCount: 0,
            imagesWithAlt: 0,
            hasMainImage: false,
            htmlAttributes: { material: false, size: false, color: false, model: false },
            hasReviews: false,
            hasGuarantee: false,
            hasContactOrOrder: false,
          },
        },
      ],
      pageScores: [{ url: 'https://example-store.com/products/blank', htmlSignals: [] }],
    },
  }
}

function buildOptimizationOnlyAudit() {
  return {
    url: 'https://example-store.com',
    productsAudit: {
      scannedPages: 1,
      productPages: [
        {
          url: 'https://example-store.com/products/good-but-minimal-meta',
          fetched: true,
          hasProductSchema: true,
          signals: { addToCart: true, schema: true, price: true, availability: true },
          products: [
            {
              valid: true,
              name: 'Structured Hoodie',
              fields: {
                name: true,
                image: true,
                price: true,
                availability: true,
                brand: false,
                sku: false,
              },
            },
          ],
          trustContent: {
            descriptionLength: 360,
            hasSpecifications: true,
            marketingHeavy: false,
            imageCount: 4,
            imagesWithAlt: 3,
            hasMainImage: true,
            htmlAttributes: { material: true, size: true, color: true, model: true },
            hasReviews: false,
            hasGuarantee: false,
            hasContactOrOrder: true,
          },
        },
      ],
      pageScores: [
        {
          url: 'https://example-store.com/products/good-but-minimal-meta',
          htmlSignals: ['Product JSON-LD', 'price', 'add-to-cart', 'material', 'size', 'dimensions'],
        },
      ],
    },
  }
}

function runM003Report(auditData) {
  const ruleResults = runRules(auditData, AUDIT_OPTIONS)
  const report = buildProfessionalReport(ruleResults, [], REPORT_CONTEXT)
  const m003Rule = ruleResults.find((rule) => rule.id === 'M003')
  const { complianceActions } = buildComplianceActions({
    ruleResults,
    complianceIssues: report.gmcReadiness?.complianceIssues || [],
    fixGuides: report.gmcReadiness?.fixGuides || [],
    approvalRisk: report.gmcReadiness?.approvalRisk,
    auditMode: 'gmc',
  })

  return { ruleResults, report, m003Rule, complianceActions }
}

console.log('M003 threshold:', PRODUCT_TRUST_PASS_SCORE)

const normalAudit = buildNormalProductAudit()
const normalReport = analyzeProductPagesTrust(normalAudit)
const normalResult = productTrustSignalsRule.check(normalAudit)
const normalBundle = runM003Report(normalAudit)

console.log('\n--- Normal product page ---')
console.log('Score:', normalReport.score)
console.log('Gap classification:', normalReport.gapClassification)
console.log('Passed:', normalResult.passed)

assert(normalReport.score >= 70 && normalReport.score <= 90, `expected score 70-90, got ${normalReport.score}`)
assert(normalResult.passed === true, 'normal product page should pass M003')
assert(
  !normalBundle.complianceActions.some((action) => action.ruleId === 'M003'),
  'passed M003 must not produce compliance action'
)

const lowAudit = buildLowQualityProductAudit()
const lowReport = analyzeProductPagesTrust(lowAudit)
const lowResult = productTrustSignalsRule.check(lowAudit)
const lowBundle = runM003Report(lowAudit)

console.log('\n--- Low quality product page ---')
console.log('Score:', lowReport.score)
console.log('Risk gaps:', lowReport.gapClassification?.riskMissing)
console.log('Passed:', lowResult.passed, 'Severity:', lowResult.severity)

assert(lowReport.score < PRODUCT_TRUST_PASS_SCORE, 'low quality page should score below pass threshold')
assert(lowResult.passed === false, 'low quality product page should fail M003')
assert(lowReport.gapClassification.riskMissing.length > 0, 'low quality page should have risk gaps')
assert(
  lowReport.gapClassification.riskMissing.some((item) => /description|image/i.test(item)),
  'low quality page should miss description and/or images'
)
assert(
  lowBundle.complianceActions.some((action) => action.ruleId === 'M003'),
  'failed M003 should still produce compliance action'
)

const optimizationAudit = buildOptimizationOnlyAudit()
const optimizationReport = analyzeProductPagesTrust(optimizationAudit)
const optimizationResult = productTrustSignalsRule.check(optimizationAudit)

console.log('\n--- Optimization-only gaps ---')
console.log('Score:', optimizationReport.score)
console.log('Optimization gaps:', optimizationReport.gapClassification?.optimizationMissing)
console.log('Risk gaps:', optimizationReport.gapClassification?.riskMissing)
console.log('Passed:', optimizationResult.passed, 'Severity:', optimizationResult.severity)

assert(optimizationReport.score >= PRODUCT_TRUST_PASS_SCORE, `optimization-only page should pass threshold, got ${optimizationReport.score}`)
assert(optimizationResult.passed === true, 'score >= 70 should pass even with missing brand/sku/warranty')
assert(
  optimizationReport.gapClassification.optimizationMissing.some((item) =>
    /brand|sku|warranty|guarantee|review/i.test(item)
  ),
  'brand/sku/warranty/reviews should classify as optimization gaps when present'
)
assert(
  optimizationReport.gapClassification.riskMissing.length === 0,
  `optimization-only passing page should not have risk gaps, got ${optimizationReport.gapClassification.riskMissing.join(', ')}`
)

const belowThresholdAudit = {
  ...buildOptimizationOnlyAudit(),
  productsAudit: {
    ...buildOptimizationOnlyAudit().productsAudit,
    productPages: [
      {
        ...buildOptimizationOnlyAudit().productsAudit.productPages[0],
        trustContent: {
          ...buildOptimizationOnlyAudit().productsAudit.productPages[0].trustContent,
          descriptionLength: 90,
          imageCount: 1,
          hasSpecifications: false,
          htmlAttributes: { material: false, size: false, color: false, model: false },
        },
      },
    ],
  },
}

const belowReport = analyzeProductPagesTrust(belowThresholdAudit)
const belowResult = productTrustSignalsRule.check(belowThresholdAudit)

console.log('\n--- Below threshold with risk gaps ---')
console.log('Score:', belowReport.score)
console.log('Severity:', belowResult.severity)

assert(belowReport.score < PRODUCT_TRUST_PASS_SCORE, 'below-threshold page should score under 70')
assert(belowResult.passed === false, 'below-threshold page should fail M003')
assert(belowResult.severity === 'medium', 'missing description/images should map to warning severity')

console.log('\nPASS: M003 product trust thresholds, gap classification, and compliance action guard')
