import { Link, useParams, Navigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { HelpSearch } from '../../components/help/HelpSearch';
import { HelpBreadcrumb } from '../../components/help/HelpBreadcrumb';
import { ArticleCard } from '../../components/help/ArticleCard';
import { getCategoryBySlug } from '../../../lib/helpContent';

export default function HelpCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const category = categorySlug ? getCategoryBySlug(categorySlug) : undefined;

  if (!category) {
    return <Navigate to="/help" replace />;
  }

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
                to="/help"
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">All Topics</span>
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

      {/* Header */}
      <section className="pt-32 lg:pt-36 pb-8 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <HelpBreadcrumb
            items={[
              { label: 'Help Center', to: '/help' },
              { label: category.title },
            ]}
          />
          <h1 className="font-sora text-3xl lg:text-4xl font-semibold tracking-tight text-gray-900 mt-6 mb-2">
            {category.title}
          </h1>
          <p className="text-lg text-gray-500 mb-8">{category.description}</p>
          <HelpSearch compact />
        </div>
      </section>

      {/* Article List */}
      <section className="pb-24 px-6 lg:px-12">
        <div className="max-w-3xl mx-auto">
          <div className="space-y-3 mt-6">
            {category.articles.map((article) => (
              <ArticleCard
                key={article.slug}
                article={article}
                categorySlug={category.slug}
              />
            ))}
          </div>

          {category.articles.length === 0 && (
            <div className="text-center py-16">
              <p className="text-gray-500">No articles in this category yet.</p>
              <Link to="/help" className="text-[#264EFF] text-sm mt-2 inline-block hover:underline">
                ← Back to Help Center
              </Link>
            </div>
          )}
        </div>
      </section>

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
