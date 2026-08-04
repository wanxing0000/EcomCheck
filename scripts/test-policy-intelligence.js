import {
  analyzePaymentPolicyQuality,
  analyzeShippingPolicyQuality,
} from '../services/pageContent.js'
import { detectPaymentMethods, detectShippingCost } from '../services/policyIntelligence.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

function runCase(name, fn) {
  try {
    fn()
    console.log(`PASS: ${name}`)
  } catch (error) {
    console.error(`FAIL: ${name}`)
    throw error
  }
}

runCase('Case 1: Visa and Mastercard payment methods', () => {
  const text = 'We accept Visa and Mastercard'
  const signal = detectPaymentMethods(text)
  const quality = analyzePaymentPolicyQuality(text)

  assert(signal.found === true, 'paymentMethods signal should be found')
  assert(signal.detected === 'found', 'paymentMethods detected state should be found')
  assert(quality.checks.paymentMethods === true, 'paymentMethods check should be true')
  assert(signal.evidence.length > 0, 'paymentMethods evidence should not be empty')
  assert(/visa/i.test(signal.evidence), 'evidence should mention Visa')
  assert(!quality.missing.includes('payment methods'), 'payment methods should not be missing')
})

runCase('Case 2: free standard shipping worldwide', () => {
  const text = 'We offer free standard shipping worldwide'
  const signal = detectShippingCost(text)
  const quality = analyzeShippingPolicyQuality(text)

  assert(signal.found === true, 'shippingCost signal should be found')
  assert(signal.detected === 'found', 'shippingCost detected state should be found')
  assert(signal.type === 'free_shipping', 'shippingCost type should be free_shipping')
  assert(quality.checks.shippingCost === true, 'shippingCost check should be true')
  assert(signal.evidence.length > 0, 'shippingCost evidence should not be empty')
  assert(/free standard shipping/i.test(signal.evidence), 'evidence should mention free standard shipping')
  assert(!quality.missing.includes('shipping costs'), 'shipping costs should not be missing')
})

runCase('Case 3: no payment information', () => {
  const text = 'No payment information'
  const signal = detectPaymentMethods(text)
  const quality = analyzePaymentPolicyQuality(text)

  assert(signal.found === false, 'paymentMethods signal should not be found')
  assert(signal.detected === 'not_found', 'paymentMethods detected state should be not_found')
  assert(quality.checks.paymentMethods === false, 'paymentMethods check should be false')
  assert(quality.missing.includes('payment methods'), 'payment methods should be missing')
})

runCase('Case 4: Free Standard Shipping spacing variant', () => {
  const text = ' We currently offer Free Standard Shipping '
  const signal = detectShippingCost(text)
  const quality = analyzeShippingPolicyQuality(text)

  assert(signal.found === true, 'shippingCost should detect Free Standard Shipping')
  assert(quality.checks.shippingCost === true, 'shippingCost check should be true')
  assert(!quality.missing.includes('shipping costs'), 'shipping costs should not be missing')
})

runCase('Case 5: Visa, Mastercard and PayPal', () => {
  const text = 'We accept Visa, Mastercard and PayPal'
  const signal = detectPaymentMethods(text)
  const quality = analyzePaymentPolicyQuality(text)

  assert(signal.found === true, 'payment methods should be found')
  assert(quality.checks.paymentMethods === true, 'paymentMethods check should be true')
  assert(/visa/i.test(signal.evidence), 'evidence should mention Visa')
  assert(/mastercard/i.test(signal.evidence), 'evidence should mention Mastercard')
  assert(/paypal/i.test(signal.evidence), 'evidence should mention PayPal')
  assert(quality.signals.paymentMethods.detected === 'found', 'signals.paymentMethods.detected should be found')
})

console.log('\nAll policy intelligence tests passed.')
