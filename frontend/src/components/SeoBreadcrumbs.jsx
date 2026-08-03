import { Link } from 'react-router-dom'

/**
 * Visible breadcrumb navigation for users and crawlers.
 * @param {{ items: Array<{ label: string, path?: string }> }} props
 */
export default function SeoBreadcrumbs({ items = [] }) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="text-sm text-gray-500">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1

          return (
            <li key={`${item.label}-${index}`} className="flex items-center gap-1">
              {index > 0 && <span aria-hidden="true" className="text-gray-300">/</span>}
              {item.path && !isLast ? (
                <Link to={item.path} className="font-medium text-gray-600 hover:text-gray-900">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'font-medium text-gray-900' : 'text-gray-600'} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
