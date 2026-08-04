import { executeModule } from '../_shared/executeModule.js'
import { rules } from './rules/index.js'

export const id = 'trust'
export const name = 'Misrepresentation Risk'
export const category = 'trust'

export function getRules() {
  return rules
}

export async function run(context) {
  return executeModule(rules, context)
}

export default { id, name, category, getRules, run }
