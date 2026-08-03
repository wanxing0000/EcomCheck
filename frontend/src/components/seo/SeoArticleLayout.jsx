import RelatedSeoLinks from '../RelatedSeoLinks'
import SeoBreadcrumbs from '../SeoBreadcrumbs'
import CategoryBadges from './CategoryBadges'
import ContentSection from './ContentSection'
import CTASection from './CTASection'
import FAQSection from './FAQSection'
import TableOfContents from './TableOfContents'
import { buildTableOfContents, getPrimaryCategoryLabel } from '../../data/seoPages.js'

/**
 * Shared long-form SEO article layout for guides and blog posts.
 */
export default function SeoArticleLayout({ page, categoryLabel }) {
  const tocItems = buildTableOfContents(page.contentBlocks)
  const headerLabel = categoryLabel || getPrimaryCategoryLabel(page)

  return (
    <>
      <article className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <SeoBreadcrumbs items={page.breadcrumbs} />

          <header className="mt-8 border-b border-gray-100 pb-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">{headerLabel} Guide</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">{page.h1}</h1>
            <CategoryBadges categories={page.categories} className="mt-4" />
            {page.description && (
              <p className="mt-4 text-base leading-relaxed text-gray-600">{page.description}</p>
            )}
          </header>
        </div>

        <div className="mx-auto mt-10 grid max-w-6xl gap-10 lg:grid-cols-[minmax(0,1fr)_240px]">
          <div className="min-w-0 max-w-3xl lg:max-w-none">
            <ContentSection blocks={page.contentBlocks} />
            <CTASection relatedAudit={page.relatedAudit} auditCta={page.auditCta} className="mt-10" />
            <FAQSection faq={page.faq} className="mt-10" />
          </div>

          {tocItems.length > 0 && (
            <aside className="hidden lg:block">
              <div className="sticky top-24">
                <TableOfContents items={tocItems} />
              </div>
            </aside>
          )}
        </div>

        {tocItems.length > 0 && (
          <div className="mx-auto mt-8 max-w-3xl lg:hidden">
            <TableOfContents items={tocItems} />
          </div>
        )}
      </article>

      <RelatedSeoLinks page={page} titleGuides="Related Guides" titleTools="Related Audit Tools" />
    </>
  )
}
