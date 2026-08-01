import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import Button from '../components/Button'
import Card from '../components/Card'

function formatNumber(n) {
  return n?.toLocaleString?.('en-US') ?? '0'
}

const PAGE_LABELS = {
  aboutUs: 'About Us',
  contactUs: 'Contact Us',
  privacyPolicy: 'Privacy Policy',
  refundPolicy: 'Refund Policy',
  shippingPolicy: 'Shipping Policy',
}

function StatusBadge({ found }) {
  return (
    <span
      className={[
        'inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium',
        found ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500',
      ].join(' ')}
    >
      {found ? 'Found' : 'Not found'}
    </span>
  )
}

function PlatformBadge({ platform }) {
  if (!platform?.name) {
    return <span className="text-sm text-gray-500">Unknown</span>
  }

  const labels = {
    shopify: 'Shopify',
    woocommerce: 'WooCommerce',
    wordpress: 'WordPress',
  }

  return (
    <span className="inline-flex items-center gap-2">
      <span className="rounded-full bg-brand-100 px-3 py-1 text-sm font-medium text-brand-700">
        {labels[platform.name] || platform.name}
      </span>
      {platform.confidence && platform.confidence !== 'none' && (
        <span className="text-xs text-gray-400 capitalize">{platform.confidence} confidence</span>
      )}
    </span>
  )
}

