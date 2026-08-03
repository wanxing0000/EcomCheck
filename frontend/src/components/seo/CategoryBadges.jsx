import { SEO_CONTENT_CATEGORIES, getCategoryMeta } from '../../data/seoPages.js'

/**
 * Category pills for SEO guides and blog posts.
 */
export default function CategoryBadges({ categories = [], className = '' }) {
  if (categories.length === 0) return null

  return (
    <ul className={`flex flex-wrap gap-2 ${className}`}>
      {categories.map((categoryId) => {
        const meta = getCategoryMeta(categoryId)
        if (!meta) return null

        return (
          <li
            key={categoryId}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${meta.accent}`}
          >
            {meta.label}
          </li>
        )
      })}
    </ul>
  )
}
