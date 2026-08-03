# AuditPilot Audit Regression Tests

Automated regression suite for `/api/audit`. Captures expected outcomes for known stores so future changes do not break existing detection, scoring, GMC, product scanning, or report generation.

## Prerequisites

1. Start the API locally:

```bash
npm run dev:api
```

2. In another terminal, run the suite:

```bash
npm run test:audit
```

## Configuration

### `sites.json`

Each entry defines a benchmark store:

| Field | Description |
|-------|-------------|
| `name` | Short label used in output |
| `url` | Store URL sent to `/api/audit` |
| `platform` | Expected detected platform (`shopify`, `woocommerce`, …) |
| `expect.gmc` | Expected GMC high-risk outcome (`true` = no high GMC issues) |
| `expect.productSchema` | Expected A003 Product JSON-LD result |
| `expect.refundPolicy` | Expected refund policy page detection |
| `expect.minScanned` | Optional minimum scanned product pages (default `1`) |

Update `expect` values when you intentionally change detection behavior. The goal is to lock in current correct behavior, not ideal compliance scores.

### Environment

| Variable | Default | Purpose |
|----------|---------|---------|
| `AUDITPILOT_API_URL` | `http://localhost:3000` | API base URL |
| `AUDITPILOT_AUDIT_TIMEOUT_MS` | `180000` | Per-site audit timeout |

Legacy aliases `ECOMCHECK_API_URL` and `ECOMCHECK_AUDIT_TIMEOUT_MS` are still supported.

## What Gets Checked

For every site:

- API health and audit response success
- Platform detection matches `sites.json`
- Product scan runs (`productsAudit.scannedPages`)
- GMC module returns score and rules
- Professional report payload is generated

Plus site-specific expectations from `expect`.

## Exit Codes

- `0` — all sites passed
- `1` — one or more sites failed or API unavailable
