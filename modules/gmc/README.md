# GMC Audit Module

Google Merchant Center compliance checks for Google Shopping listings.

## Rules

| ID | Name | Severity |
|----|------|----------|
| G001 | Product Price | high |
| G002 | Product Availability | high |
| G003 | Return Policy | high |
| G004 | Shipping Information | medium |
| G005 | Product Identifiers | warning |
| G006 | Product Price Consistency | high |
| G007 | Business Information | medium |

## Entry point

`modules/gmc/index.js` — exports `getRules()` and `run(auditData)`.

## API mapping

Legacy `data.gmc` is built from this module's output plus `riskDetails` (G003/G006/G007 metadata).
