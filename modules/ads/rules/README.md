# Ads Rules

Rules for Google Merchant Center and Meta Ads advertising readiness.

| ID | Name | Severity | Status |
|----|------|----------|--------|
| A001 | Meta Pixel Detection | medium | ✅ Implemented (Meta Ads Audit only — excluded from GMC bundle) |
| A002 | Google Tag Detection | medium | ✅ Implemented |
| A003 | Product JSON-LD Detection | high | ✅ Implemented |

## Data Sources

| Rule | Field |
|------|-------|
| A001 | `auditData.ads.metaPixel` |
| A002 | `auditData.ads.googleTag` |
| A003 | `auditData.ads.products` |

Detection is performed on homepage HTML and up to 5 product detail pages (Phase 3.5).
