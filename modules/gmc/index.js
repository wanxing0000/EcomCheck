import { executeModule } from '../_shared/executeModule.js'
import { rules } from './rules/index.js'

export const id = 'gmc'
export const name = 'Google Merchant Center'
export const category = 'gmc'

export function getRules() {
  return rules
}

export async function run(context) {
  return executeModule(rules, context)
}

export default { id, name, category, getRules, run }
