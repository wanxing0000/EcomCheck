# Google Merchant Center Rules

GMC-specific compliance checks for Google Shopping listings.

| ID | Name | Severity | Status |
|----|------|----------|--------|
| G001 | Product Price | high | ✅ Implemented |
| G002 | Product Availability | high | ✅ Implemented |
| G003 | Return Policy | high | ✅ Quality analysis (Phase 4.1) |
| G004 | Shipping Information | medium | ✅ Implemented |
| G005 | Product Identifiers | warning | ✅ Implemented |
| G006 | Product Price Consistency | warning | ✅ Implemented |
| G007 | Business Information | medium | ✅ Implemented |

## Data Sources

| Rule | Source |
|------|--------|
| G001 | `productsAudit` price signals / Product JSON-LD |
| G002 | `productsAudit` availability signals |
| G003 | `pages.refundPolicy` + `pageContent.refundPolicy.policyQuality` |
| G004 | `pages.shippingPolicy` |
| G005 | Product JSON-LD fields: brand, sku, gtin, mpn |
| G006 | `productsAudit.productPages[].priceConsistency` |
| G007 | `contactInfo` (email, phone, address) |

## API: `gmc.riskDetails`

| Field | Source Rule |
|-------|-------------|
| `returnPolicy` | G003 `policyQuality` |
| `priceConsistency` | G006 `priceRisks` |
| `businessInformation` | G007 `businessInfo` |
