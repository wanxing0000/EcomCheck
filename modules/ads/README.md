# Ads Audit Module

Advertising and conversion tracking readiness.

## Rules

| ID | Name | Severity |
|----|------|----------|
| A001 | Meta Pixel Detection | medium |
| A002 | Google Tag Detection | medium |
| A003 | Product JSON-LD Detection | high |

## Entry point

`modules/ads/index.js` — exports `getRules()` and `run(auditData)`.
