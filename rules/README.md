# EcomCheck Rules

Advertising compliance rule definitions for the audit engine.

## Directory Structure

```
rules/
├── index.js          # Rule registry & runner
├── types.js          # Rule type definitions
├── trust/            # Business trust signals (T001+)
├── policy/           # Policy page requirements (P001+)
├── technical/        # Technical checks (K001+)
└── ads/              # Platform-specific ad rules (A001+)
```

## Rule Structure

Each rule exports an object with:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique rule ID (e.g. T001) |
| `name` | string | Human-readable name |
| `category` | string | trust / policy / technical / ads |
| `severity` | string | high / medium / low |
| `description` | string | What the rule checks |
| `check` | function | `(auditData) => { passed, message, recommendation }` |

## Implemented Rules

| ID | Category | Name | Severity |
|----|----------|------|----------|
| T001 | trust | Contact Information | high |
| T002 | trust | About Us | medium |
| P001 | policy | Privacy Policy | high |
| P002 | policy | Refund Policy | high |
| P003 | policy | Shipping Policy | medium |
| K001 | technical | HTTPS | high |
| K002 | technical | Robots.txt | low |
| K003 | technical | Sitemap | low |
| K004 | technical | Meta Basic | medium |
| A001 | ads | Meta Pixel Detection | medium |
| A002 | ads | Google Tag Detection | medium |
| A003 | ads | Product JSON-LD Detection | high |
| G001 | gmc | Product Price | high |
| G002 | gmc | Product Availability | high |
| G003 | gmc | Return Policy | high |
| G004 | gmc | Shipping Information | medium |
| G005 | gmc | Product Identifiers | warning |

## Usage

```js
import { runRules } from '../rules/index.js'
import { scoreAudit } from '../services/scorer.js'

const auditData = await crawl(url)
const ruleResults = runRules(auditData)
const { score, issues, recommendations } = scoreAudit(ruleResults)
```

## Adding a New Rule

1. Create a file in the appropriate category folder
2. Export a rule object matching the structure above
3. Register it in `rules/index.js`
