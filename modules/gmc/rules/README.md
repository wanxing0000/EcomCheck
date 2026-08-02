# GMC Rules

| ID | Name | Severity |
|----|------|----------|
| G001 | Product Price | high |
| G002 | Product Availability | high |
| G003 | Return Policy | high |
| G004 | Shipping Information | medium |
| G005 | Product Identifiers | warning |
| G006 | Product Price Consistency | high |
| G007 | Business Information | medium |
| G008 | Payment Information | medium (terms-only without payment → warning) |
| G009 | Product Purchase Flow | medium |
| G010 | Shipping Policy Quality | medium |

## Data sources

| Rule | Primary data |
|------|----------------|
| G001 | `productsAudit` price signals |
| G002 | `productsAudit` availability signals |
| G003 | `pages.refundPolicy` + `pageContent.refundPolicy.policyQuality` |
| G004 | `pages.shippingPolicy` existence |
| G005 | Product JSON-LD identifiers |
| G006 | `productsAudit.productPages[].priceConsistency` |
| G007 | `contactInfo` |
| G008 | `pages.paymentPolicy` + `pageContent.paymentPolicy.policyQuality` |
| G009 | `productsAudit.productPages[].signals` (addToCart / buyNow) |
| G010 | `pageContent.shippingPolicy.policyQuality` |

## Risk details (API)

`gmc.riskDetails` exposes metadata from G003, G006, G007, G008, G009, G010.
