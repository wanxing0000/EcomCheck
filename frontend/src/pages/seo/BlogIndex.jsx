import { Link } from 'react-router-dom'
import Card from '../../components/Card'
import CategoryBadges from '../../components/seo/CategoryBadges'
import RelatedSeoLinks from '../../components/RelatedSeoLinks'
import SeoMetadata from '../../components/SeoMetadata'
import {
  SEO_BLOG_INDEX,
  SEO_CONTENT_CATEGORIES,
  SEO_GUIDE_LINKS,
  getGuidesGroupedByCategory,
  listRegistryContent,
} from '../../data/seoPages.js'
import { getPlannedRoadmap } from '../../data/seoContentRoadmap.js'

export default function BlogIndex() {
  const blogPosts = listRegistryContent('blog')
  const guidesByCategory = getGuidesGroupedByCategory()
  const plannedContent = getPlannedRoadmap().slice(0, 3)

  return (
    <>
      <SeoMetadata
        title={SEO_BLOG_INDEX.title}
        description={SEO_BLOG_INDEX.metaDescription}
        canonicalPath={SEO_BLOG_INDEX.path}
      />

      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/" className="text-sm font-medium text-brand-600 hover:text-brand-700">
          ← Home
        </Link>

        <header className="mt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">Blog</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            {SEO_BLOG_INDEX.h1}
          </h1>
          <p className="mt-4 text-gray-600">{SEO_BLOG_INDEX.intro}</p>
        </header>

        <Card className="mt-10 border-dashed border-gray-200 bg-gray-50/80">
          <p className="text-sm font-medium text-gray-700">
            {blogPosts.length > 0 ? `${blogPosts.length} articles published` : 'Articles coming soon'}
          </p>
          <p className="mt-2 text-sm text-gray-500">
            {blogPosts.length > 0
              ? 'Browse the latest ecommerce audit insights below.'
              : 'Add entries to SEO_BLOG_POSTS in seoPages.js — same structure as guides — to publish without a database.'}
          </p>
        </Card>

        {blogPosts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-gray-900">Latest articles</h2>
            <ul className="mt-4 space-y-3">
              {blogPosts.map((post) => (
                <li key={post.slug}>
                  <Link to={post.path} className="block group">
                    <Card hover className="group-hover:border-brand-300">
                      <p className="text-sm font-medium text-gray-900 group-hover:text-brand-700">{post.h1}</p>
                      <p className="mt-1 text-xs text-gray-500">{post.description}</p>
                    </Card>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-lg font-semibold text-gray-900">Browse guides by category</h2>
          <div className="mt-6 space-y-8">
            {Object.entries(guidesByCategory).map(([categoryId, categoryGuides]) => (
              <div key={categoryId}>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {SEO_CONTENT_CATEGORIES[categoryId]?.label || categoryId}
                  </h3>
                  <span className="text-xs text-gray-400">({categoryGuides.length})</span>
                </div>
                <ul className="mt-3 space-y-3">
                  {categoryGuides.map((guide) => (
                    <li key={guide.slug}>
                      <Link to={guide.path} className="block group">
                        <Card hover className="group-hover:border-emerald-300">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-gray-900 group-hover:text-emerald-700">
                              {guide.h1}
                            </p>
                            <CategoryBadges categories={guide.categories} />
                          </div>
                          <p className="mt-2 text-xs text-gray-500">{guide.description}</p>
                        </Card>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>

        {plannedContent.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-semibold text-gray-900">Content roadmap (planned)</h2>
            <p className="mt-1 text-sm text-gray-500">Managed in seoContentRoadmap.js — no CMS required yet.</p>
            <ul className="mt-4 space-y-2">
              {plannedContent.map((entry) => (
                <li key={entry.slug} className="rounded-lg border border-dashed border-gray-200 bg-white px-4 py-3 text-sm">
                  <span className="font-medium text-gray-800">{entry.keyword}</span>
                  <span className="ml-2 text-xs text-gray-400">
                    {entry.contentType} · {entry.intent} · {entry.priority}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <RelatedSeoLinks
        relatedTools={['gmc', 'seo', 'shopify-gmc', 'woocommerce-gmc']}
        relatedGuides={Object.keys(SEO_GUIDE_LINKS)}
      />
    </>
  )
}
