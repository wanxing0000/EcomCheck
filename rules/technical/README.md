# Technical Rules

Rules for technical website requirements (HTTPS, SEO files, meta tags).

| ID | Name | Severity | Status |
|----|------|----------|--------|
| K001 | HTTPS | high | ✅ Implemented |
| K002 | Robots.txt | low | ✅ Implemented |
| K003 | Sitemap | low | ✅ Implemented |
| K004 | Meta Basic | medium | ✅ Implemented |

## Detection Sources

| Rule | Data Source |
|------|-------------|
| K001 | `auditData.url` protocol |
| K002 | `auditData.seo.robotsTxt.exists` |
| K003 | `auditData.seo.sitemap.exists` |
| K004 | `auditData.meta.title`, `.description`, `.ogImage` |
