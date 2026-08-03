/**
 * Table of contents for long-form SEO articles.
 * @param {{ items: Array<{ id: string, text: string, level: number }>, title?: string, className?: string }} props
 */
export default function TableOfContents({ items = [], title = 'On this page', className = '' }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Table of contents" className={`rounded-xl border border-gray-200 bg-gray-50/80 p-5 ${className}`}>
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <ol className="mt-3 space-y-2">
        {items.map((item) => (
          <li key={item.id} className={item.level === 3 ? 'ml-3 border-l border-gray-200 pl-3' : ''}>
            <a
              href={`#${item.id}`}
              className="text-sm leading-snug text-gray-600 transition-colors hover:text-emerald-700"
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  )
}
