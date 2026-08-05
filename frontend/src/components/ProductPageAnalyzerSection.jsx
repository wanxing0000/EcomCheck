import Card from './Card'

function SignalItem({ label, present }) {
  return (
    <li className={`text-sm ${present ? 'text-emerald-700' : 'text-gray-400'}`}>
      {present ? '✓' : '○'} {label}
    </li>
  )
}

function IssueItem({ label }) {
  return <li className="text-sm text-red-700">❌ {label}</li>
}

export default function ProductPageAnalyzerSection({ productAnalysis }) {
  const products = productAnalysis?.products || []
  const summary = productAnalysis?.summary

  if (!products.length) return null

  return (
    <Card className="mt-6 border-brand-100" data-testid="product-page-analyzer">
      <h2 className="text-lg font-semibold text-gray-900">Product Page Analysis</h2>
      <p className="mt-1 text-sm text-gray-500">
        Compliance-oriented signals extracted from high-confidence product pages.
      </p>

      <div className="mt-4 rounded-lg border border-gray-200 bg-gray-50/80 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Analyzed Products</p>
        <p className="mt-1 text-2xl font-bold text-gray-900">{summary?.analyzed ?? products.length}</p>
      </div>

      <div className="mt-5 space-y-4">
        {products.map((product) => (
          <div key={product.url} className="rounded-xl border border-gray-200 bg-white px-4 py-4">
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-sm font-medium text-brand-700 hover:underline"
            >
              {product.url}
            </a>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Signals</p>
                <ul className="mt-2 space-y-1">
                  <SignalItem label="Product schema" present={product.signals?.productSchema} />
                  <SignalItem label="Price" present={product.signals?.price} />
                  <SignalItem label="Description" present={product.signals?.description} />
                  <SignalItem label="Brand" present={product.signals?.brand} />
                  <SignalItem label="GTIN" present={product.signals?.gtin} />
                  <SignalItem label="SKU" present={product.signals?.sku} />
                  <SignalItem label="Add-to-cart" present={product.signals?.addToCart} />
                  <SignalItem label="Reviews" present={product.signals?.reviews} />
                </ul>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Issues</p>
                {product.issues?.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {product.issues.map((issue) => (
                      <IssueItem key={issue} label={issue} />
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-emerald-700">No major product signal gaps detected.</p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
