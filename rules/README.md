# AuditPilot Rules (Legacy Registry)

The audit engine registry lives here. **GMC, Ads, and Technical rules have moved to `modules/`.**

## Directory Structure

```
rules/
├── index.js          # Flat rule registry & runRules()
├── types.js          # Re-exports shared types from modules/_shared/
├── trust/            # Business trust signals (T001+)
└── policy/           # Policy page requirements (P001+)

modules/
├── gmc/rules/        # G001–G007
├── ads/rules/        # A001–A003
└── technical/rules/  # K001–K004
```

See **`modules/README.md`** for how to add new audit modules.

## Usage

```js
import { runRules } from '../rules/index.js'
import { runAuditModules } from '../modules/index.js'
import { scoreAudit } from '../services/scorer.js'

const auditData = await crawl(url)
const ruleResults = runRules(auditData)
const modules = runAuditModules(auditData)
const { score, issues, recommendations } = scoreAudit(ruleResults)
```

## Adding a rule to an existing module

1. Create the rule file under `modules/<module>/rules/`
2. Register it in `modules/<module>/rules/index.js`
3. No changes needed in the core API

## Adding trust / policy rules (legacy path)

1. Create a file in `rules/trust/` or `rules/policy/`
2. Register it in `rules/index.js` under `legacyRules`
