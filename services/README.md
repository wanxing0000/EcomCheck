# EcomCheck Services

This directory is reserved for backend service modules.

## Planned Services

| Service | Description | Status |
|---------|-------------|--------|
| `crawler.js` | Website fetching, link discovery, platform & page detection | ✅ Phase 2.3 |
| `pageContent.js` | Cheerio-based content parsing & contact extraction | ✅ Phase 2.3 |
| `analyzer.js` | Page content and structure analysis |
| `scorer.js` | Compliance scoring engine |
| `scorer.js` | Compliance scoring engine | ✅ Phase 3.1 |

## Usage

Services will be imported by the API layer in `/api` and orchestrated to perform full website audits.
