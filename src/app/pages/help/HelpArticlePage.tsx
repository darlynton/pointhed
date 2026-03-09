import { Link, useParams, Navigate } from 'react-router-dom';
import { Clock, ChevronRight } from 'lucide-react';
import { HelpSearch } from '../../components/help/HelpSearch';
import { HelpBreadcrumb } from '../../components/help/HelpBreadcrumb';
import { ArticleContent } from '../../components/help/ArticleContent';
import { getArticle } from '../../../lib/helpContent';
import { PublicNav } from '../../components/PublicNav';
import { PublicFooter } from '../../components/PublicFooter';

export default function HelpArticlePage() {
  const { categorySlug, articleSlug } = useParams<{ categorySlug: string; articleSlug: string }>();
  const result = categorySlug && articleSlug ? getArticle(categorySlug, articleSlug) : undefined;

  if (!result) {
    return <Navigate to="/help" replace />;
  }

  const { category, article } = result;

  // Other articles in same category (excluding current)
  const relatedArticles = category.articles.filter((a) => a.slug !== article.slug);

  return (
    <div className="min-h-screen bg-[#FAFAFA]" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
      <PublicNav />

      {/* Article */}
      <main className="pt-32 lg:pt-36 pb-24 px-6 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Main content */}
            <article className="flex-1 min-w-0 max-w-3xl">
              <HelpBreadcrumb
                items={[
                  { label: 'Help Center', to: '/help' },
                  { label: category.title, to: `/help/${category.slug}` },
                  { label: article.title },
                ]}
              />

              <h1 className="font-sora text-3xl lg:text-4xl font-semibold tracking-tight text-gray-900 mt-6 mb-3">
                {article.title}
              </h1>

              <div className="flex items-center gap-4 mb-8">
                <span className="flex items-center gap-1.5 text-sm text-gray-400">
                  <Clock className="w-3.5 h-3.5" />
                  Updated {new Date(article.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </div>

              <div className="bg-white border border-gray-200 rounded-2xl p-6 lg:p-10">
                <ArticleContent html={article.body} />
              </div>

              {/* Feedback */}
              <div className="mt-8 p-6 bg-white border border-gray-200 rounded-2xl text-center">
                <p className="text-sm text-gray-600 mb-3">Was this article helpful?</p>
                <div className="flex items-center justify-center gap-3">
                  <button className="px-5 py-2 text-sm font-medium border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                    👍 Yes
                  </button>
                  <button className="px-5 py-2 text-sm font-medium border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
                    👎 No
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Need more help? <a href="mailto:support@pointhed.com" className="text-[#264EFF] hover:underline">Contact support</a>
                </p>
              </div>
            </article>

            {/* Sidebar */}
            <aside className="lg:w-72 flex-shrink-0">
              <div className="lg:sticky lg:top-28">
                <HelpSearch compact />

                {relatedArticles.length > 0 && (
                  <div className="mt-8">
                    <h3 className="text-sm font-semibold text-gray-900 mb-3">
                      More in {category.title}
                    </h3>
                    <div className="space-y-1">
                      {relatedArticles.map((a) => (
                        <Link
                          key={a.slug}
                          to={`/help/${category.slug}/${a.slug}`}
                          className="flex items-center gap-2 py-2.5 px-3 text-sm text-gray-600 hover:text-[#264EFF] hover:bg-[#264EFF]/5 rounded-lg transition-colors"
                        >
                          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" />
                          <span className="truncate">{a.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-8 p-4 bg-[#264EFF]/5 rounded-xl">
                  <p className="text-sm font-medium text-gray-900 mb-1">Need help?</p>
                  <p className="text-xs text-gray-500 mb-3">Our team responds within 24 hours.</p>
                  <a
                    href="mailto:support@pointhed.com"
                    className="inline-block text-xs font-medium text-[#264EFF] hover:underline"
                  >
                    support@pointhed.com →
                  </a>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <PublicFooter />

      <style>{`
        .font-sora { font-family: 'Sora', system-ui, sans-serif; }
      `}</style>
    </div>
  );
}
