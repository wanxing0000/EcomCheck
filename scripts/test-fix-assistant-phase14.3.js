import { generateFixAssistant } from '../services/fixAssistantGenerator.js'
import { generateFixGuides } from '../services/fixGuideGenerator.js'
import { buildComplianceActions } from '../services/complianceActionBuilder.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function assertPlaceholderSafety(text) {
  assert(!/\bAcme Corp\b/i.test(text), 'must not invent company names')
  assert(!/\bsupport@example\.com\b/i.test(text), 'must not invent email addresses')
  assert(!/\b1[- ]year warranty\b/i.test(text), 'must not invent warranty periods')
  assert(!/\bCE certified\b/i.test(text), 'must not invent certifications')
  assert(!/\b30-day money-back guarantee\b/i.test(text), 'must not invent legal guarantees')
}

console.log('Fix Assistant Phase 14.3 Tests\n')

console.log('Missing contact information generates fix')
const contactDraft = generateFixAssistant({
  ruleId: 'T001',
  evidence: { message: 'No email, phone number, or physical address found on the website.' },
  missing: ['Contact email', 'Phone', 'Business address', 'Company name'],
  detected: [],
})
assert(contactDraft?.copyReadyText, 'contact fix should exist')
assert(contactDraft.copyReadyText.includes('{{COMPANY_NAME}}'), 'contact fix should include company placeholder')
assert(contactDraft.copyReadyText.includes('{{CONTACT_EMAIL}}'), 'contact fix should include email placeholder')
assert(contactDraft.copyReadyText.includes('{{PHONE}}'), 'contact fix should include phone placeholder')
assert(contactDraft.copyReadyText.includes('{{BUSINESS_ADDRESS}}'), 'contact fix should include address placeholder')
assertPlaceholderSafety(contactDraft.copyReadyText)
console.log('  PASS')

console.log('\nMissing refund policy generates fix')
const refundDraft = generateFixAssistant({
  ruleId: 'P002',
  evidence: { message: 'No refund or return policy page detected on the website.' },
  missing: ['Refund policy page', 'Return period', 'Return conditions', 'Refund method', 'Return address'],
  detected: [],
})
assert(refundDraft?.copyReadyText, 'refund fix should exist')
assert(refundDraft.copyReadyText.includes('{{RETURN_PERIOD}}'), 'refund fix should include return period placeholder')
assert(refundDraft.copyReadyText.includes('{{REFUND_METHOD}}'), 'refund fix should include refund method placeholder')
assert(refundDraft.copyReadyText.includes('{{RETURN_CONDITIONS}}'), 'refund fix should include return conditions placeholder')
assert(refundDraft.copyReadyText.includes('{{RETURN_ADDRESS}}'), 'refund fix should include return address placeholder')
assertPlaceholderSafety(refundDraft.copyReadyText)
console.log('  PASS')

console.log('\nMissing shipping information generates fix')
const shippingDraft = generateFixAssistant({
  ruleId: 'P003',
  evidence: { message: 'No shipping policy page detected on the website.' },
  missing: ['Shipping policy page', 'Processing time', 'Shipping regions', 'Delivery time', 'Shipping costs'],
  detected: [],
})
assert(shippingDraft?.copyReadyText, 'shipping fix should exist')
assert(shippingDraft.copyReadyText.includes('{{PROCESSING_TIME}}'), 'shipping fix should include processing time placeholder')
assert(shippingDraft.copyReadyText.includes('{{SHIPPING_REGIONS}}'), 'shipping fix should include regions placeholder')
assert(shippingDraft.copyReadyText.includes('{{DELIVERY_TIME}}'), 'shipping fix should include delivery time placeholder')
assert(shippingDraft.copyReadyText.includes('{{SHIPPING_COST}}'), 'shipping fix should include shipping cost placeholder')
assertPlaceholderSafety(shippingDraft.copyReadyText)
console.log('  PASS')

