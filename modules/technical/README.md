# Technical Audit Module

Core website technical compliance checks.

## Rules

| ID | Name | Severity |
|----|------|----------|
| K001 | HTTPS | high |
| K002 | Robots.txt | low |
| K003 | Sitemap | low |
| K004 | Meta Basic | medium |

## Entry point

`modules/technical/index.js` — exports `getRules()` and `run(auditData)`.
