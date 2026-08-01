# EcomCheck

**Website compliance and advertising readiness audit tool**

EcomCheck helps e-commerce store owners evaluate whether their website is ready for paid advertising on **Google Merchant Center** and **Meta Ads** (Facebook/Instagram). Enter your store URL, and get a comprehensive audit report with actionable recommendations.

---

## Project Status

**Phase 1 — Foundation & UI** (current)

- Project structure and frontend UI
- Mock data for scan and report flows
- Basic routing and reusable components

**Not yet implemented:**

- Website crawling / URL analysis
- AI-powered insights
- Database persistence
- User authentication
- Payment / subscription system

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, Vite 6, Tailwind CSS 3 |
| Routing | React Router v6 |
| Backend | Node.js (placeholder in `/api`) |
| Services | Reserved in `/services` |
| Rules | Reserved in `/rules` |

---

## Project Structure

```
ecomcheck/
├── frontend/               # React + Vite frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # Navbar, Footer, Button, Card
│   │   ├── pages/          # Home, Scan, Report
│   │   └── styles/         # Global CSS & Tailwind
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
├── api/                    # Node.js API (placeholder)
│   ├── index.js
│   └── package.json
├── services/               # Backend service modules (reserved)
├── rules/                  # Compliance rule definitions (reserved)
└── README.md
```

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- npm (comes with Node.js)

### Run the Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Run the API

```bash
# From project root (recommended)
npm install
npm run dev:api
```

Or from the `api/` directory:

```bash
cd api
npm run dev
```

Health check: [http://localhost:3000/api/health](http://localhost:3000/api/health)

### Run Frontend + API together (local)

```bash
# Terminal 1
npm run dev:api

# Terminal 2
npm run dev:frontend
```

Or simulate Vercel locally:

```bash
npm i -g vercel
vercel dev
```

### Build for Production

```bash
npm run build
```

### Deploy to Vercel

1. Push the repo to GitHub
2. Import the project in [Vercel Dashboard](https://vercel.com/new)
3. Use the root directory (where `vercel.json` lives) — do **not** set root to `frontend/`
4. Deploy — Vercel builds `frontend/dist` and deploys `api/*.js` as Serverless Functions

| Path | Handler |
|------|---------|
| `GET /api/health` | `api/health.js` |
| `POST /api/audit` | `api/audit.js` |
| `/*` (SPA) | `frontend/dist/index.html` |

---

## Pages & Routes

| Route | Page | Description |
|-------|------|-------------|
| `/` | Home | Landing page with URL input and "Start Audit" button |
| `/scan` | Scan | Simulated scanning progress animation |
| `/report` | Report | Mock audit report with scores and recommendations |

---

## Development Roadmap

### Phase 2 — Website Crawler
- Fetch and parse store pages (homepage, product, policy pages)
- Detect platform (Shopify, WooCommerce, etc.)
- Extract structured data (JSON-LD, Open Graph)

### Phase 3 — Compliance Engine
- Implement rule checks in `/rules`
- Google Merchant Center compliance scoring
- Meta Ads readiness scoring
- Connect frontend to real API endpoints

### Phase 4 — Enhanced Reporting
- Detailed per-page findings
- PDF export
- Shareable report links

### Phase 5 — Platform Features
- User accounts and audit history
- Subscription tiers
- AI-powered recommendations

---

## License

Private — All rights reserved.
