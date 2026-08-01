import { executeModule } from '../_shared/executeModule.js'
import { rules } from './rules/index.js'

export const id = 'technical'
export const name = 'Technical'
export const category = 'technical'

export function getRules() {
  return rules
}

export async function run(context) {
  return executeModule(rules, context)
}

export default { id, name, category, getRules, run }
