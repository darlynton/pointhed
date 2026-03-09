import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft, Clock, ChevronRight } from 'lucide-react';
import { HelpSearch } from '../../components/help/HelpSearch';
import { HelpBreadcrumb } from '../../components/help/HelpBreadcrumb';
import { ArticleContent } from '../../components/help/ArticleContent';
import { getArticle, getCategoryBySlug } from '../../../lib/helpContent';

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
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAFA]/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-7xl mx-auto px-6 lg:px-12">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/">
              <img src="/uploads/logo.png" alt="Pointhed" className="h-5 w-auto" />
            </Link>
            <div className="flex items-center gap-6">
              <Link
                to={`/help/${category.slug}`}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">{category.title}</span>
              </Link>
              <Link
                to="/login"
                className="text-sm font-medium px-5 py-2.5 bg-[#264EFF] text-white rounded-full hover:bg-[#1a3ed9] transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </nav>

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

      {/* Footer */}
      <footer className="py-12 px-6 lg:px-12 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div>
              <img src="/uploads/logo-white.png" alt="Pointhed" className="h-5 w-auto" />
            </div>
            <div className="flex items-center gap-8 text-sm text-gray-400">
              <Link to="/help" className="hover:text-white transition-colors">Help Center</Link>
              <Link to="/privacy-policy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms-of-service" className="hover:text-white transition-colors">Terms of Service</Link>
            </div>
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Pointhed. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      <style>{`
        .font-sora { font-family: 'Sora', system-ui, sans-serif; }
      `}</style>
    </div>
  );
}
