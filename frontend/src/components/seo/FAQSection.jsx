/**
 * FAQ section for SEO guides and blog posts.
 * @param {{ faq?: { title?: string, items?: Array<{ q: string, a: string }> }, className?: string }} props
 */
export default function FAQSection({ faq, className = '' }) {
  if (!faq?.items?.length) return null

  return (
    <section className={`scroll-mt-24 border-t border-gray-100 pt-10 ${className}`} aria-labelledby="article-faq-heading">
      <h2 id="article-faq-heading" className="text-xl font-semibold text-gray-900">
        {faq.title || 'Frequently asked questions'}
      </h2>
      <dl className="mt-6 space-y-6">
        {faq.items.map((item) => (
          <div key={item.q} className="rounded-lg border border-gray-100 bg-gray-50/50 p-5">
            <dt className="text-sm font-semibold text-gray-900">{item.q}</dt>
            <dd className="mt-2 text-sm leading-relaxed text-gray-600">{item.a}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
