import { generateFixAssistant } from '../services/fixAssistantGenerator.js'
import { generateFixGuides } from '../services/fixGuideGenerator.js'
import { buildComplianceActions } from '../services/complianceActionBuilder.js'
import { runRules } from '../rules/index.js'
import { FIXTURES } from './calibration-fixtures.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

const AUDIT_OPTIONS = {
  auditMode: 'gmc',
  modules: ['gmc', 'ads', 'technical', 'trust'],
  legacyEnabled: true,
}

console.log('Fix Assistant Generator Tests\n')

console.log('G008 — payment methods missing')
const g008Draft = generateFixAssistant({
  ruleId: 'G008',
  evidence: { message: 'Payment information detected. Missing: payment methods.' },
  missing: ['Payment Methods', 'Billing Terms'],
  detected: ['Payment page found'],
})
assert(g008Draft?.copyReadyText, 'G008 should produce copyReadyText')
assert(g008Draft.copyReadyText.includes('{{PAYMENT_METHODS}}'), 'G008 should keep payment methods placeholder')
assert(!/We accept PayPal/i.test(g008Draft.copyReadyText), 'G008 must not invent payment methods')
assert(g008Draft.sections?.length > 0, 'G008 should include sections')
console.log('  PASS')

console.log('\nG008 — known methods from audit evidence')
const g008Known = generateFixAssistant({
  ruleId: 'G008',
  missing: ['Payment Methods', 'Billing Terms'],
  detected: ['Payment page found', 'Payment methods: Visa, Mastercard'],
})
assert(g008Known.copyReadyText.includes('Visa, Mastercard'), 'G008 should reuse detected payment methods')
assert(!g008Known.copyReadyText.includes('{{PAYMENT_METHODS}}'), 'G008 should not placeholder known methods')
console.log('  PASS')

console.log('\nG010 — shipping gaps')
const g010Draft = generateFixAssistant({
  ruleId: 'G010',
  evidence: { message: 'Shipping policy incomplete.' },
  missing: ['Delivery Timeframes', 'Shipping Costs'],
  detected: ['Shipping policy found'],
})
assert(g010Draft?.copyReadyText, 'G010 should produce copyReadyText')
assert(g010Draft.copyReadyText.includes('{{DELIVERY_TIME}}'), 'G010 should include delivery placeholder')
assert(g010Draft.copyReadyText.includes('{{SHIPPING_COST}}'), 'G010 should include shipping cost placeholder')
assert(!/free shipping on all orders/i.test(g010Draft.copyReadyText), 'G010 must not invent shipping offers')
console.log('  PASS')

console.log('\nM002 — policy quality gaps')
const m002Draft = generateFixAssistant({
  ruleId: 'M002',
  evidence: {
    policyQualityReport: {
      policies: [
        {
          label: 'Refund',
          found: true,
          qualityScore: 55,
          missing: ['return window', 'return conditions'],
        },
        {
          label: 'Shipping',
          found: true,
          qualityScore: 60,
          missing: ['delivery timeframes', 'shipping costs'],
        },
        {
          label: 'Payment',
          found: true,
          qualityScore: 50,
          missing: ['payment methods'],
        },
      ],
    },
  },
  missing: [
    'Refund: Return window',
    'Shipping: Delivery timeframes',
    'Payment: Payment methods',
  ],
  detected: ['Refund page found', 'Shipping page found', 'Payment page found'],
})
assert(m002Draft?.copyReadyText, 'M002 should produce copyReadyText')
assert(m002Draft.sections?.length >= 2, 'M002 should produce multiple policy sections')
assert(m002Draft.copyReadyText.includes('{{RETURN_WINDOW}}'), 'M002 should include return window placeholder')
assert(m002Draft.copyReadyText.includes('{{PAYMENT_METHODS}}'), 'M002 should include payment methods placeholder')
console.log('  PASS')

console.log('\nFix guide integration — G008, G010, M002')
const integrationFixture = { ...FIXTURES['m003-normal-product'], url: 'https://fix-assistant-test.local' }
const ruleResults = runRules(integrationFixture, AUDIT_OPTIONS)
const { fixGuides } = generateFixGuides({
  ruleResults,
  auditMode: 'gmc',
  gmcRiskScore: 53,
  approvalRisk: { level: 'medium' },
})
const { complianceActions } = buildComplianceActions({
  ruleResults,
  fixGuides,
  auditMode: 'gmc',
})

for (const ruleId of ['G008', 'G010', 'M002']) {
  const action = complianceActions.find((item) => item.ruleId === ruleId)
  const guide = fixGuides.find((item) => item.ruleId === ruleId)
  assert(action?.fixAssistant?.copyReadyText, `${ruleId} compliance action should include fixAssistant`)
  assert(guide?.fixAssistant?.copyReadyText, `${ruleId} fix guide should include fixAssistant`)
  console.log(`  ${ruleId}: draft length ${action.fixAssistant.copyReadyText.length} chars`)
}

console.log('\nPhase 14.1 Fix Assistant completed')
