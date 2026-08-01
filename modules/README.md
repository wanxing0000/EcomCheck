# EcomCheck Audit Modules

EcomCheck is a **modular audit platform**. Each module owns its rules, scoring, and output. The core API orchestrates modules through a central registry — adding SEO or Performance does not require rewriting the audit pipeline.

## What is an audit module?

An audit module is a self-contained compliance domain:

| Module | ID | Rules |
|--------|-----|-------|
| Google Merchant Center | `gmc` | G001–G007 |
| Advertising | `ads` | A001–A003 |
| Technical | `technical` | K001–K004 |

Trust and policy rules (`T001–T002`, `P001–P003`) remain under `rules/` until migrated.

## Module registry

All modules are registered in `modules/index.js`:

```javascript
export const moduleRegistry = {
  gmc: { enabled: true, module: gmcModule },
  ads: { enabled: true, module: adsModule },
  technical: { enabled: true, module: technicalModule },
}
```

Set `enabled: false` to disable a module globally without removing its code.

## Selective module execution

`POST /api/audit` accepts an optional `modules` array:

```json
{
  "url": "https://example.com",
  "modules": ["gmc", "ads"]
}
```

- **With `modules`** — only the listed enabled modules run
- **Without `modules`** — all enabled modules run (default)

Response includes `data.moduleStatus`:

```json
{
  "moduleStatus": {
    "gmc": { "enabled": true, "executed": true, "ruleCount": 7 },
    "ads": { "enabled": true, "executed": true, "ruleCount": 3 },
    "technical": { "enabled": true, "executed": false, "ruleCount": 4 }
  }
}
```

## Module interface

Every module must export:

| Export | Type | Description |
|--------|------|-------------|
| `id` | string | Module key, e.g. `'gmc'` |
| `name` | string | Display name |
| `category` | string | Rule category |
| `getRules()` | `() => Rule[]` | Returns module rules |
| `run(context)` | `async (context) => ModuleRunResult` | Runs checks |

### Context (input)

```javascript
{
  url: 'https://example.com',
  html: null,              // raw HTML when available
  crawlerData: { ... },    // full crawl payload (rules use this today)
  productsAudit: { ... },
  options: { modules: ['gmc'] },
}
```

### Result (output)

```javascript
{
  score: 90,
  summary: { total: 5, passed: 4, failed: 1, warnings: 0 },
  issues: [],
  warnings: [],
  recommendations: [],
  rules: [],               // full RuleResult[]
}
```

Shared execution lives in `modules/_shared/executeModule.js` — modules should not duplicate scoring logic.

## Shared utilities

| File | Purpose |
|------|---------|
| `_shared/types.js` | JSDoc types for rules, context, registry |
| `_shared/context.js` | Build module context from crawl data |
| `_shared/runModuleRules.js` | Execute rules against audit data |
| `_shared/scorer.js` | Weighted scoring into standard output |
| `_shared/executeModule.js` | `getRules()` + `run()` helper |

## How to create a new module

### 1. Create the folder

```
modules/seo/
├── index.js
├── rules/
│   ├── index.js
│   └── S001-example.js
├── scorer.js          # re-exports shared scorer
└── README.md
```

### 2. Implement rules

```javascript
// modules/seo/rules/S001-example.js
/** @type {import('../../_shared/types.js').Rule} */
export const exampleRule = {
  id: 'S001',
  name: 'Example SEO Check',
  category: 'seo',
  severity: 'medium',
  description: '...',
  check(auditData) {
    return { passed: true, message: 'OK' }
  },
}
```

Register in `modules/seo/rules/index.js`.

### 3. Implement module entry

```javascript
// modules/seo/index.js
import { executeModule } from '../_shared/executeModule.js'
import { rules } from './rules/index.js'

export const id = 'seo'
export const name = 'SEO'
export const category = 'seo'

export function getRules() {
  return rules
}

export async function run(context) {
  return executeModule(rules, context)
}

export default { id, name, category, getRules, run }
```

### 4. Register in `modules/index.js`

```javascript
import seoModule from './seo/index.js'

export const moduleRegistry = {
  gmc: { enabled: true, module: gmcModule },
  ads: { enabled: true, module: adsModule },
  technical: { enabled: true, module: technicalModule },
  seo: { enabled: true, module: seoModule },
}
```

### 5. API & Report

- `data.modules.seo` and `data.moduleStatus.seo` appear automatically
- Report **Audit Modules** section picks up new modules from `modules` / `moduleStatus`

No changes required in `api/_shared.js` unless a module needs a legacy top-level field (like `gmc`).

## Legacy compatibility

| Field | Source |
|-------|--------|
| `data.score` | All legacy + executed module rules |
| `data.gmc` | GMC module result + riskDetails |
| `data.rules` | Flat list of all rule results |
| `data.modules` | Standard module outputs |
| `data.moduleStatus` | Registry execution metadata |