console.log('\nMissing privacy guidance generates fix')
const privacyDraft = generateFixAssistant({
  ruleId: 'P001',
  evidence: { message: 'No privacy policy page detected on the website.' },
  missing: ['Privacy policy page'],
  detected: [],
})
assert(privacyDraft?.copyReadyText, 'privacy guidance should exist')
assert(privacyDraft.title.includes('Privacy Policy Guidance'), 'privacy title should be guidance-focused')
assert(privacyDraft.copyReadyText.includes('Data collection'), 'privacy guidance should mention data collection')
assert(privacyDraft.copyReadyText.includes('Cookies'), 'privacy guidance should mention cookies')
assert(privacyDraft.copyReadyText.includes('Payment information'), 'privacy guidance should mention payment information')
assert(privacyDraft.copyReadyText.includes('Third-party services'), 'privacy guidance should mention third-party services')
assert(!privacyDraft.copyReadyText.includes('{{'), 'privacy guidance should not use fake legal placeholders')
assertPlaceholderSafety(privacyDraft.copyReadyText)
console.log('  PASS')

console.log('\nExisting compliant signals do not generate unnecessary fixes')
const completeContact = generateFixAssistant({
  ruleId: 'T001',
  missing: [],
  detected: ['Email', 'Phone', 'Address'],
})
assert(completeContact === null, 'complete contact signals should not generate fix draft')

const completePrivacy = generateFixAssistant({
  ruleId: 'P001',
  missing: [],
  detected: ['Privacy policy page found'],
})
assert(completePrivacy === null, 'existing privacy page should not generate fix draft')

const partialContact = generateFixAssistant({
  ruleId: 'T001',
  missing: ['Phone'],
  detected: ['Email', 'Address'],
})
assert(partialContact?.copyReadyText.includes('{{PHONE}}'), 'partial contact should only prompt missing phone')
assert(!partialContact.copyReadyText.includes('{{CONTACT_EMAIL}}'), 'partial contact should not duplicate email fix')
console.log('  PASS')

console.log('\nFix guide integration — T001, P001, P002, P003')
const { fixGuides } = generateFixGuides({
  auditMode: 'gmc',
  ruleResults: [
    {
      id: 'T001',
      name: 'Contact Information',
      category: 'trust',
      severity: 'high',
      passed: false,
      message: 'No email, phone number, or physical address found on the website.',
    },
    {
      id: 'P001',
      name: 'Privacy Policy',
      category: 'policy',
      severity: 'high',
      passed: false,
      message: 'No privacy policy page detected on the website.',
    },
    {
      id: 'P002',
      name: 'Refund Policy',
      category: 'policy',
      severity: 'high',
      passed: false,
      message: 'No refund or return policy page detected on the website.',
    },
    {
      id: 'P003',
      name: 'Shipping Policy',
      category: 'policy',
      severity: 'medium',
      passed: false,
      message: 'No shipping policy page detected on the website.',
    },
  ],
})

for (const ruleId of ['T001', 'P001', 'P002', 'P003']) {
  const guide = fixGuides.find((entry) => entry.ruleId === ruleId)
  assert(guide?.fixAssistant?.copyReadyText, `${ruleId} fix guide should include fixAssistant`)
}

const { complianceActions } = buildComplianceActions({
  auditMode: 'gmc',
  ruleResults: [
    { id: 'T001', passed: false, category: 'trust', message: 'No email, phone number, or physical address found on the website.' },
    { id: 'P001', passed: false, category: 'policy', message: 'No privacy policy page detected on the website.' },
    { id: 'P002', passed: false, category: 'policy', message: 'No refund or return policy page detected on the website.' },
    { id: 'P003', passed: false, category: 'policy', message: 'No shipping policy page detected on the website.' },
  ],
  fixGuides,
})

for (const ruleId of ['T001', 'P001', 'P002', 'P003']) {
  assert(
    complianceActions.find((action) => action.ruleId === ruleId)?.fixAssistant?.copyReadyText,
    `${ruleId} compliance action should include fixAssistant`
  )
}
console.log('  PASS')

console.log('\nPhase 14.3 Fix Assistant Coverage completed')