export default function Report() {
  const location = useLocation()
  const navigate = useNavigate()
  const url = location.state?.url
  const crawlResult = location.state?.crawlResult

  useEffect(() => {
    if (!url || !crawlResult) {
      navigate('/', { replace: true })
    }
  }, [url, crawlResult, navigate])

  if (!url || !crawlResult) return null

  const { platform, pages, seo, meta, links, pageContent, contactInfo, score, issues, recommendations, rules, productsAudit, gmc } = crawlResult

  const adsRules = rules?.filter((r) => r.category === 'ads') ?? []
  const gmcScoreColor = gmc?.score >= 80 ? '#22c55e' : gmc?.score >= 60 ? '#f59e0b' : '#ef4444'

  const scoreColor = score >= 80 ? '#22c55e' : score >= 60 ? '#f59e0b' : '#ef4444'

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-medium text-brand-600">Audit Report</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">
            Website Analysis
          </h1>
          <p className="mt-2 break-all text-gray-500">{crawlResult.url || url}</p>
          <p className="mt-1 text-xs text-gray-400">
            Scanned on{' '}
            {new Date().toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>

        {score != null && (
          <div className="flex flex-col items-center">
            <div
              className="flex h-28 w-28 items-center justify-center rounded-full border-8"
              style={{ borderColor: scoreColor }}
            >
              <span className="text-3xl font-bold text-gray-900">{score}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-gray-600">Compliance Score</p>
            <p className="text-xs text-gray-400">
              {issues?.length ?? 0} issue{(issues?.length ?? 0) !== 1 ? 's' : ''} found
            </p>
          </div>
        )}
      </div>

      {/* Issues & Recommendations */}
      {(issues?.length > 0 || recommendations?.length > 0) && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Compliance Issues</h2>
          {issues?.length > 0 && (
            <ul className="mt-4 space-y-3">
              {issues.map((issue) => (
                <li
                  key={issue.id}
                  className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
                >
                  <span className="mt-0.5 shrink-0 rounded bg-red-200 px-1.5 py-0.5 text-xs font-bold text-red-700">
                    {issue.id}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-red-900">{issue.name}</p>
                    <p className="mt-0.5 text-sm text-red-700">{issue.message}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {recommendations?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">Recommendations</h3>
              <ul className="mt-2 space-y-2">
                {recommendations.map((rec) => (
                  <li key={rec.id} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="shrink-0 font-medium uppercase text-amber-600">{rec.priority}</span>
                    <span>{rec.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {score === 100 && (
        <Card className="mt-6 border-green-200 bg-green-50">
          <p className="text-sm font-medium text-green-800">
            All compliance checks passed for the current rule set.
          </p>
        </Card>
      )}

      {/* GMC Compliance */}
      {gmc && (
        <Card className="mt-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">GMC Compliance</h2>
              <p className="mt-1 text-sm text-gray-500">
                Google Merchant Center readiness checks.
              </p>
            </div>
            <div className="flex flex-col items-center">
              <div
                className="flex h-20 w-20 items-center justify-center rounded-full border-[6px]"
                style={{ borderColor: gmcScoreColor }}
              >
                <span className="text-2xl font-bold text-gray-900">{gmc.score}</span>
              </div>
              <p className="mt-1 text-xs font-medium text-gray-600">GMC Score</p>
              <p className="text-xs text-gray-400">
                {gmc.summary?.passed ?? 0}/{gmc.summary?.total ?? 0} passed
              </p>
            </div>
          </div>

          {gmc.passedRules?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">Passed Rules</h3>
              <ul className="mt-2 space-y-2">
                {gmc.passedRules.map((rule) => (
                  <li key={rule.id} className="flex items-start gap-2 text-sm text-green-700">
                    <span className="shrink-0 rounded bg-green-100 px-1.5 py-0.5 text-xs font-bold">{rule.id}</span>
                    <span>{rule.message}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gmc.issues?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">Issues</h3>
              <ul className="mt-2 space-y-2">
                {gmc.issues.map((issue) => (
                  <li key={issue.id} className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm">
                    <span className="shrink-0 rounded bg-red-200 px-1.5 py-0.5 text-xs font-bold text-red-700">{issue.id}</span>
                    <div>
                      <p className="font-medium text-red-900">{issue.name}</p>
                      <p className="text-red-700">{issue.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gmc.warnings?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">Warnings</h3>
              <ul className="mt-2 space-y-2">
                {gmc.warnings.map((warn) => (
                  <li key={warn.id} className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
                    <span className="shrink-0 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-bold text-amber-800">{warn.id}</span>
                    <div>
                      <p className="font-medium text-amber-900">{warn.name}</p>
                      <p className="text-amber-800">{warn.message}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {gmc.recommendations?.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-gray-900">Recommendations</h3>
              <ul className="mt-2 space-y-2">
                {gmc.recommendations.map((rec) => (
                  <li key={rec.id} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="shrink-0 font-medium uppercase text-amber-600">{rec.priority}</span>
                    <span>{rec.text}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {/* GMC Risk Details */}
      {gmc?.riskDetails && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">GMC Risk Details</h2>
          <p className="mt-1 text-sm text-gray-500">
            Deep quality signals for return policy, price consistency, and business trust.
          </p>

          {gmc.riskDetails.returnPolicy && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Return Policy Quality</h3>
              <p className="mt-1 text-sm text-gray-600">
                Quality score: <span className="font-medium">{gmc.riskDetails.returnPolicy.qualityScore ?? 0}/100</span>
                {' · '}
                Text length: {formatNumber(gmc.riskDetails.returnPolicy.textLength ?? 0)} chars
              </p>
              {gmc.riskDetails.returnPolicy.checks && (
                <dl className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(gmc.riskDetails.returnPolicy.checks).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between text-sm">
                      <dt className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</dt>
                      <dd className={value ? 'font-medium text-green-700' : 'font-medium text-amber-700'}>
                        {value ? 'Yes' : 'No'}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {gmc.riskDetails.returnPolicy.risks?.length > 0 && (
                <ul className="mt-3 space-y-1 text-sm text-amber-800">
                  {gmc.riskDetails.returnPolicy.risks.map((risk) => (
                    <li key={risk}>• {risk}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {gmc.riskDetails.priceConsistency && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Price Consistency</h3>
              <p className="mt-1 text-sm text-gray-600">
                Compared {gmc.riskDetails.priceConsistency.compared ?? 0} of{' '}
                {gmc.riskDetails.priceConsistency.checked ?? 0} scanned pages ·{' '}
                {gmc.riskDetails.priceConsistency.consistent ?? 0} consistent
              </p>
              {gmc.riskDetails.priceConsistency.inconsistent?.length > 0 ? (
                <ul className="mt-3 space-y-2 text-sm">
                  {gmc.riskDetails.priceConsistency.inconsistent.map((item) => (
                    <li key={item.url} className="rounded border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
                      <p className="truncate font-medium">{item.url}</p>
                      <p className="mt-0.5">
                        Schema: {item.schemaPrice} · Displayed: {item.displayPrice}
                        {item.currency ? ` ${item.currency}` : ''}
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-green-700">No price mismatches detected on comparable product pages.</p>
              )}
            </div>
          )}

          {gmc.riskDetails.businessInformation && (
            <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
              <h3 className="text-sm font-semibold text-gray-900">Business Information</h3>
              <dl className="mt-3 grid gap-3 sm:grid-cols-3">
                <div>
                  <dt className="text-xs text-gray-500">Email</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {gmc.riskDetails.businessInformation.email ? 'Found' : 'Missing'}
                  </dd>
                  {gmc.riskDetails.businessInformation.details?.emails?.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {gmc.riskDetails.businessInformation.details.emails[0]}
                    </p>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Phone</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {gmc.riskDetails.businessInformation.phone ? 'Found' : 'Missing'}
                  </dd>
                  {gmc.riskDetails.businessInformation.details?.phones?.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {gmc.riskDetails.businessInformation.details.phones[0]}
                    </p>
                  )}
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm font-medium text-gray-900">
                    {gmc.riskDetails.businessInformation.address ? 'Found' : 'Missing'}
                  </dd>
                  {gmc.riskDetails.businessInformation.details?.addresses?.length > 0 && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">
                      {gmc.riskDetails.businessInformation.details.addresses[0]}
                    </p>
                  )}
                </div>
              </dl>
              {gmc.riskDetails.businessInformation.missing?.length > 0 && (
                <p className="mt-3 text-sm text-amber-800">
                  Missing: {gmc.riskDetails.businessInformation.missing.join(', ')}
                </p>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Ads Compliance */}
      {adsRules.length > 0 && (
        <Card className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900">Ads Compliance</h2>
          <p className="mt-1 text-sm text-gray-500">
            Google Merchant Center and Meta Ads tracking checks.
          </p>
          <ul className="mt-4 divide-y divide-gray-100">
            {adsRules.map((rule) => (
              <li key={rule.id} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-brand-100 px-1.5 py-0.5 text-xs font-bold text-brand-700">
                      {rule.id}
                    </span>
                    <p className="text-sm font-medium text-gray-900">{rule.name}</p>
                  </div>
                  <p className="mt-1 text-sm text-gray-600">{rule.message}</p>
                  {!rule.passed && rule.recommendation && (
                    <p className="mt-1 text-xs text-gray-500">{rule.recommendation}</p>
                  )}
                </div>
                <StatusBadge found={rule.passed} />
              </li>
            ))}
          </ul>

          {productsAudit && (
            <div className="mt-6 border-t border-gray-100 pt-4">
              <h3 className="text-sm font-semibold text-gray-900">Product Page Analysis</h3>
              <p className="mt-1 text-xs text-gray-500">
                Candidate pages scored by URL patterns and shopping signals, then top pages scanned.
              </p>
              <dl className="mt-3 grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                <div>
                  <dt className="text-xs text-gray-500">Candidates</dt>
                  <dd className="text-lg font-semibold text-gray-900">{productsAudit.candidateCount ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Scanned</dt>
                  <dd className="text-lg font-semibold text-gray-900">{productsAudit.scannedPages ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Product Schema</dt>
                  <dd className="text-lg font-semibold text-gray-900">{productsAudit.summary?.withSchema ?? productsAudit.detectedProducts ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Price Detected</dt>
                  <dd className="text-lg font-semibold text-gray-900">{productsAudit.summary?.withPrice ?? 0}</dd>
                </div>
                <div>
                  <dt className="text-xs text-gray-500">Add to Cart</dt>
                  <dd className="text-lg font-semibold text-gray-900">{productsAudit.summary?.withAddToCart ?? 0}</dd>
                </div>
              </dl>
              {productsAudit.missingFields?.length > 0 && (
                <p className="mt-3 text-sm text-amber-700">
                  Missing required fields: {productsAudit.missingFields.join(', ')}
                </p>
              )}
              {productsAudit.productPages?.length > 0 && (
                <ul className="mt-3 space-y-2 text-xs text-gray-500">
                  {productsAudit.productPages.slice(0, 5).map((page) => (
                    <li key={page.url}>
                      <div className="truncate">
                        {page.valid ? '✓' : page.hasProductSchema ? '!' : '✗'} score {page.score ?? '—'} — {page.url}
                      </div>
                      {page.signals && (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {page.signals.schema && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">schema</span>}
                          {page.signals.price && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">price</span>}
                          {page.signals.addToCart && <span className="rounded bg-green-100 px-1.5 py-0.5 text-green-700">addToCart</span>}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Platform */}
      <Card className="mt-10">
        <h2 className="text-lg font-semibold text-gray-900">Platform Detection</h2>
        <div className="mt-4">
          <PlatformBadge platform={platform} />
        </div>
      </Card>

      {/* Key Pages */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Key Pages</h2>
        <p className="mt-1 text-sm text-gray-500">
          Policy and informational pages identified from links and page content.
        </p>
        <ul className="mt-4 divide-y divide-gray-100">
          {Object.entries(PAGE_LABELS).map(([key, label]) => {
            const page = pages?.[key]
            return (
              <li key={key} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  {page?.url && (
                    <p className="mt-0.5 truncate text-xs text-gray-500">{page.url}</p>
                  )}
                </div>
                <StatusBadge found={page?.found} />
              </li>
            )
          })}
        </ul>
      </Card>

      {/* Contact Info */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Contact Information</h2>
        <p className="mt-1 text-sm text-gray-500">
          Detected from homepage and key pages.
        </p>
        <dl className="mt-4 space-y-4">
          <div>
            <dt className="text-sm font-medium text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {contactInfo?.emails?.length > 0
                ? contactInfo.emails.join(', ')
                : '(not found)'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Phone</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {contactInfo?.phones?.length > 0
                ? contactInfo.phones.join(', ')
                : '(not found)'}
            </dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Address</dt>
            <dd className="mt-1 text-sm text-gray-900">
              {contactInfo?.addresses?.length > 0
                ? contactInfo.addresses.join('; ')
                : '(not found)'}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Page Content */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Page Content Analysis</h2>
        <p className="mt-1 text-sm text-gray-500">
          Content extracted from discovered key pages.
        </p>
        <ul className="mt-4 divide-y divide-gray-100">
          {Object.entries(PAGE_LABELS).map(([key, label]) => {
            const content = pageContent?.[key]
            if (!content) return null
            return (
              <li key={key} className="py-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">{label}</p>
                  <StatusBadge found={content.fetched} />
                </div>
                {content.fetched ? (
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex gap-2">
                      <dt className="text-gray-500 shrink-0">Title:</dt>
                      <dd className="text-gray-900 truncate">{content.title || '(empty)'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-gray-500 shrink-0">H1:</dt>
                      <dd className="text-gray-900 truncate">{content.h1 || '(empty)'}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="text-gray-500 shrink-0">Text length:</dt>
                      <dd className="text-gray-900">{formatNumber(content.textLength)} chars</dd>
                    </div>
                    {content.keywords?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {content.keywords.slice(0, 6).map(({ word, count }) => (
                          <span
                            key={word}
                            className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600"
                          >
                            {word} ({count})
                          </span>
                        ))}
                      </div>
                    )}
                  </dl>
                ) : (
                  <p className="mt-1 text-xs text-gray-400">
                    {content.error || 'Page not found or could not be fetched'}
                  </p>
                )}
              </li>
            )
          })}
        </ul>
      </Card>

      {/* SEO */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">SEO Basics</h2>
        <dl className="mt-4 divide-y divide-gray-100">
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-gray-500">robots.txt</dt>
            <dd className="flex items-center gap-2">
              <StatusBadge found={seo?.robotsTxt?.exists} />
              {seo?.robotsTxt?.statusCode && (
                <span className="text-xs text-gray-400">HTTP {seo.robotsTxt.statusCode}</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between py-3">
            <dt className="text-sm text-gray-500">sitemap.xml</dt>
            <dd className="flex items-center gap-2">
              <StatusBadge found={seo?.sitemap?.exists} />
              {seo?.sitemap?.statusCode && (
                <span className="text-xs text-gray-400">HTTP {seo.sitemap.statusCode}</span>
              )}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Meta */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Meta Information</h2>
        <dl className="mt-4 divide-y divide-gray-100">
          {[
            { label: 'Title', value: meta?.title || crawlResult.title },
            { label: 'Description', value: meta?.description || crawlResult.description },
            { label: 'OG Title', value: meta?.ogTitle },
            { label: 'OG Description', value: meta?.ogDescription },
            { label: 'OG Image', value: meta?.ogImage },
            { label: 'Canonical', value: meta?.canonical },
            { label: 'Viewport', value: meta?.viewport },
            { label: 'Robots Meta', value: meta?.robots },
            { label: 'Generator', value: meta?.generator },
          ].map(({ label, value }) => (
            <div key={label} className="py-3 sm:grid sm:grid-cols-3 sm:gap-4">
              <dt className="text-sm font-medium text-gray-500">{label}</dt>
              <dd className="mt-1 break-all text-sm text-gray-900 sm:col-span-2 sm:mt-0">
                {value || '(not found)'}
              </dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Links summary */}
      <Card className="mt-6">
        <h2 className="text-lg font-semibold text-gray-900">Link Discovery</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="text-sm text-gray-500">Total Links</dt>
            <dd className="text-2xl font-semibold text-gray-900">{formatNumber(links?.total ?? crawlResult.linksCount)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">Internal</dt>
            <dd className="text-2xl font-semibold text-gray-900">{formatNumber(links?.internal)}</dd>
          </div>
          <div>
            <dt className="text-sm text-gray-500">External</dt>
            <dd className="text-2xl font-semibold text-gray-900">{formatNumber(links?.external)}</dd>
          </div>
        </dl>
        {links?.discovered?.length > 0 && (
          <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-xs text-gray-500">
            {links.discovered.map((link) => (
              <li key={link.url} className="truncate">
                {link.text ? `${link.text} → ` : ''}{link.path}
              </li>
            ))}
          </ul>
        )}
      </Card>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link to="/">
          <Button variant="primary" size="lg">
            Scan Another Store
          </Button>
        </Link>
      </div>
    </div>
  )
}
