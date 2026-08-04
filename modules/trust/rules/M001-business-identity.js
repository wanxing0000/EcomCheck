import {
  analyzeBusinessIdentity,
  misrepresentationLevelToSeverity,
} from './_helpers.js'

function logAddressDebug(identity) {
  if (process.env.DEBUG_M001 !== '1') return

  const debug = identity.addressDebug
  console.log('[M001 address debug] pages:', debug?.pages)
  console.log('[M001 address debug] detectorInputs:', debug?.detectorInputs)
  if (!identity.signals.address) {
    console.log('[M001 address debug] address=false:', {
      addressDetected: false,
      searchedPages: debug?.searchedPages,
      textSample: debug?.textSample,
    })
  }
}

/** @type {import('../../_shared/types.js').Rule} */
export const businessIdentityRule = {
  id: 'M001',
  name: 'Business Identity',
  category: 'trust',
  severity: 'medium',
  description:
    'Detects whether the store exposes transparent business identity signals required to reduce GMC misrepresentation risk.',
  check(auditData) {
    const identity = analyzeBusinessIdentity(auditData)
    logAddressDebug(identity)
    const { signals, companyName, missing, riskLevel } = identity

    if (riskLevel === 'low' && identity.presentCount >= 3) {
      return {
        passed: true,
        message: `Business identity signals look strong${companyName ? ` for ${companyName}` : ''}.`,
        misrepresentationLevel: 'low',
        trustDetails: identity,
      }
    }

    const severity = misrepresentationLevelToSeverity(riskLevel)

    if (riskLevel === 'critical' || riskLevel === 'high') {
      const freeOnly =
        identity.emails.length > 0 &&
        identity.domainEmails.length === 0 &&
        identity.freeEmails.length === identity.emails.length

      return {
        passed: false,
        severity,
        misrepresentationLevel: riskLevel,
        message: freeOnly
          ? 'Business identity relies on free email providers and lacks clear company transparency.'
          : 'Business identity information is incomplete or unclear.',
        recommendation:
          'Add company name, physical address, phone number, and a domain email (e.g. support@yourstore.com) to your Contact or About page.',
        trustDetails: identity,
      }
    }

    return {
      passed: false,
      severity,
      misrepresentationLevel: riskLevel,
      message: `Business identity information is incomplete. Missing: ${missing.join(', ')}.`,
      recommendation:
        'Add company name, physical address, phone number and domain email to your Contact or About page.',
      trustDetails: identity,
    }
  },
}
