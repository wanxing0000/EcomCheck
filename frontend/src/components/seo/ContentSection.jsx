import { getHeadingAnchorId } from '../../data/seoPages.js'

/**
 * Renders long-form content blocks with stable heading anchors for TOC links.
 * @param {{ blocks?: Array, className?: string, id?: string }} props
 */
export default function ContentSection({ blocks = [], className = '', id = 'article-content' }) {
  if (blocks.length === 0) return null

  const usedIds = new Set()

  return (
    <section id={id} className={`max-w-none ${className}`}>
      {blocks.map((block, index) => {
        if (block.type === 'paragraph') {
          return (
            <p key={index} className="mt-4 text-base leading-relaxed text-gray-700">
              {block.text}
            </p>
          )
        }

        if (block.type === 'heading') {
          const level = block.level || 2
          const Tag = level === 3 ? 'h3' : level === 4 ? 'h4' : 'h2'
          const anchorId = getHeadingAnchorId(block.text, block.id, usedIds)
          const sizeClass =
            level === 3
              ? 'mt-6 text-lg font-semibold text-gray-900'
              : level === 4
                ? 'mt-4 text-base font-semibold text-gray-900'
                : 'mt-10 scroll-mt-24 text-xl font-semibold text-gray-900'

          return (
            <Tag key={index} id={anchorId} className={sizeClass}>
              {block.text}
            </Tag>
          )
        }

        if (block.type === 'list') {
          const ListTag = block.ordered ? 'ol' : 'ul'
          const listClass = block.ordered ? 'mt-4 list-decimal space-y-2 pl-5' : 'mt-4 list-disc space-y-2 pl-5'

          return (
            <ListTag key={index} className={`${listClass} text-gray-700`}>
              {block.items.map((item) => (
                <li key={item} className="text-sm leading-relaxed">
                  {item}
                </li>
              ))}
            </ListTag>
          )
        }

        if (block.type === 'callout') {
          return (
            <aside
              key={index}
              className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50/50 px-4 py-4 text-sm leading-relaxed text-gray-700"
            >
              {block.title && <p className="font-semibold text-gray-900">{block.title}</p>}
              {block.text && <p className={block.title ? 'mt-2' : ''}>{block.text}</p>}
            </aside>
          )
        }

        return null
      })}
    </section>
  )
}
