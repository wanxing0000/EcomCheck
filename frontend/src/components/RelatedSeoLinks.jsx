import { Link } from 'react-router-dom'
import Card from './Card'
import { resolveRelatedGuides, resolveRelatedTools } from '../data/seoPages.js'
import { getRelatedContentRecommendations } from '../utils/relatedContent.js'

/**
 * Related tools and guides — uses recommendation engine when `page` is provided.
 */
export default function RelatedSeoLinks({
  page = null,
  relatedTools = [],
  relatedGuides = [],
  titleTools = 'Related Tools',
  titleGuides = 'Related Guides',
}) {
  const recommendations = page
    ? getRelatedContentRecommendations(page)
    : {
        tools: resolveRelatedTools(relatedTools),
        guides: resolveRelatedGuides(relatedGuides),
      }

  const tools = recommendations.tools
  const guides = recommendations.guides

  if (tools.length === 0 && guides.length === 0) return null

  return (
    <section className="border-t border-gray-100 bg-gray-50/50 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 md:grid-cols-2">
          {tools.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{titleTools}</h2>
              <ul className="mt-4 space-y-3">
                {tools.map((tool) => (
                  <li key={tool.id}>
                    {tool.comingSoon ? (
                      <Card className="border-dashed border-gray-200 bg-white/80 opacity-80">
                        <p className="text-sm font-medium text-gray-700">{tool.label}</p>
                        <p className="mt-1 text-xs text-gray-500">{tool.description}</p>
                        <span className="mt-2 inline-block text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                          Coming soon
                        </span>
                      </Card>
                    ) : (
                      <Link to={tool.path} className="block group">
                        <Card hover className="transition-colors group-hover:border-brand-300">
                          <p className="text-sm font-medium text-gray-900 group-hover:text-brand-700">
                            {tool.label}
                          </p>
                          <p className="mt-1 text-xs text-gray-500">{tool.description}</p>
                        </Card>
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {guides.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{titleGuides}</h2>
              <ul className="mt-4 space-y-3">
                {guides.map((guide) => (
                  <li key={guide.id}>
                    <Link to={guide.path} className="block group">
                      <Card hover className="transition-colors group-hover:border-emerald-300">
                        <p className="text-sm font-medium text-gray-900 group-hover:text-emerald-700">
                          {guide.label}
                        </p>
                        <p className="mt-1 text-xs text-gray-500">{guide.description}</p>
                      </Card>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
