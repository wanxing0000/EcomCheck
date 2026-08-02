/** GMC product marketing copy — does not affect rule execution */

export const GMC_DAILY_FREE_LIMIT = 3

export const GMC_DETECTION_SCOPE = [
  {
    id: 'gmc-readiness',
    label: 'GMC Readiness',
    items: [
      'Product pricing & availability (G001–G002)',
      'Return, shipping & payment policies (G003–G004, G008, G010)',
      'Price consistency across product pages (G006)',
      'Business contact & purchase flow (G007, G009)',
    ],
  },
  {
    id: 'compliance-bundle',
    label: 'Compliance Bundle',
    items: [
      'Ads tracking & product JSON-LD (A001–A003)',
      'HTTPS, robots.txt & meta basics (K001–K004)',
      'Trust signals & policy page coverage (T001–T002, P001–P003)',
    ],
  },
]

export const GMC_PRO_PLACEHOLDER = {
  title: 'EcomCheck Pro',
  headline: 'Unlimited GMC Audits + monitoring',
  benefits: [
    'Unlimited daily GMC compliance scans',
    'Historical readiness tracking',
    'Priority fix recommendations',
  ],
  cta: 'Pro coming soon',
}

export const GMC_REPORT_CTA = {
  proTitle: 'Unlimited GMC Audits',
  proDescription:
    'Remove daily limits, track readiness over time, and re-scan after every fix.',
  proCta: 'Upgrade to Pro — coming soon',
}
