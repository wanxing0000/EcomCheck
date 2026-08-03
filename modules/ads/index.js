import { executeModule } from '../_shared/executeModule.js'
import { resolveAdsRules } from './rules/index.js'

export const id = 'ads'
export const name = 'Advertising'
export const category = 'ads'

function rulesForOptions(options = {}) {
  return resolveAdsRules(options)
}

export function getRules(options = {}) {
  return rulesForOptions(options)
}

export async function run(context) {
  return executeModule(rulesForOptions(context.options), context)
}

export default { id, name, category, getRules, run }
