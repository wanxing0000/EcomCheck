import { generateFixAssistant } from '../services/fixAssistantGenerator.js'
import { generateFixGuides } from '../services/fixGuideGenerator.js'
import { buildComplianceActions } from '../services/complianceActionBuilder.js'
import {
  buildFixPreviewLines,
  computeFixAvailability,
  getFixCopyText,
  getFixCategoryForRule,
  groupFixableActionsByCategory,
  hasFixAssistant,
  shouldRenderFixPreview,
} from '../frontend/src/utils/fixAssistantDisplay.js'

function assert(condition, message) {
  if (!condition) throw new Error(message)
}

console.log('Fix Assistant UX Tests (Phase 14.4)\n')

const refundFix = generateFixAssistant({
  ruleId: 'P002',
  evidence: { message: 'No refund or return policy page detected on the website.' },
  missing: ['Refund policy page', 'Return period', 'Refund method', 'Return conditions', 'Return address'],
  detected: [],
})

console.log('Fix preview data when fix exists')
assert(shouldRenderFixPreview({ fixAssistant: refundFix }), 'preview should render when fix exists')
const previewLines = buildFixPreviewLines(refundFix)
assert(previewLines.some((line) => line.label === 'Return period'), 'preview should include return period line')
assert(previewLines.some((line) => line.value?.includes('{{RETURN_PERIOD}}')), 'preview should keep placeholders')
assert(getFixCopyText(refundFix).includes('{{REFUND_METHOD}}'), 'copy text should include refund placeholders')
console.log('  PASS')

console.log('\nNo fix card when no fix exists')
assert(!shouldRenderFixPreview({ ruleId: 'G003', title: 'Return Policy' }), 'missing fixAssistant should not render preview')
assert(!shouldRenderFixPreview({ fixAssistant: null }), 'null fixAssistant should not render preview')
assert(!shouldRenderFixPreview({ fixAssistant: { title: 'Empty' } }), 'empty copyReadyText should not render preview')
console.log('  PASS')

console.log('\nCopy action content')
const copyText = getFixCopyText(refundFix)
assert(typeof copyText === 'string' && copyText.length > 0, 'copy text should be non-empty string')
assert(copyText === refundFix.copyReadyText, 'copy text should match generated fix content exactly')
assert(copyText.includes('{{RETURN_ADDRESS}}'), 'copy text placeholders must remain unchanged')
console.log('  PASS')

console.log('\nFix availability count')
const { fixGuides } = generateFixGuides({
  auditMode: 'gmc',
  ruleResults: [
    {
      id: 'P002',
      passed: false,
      category: 'policy',
      severity: 'high',
      message: 'No refund or return policy page detected on the website.',
    },
    {
      id: 'P001',
      passed: false,
      category: 'policy',
      severity: 'high',
      message: 'No privacy policy page detected on the website.',
    },
    {
      id: 'G003',
      passed: false,
      category: 'gmc',
      severity: 'high',
      message: 'No return policy page detected.',
    },
  ],
})

const { complianceActions } = buildComplianceActions({
  auditMode: 'gmc',
  ruleResults: [
    {
      id: 'P002',
      passed: false,
      category: 'policy',
      message: 'No refund or return policy page detected on the website.',
    },
    {
      id: 'P001',
      passed: false,
      category: 'policy',
      message: 'No privacy policy page detected on the website.',
    },
    {
      id: 'G003',
      passed: false,
      category: 'gmc',
      message: 'No return policy page detected.',
    },
  ],
  fixGuides,
})

const stats = computeFixAvailability(complianceActions)
assert(stats.issuesFound === complianceActions.length, 'issues found should match compliance actions count')
assert(stats.fixAvailable === complianceActions.filter(hasFixAssistant).length, 'fix available count should match')
assert(
  stats.manualActionRequired === stats.issuesFound - stats.fixAvailable,
  'manual action required should be derived correctly'
)
assert(stats.fixAvailable >= 2, 'P001 and P002 should have generated fixes')
console.log(`  issues=${stats.issuesFound}, fixes=${stats.fixAvailable}, manual=${stats.manualActionRequired}`)
console.log('  PASS')

console.log('\nFix categories')
assert(getFixCategoryForRule('P002', { category: 'policy' }) === 'policy', 'P002 should be policy fix')
assert(getFixCategoryForRule('T001', { category: 'trust' }) === 'trust', 'T001 should be trust fix')
assert(getFixCategoryForRule('G005', { category: 'gmc' }) === 'technical', 'G005 should be technical fix')
assert(getFixCategoryForRule('M003', { category: 'trust' }) === 'content', 'M003 should be content fix')

const groups = groupFixableActionsByCategory(complianceActions)
assert(groups.policy.length >= 2, 'policy category should include P001/P002 fixes')
console.log('  PASS')

console.log('\nExisting report compatibility (actions without fixAssistant still valid)')
const legacyActions = [
  { ruleId: 'G003', title: 'Return Policy', problem: 'Missing page', severity: 'high', riskTier: 'critical' },
]
const legacyStats = computeFixAvailability(legacyActions)
assert(legacyStats.issuesFound === 1, 'legacy action should count as issue')
assert(legacyStats.fixAvailable === 0, 'legacy action without fixAssistant should not count as fix available')
assert(legacyStats.manualActionRequired === 1, 'legacy action should require manual action')
console.log('  PASS')

console.log('\nPhase 14.4 Fix Assistant UX completed')
