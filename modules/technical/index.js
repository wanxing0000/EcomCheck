import { executeModule } from '../_shared/executeModule.js'
import { resolveTechnicalRules } from './rules/index.js'

export const id = 'technical'
export const name = 'Technical'
export const category = 'technical'

function rulesForOptions(options = {}) {
  return resolveTechnicalRules(options)
}

export function getRules(options = {}) {
  return rulesForOptions(options)
}

export async function run(context) {
  return executeModule(rulesForOptions(context.options), context)
}

export default { id, name, category, getRules, run }
