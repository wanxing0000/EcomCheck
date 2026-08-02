# SEO Audit Module

On-page and technical SEO checks for e-commerce storefronts.

## Rules

| ID | Name | Severity |
|----|------|----------|
| S001 | Title Tag | medium |
| S002 | Meta Description | medium |
| S003 | H1 Structure | medium |
| S004 | Canonical URL | low |
| S005 | Open Graph Tags | low |
| S006 | Organization Schema | low |
| S007 | Product Schema | medium |
| S008 | Robots & Sitemap | medium |

## Data sources

- `auditData.meta` — title, description, canonical, og:*
- `auditData.seo.homepage` — h1Count, titleLength, descriptionLength
- `auditData.seo.structuredData` — organization, product, breadcrumb
- `auditData.seo.robotsTxt` / `auditData.seo.sitemap`
- `auditData.productsAudit` — product schema counts (S007)

## Entry point

`modules/seo/index.js` — exports `getRules()` and `run(context)`.
