import { Link, useParams, Navigate } from 'react-router-dom';
import { HelpSearch } from '../../components/help/HelpSearch';
import { HelpBreadcrumb } from '../../components/help/HelpBreadcrumb';
import { ArticleCard } from '../../components/help/ArticleCard';
import { getCategoryBySlug } from '../../../lib/helpContent';
import { PublicNav } from '../../components/PublicNav';
import { PublicFooter } from '../../components/PublicFooter';

export default function HelpCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const category = categorySlug ? getCategoryBySlug(categorySlug) : undefined;

  if (!category) {
    return <Navigate to="/help" replace />;
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA]" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
      <PublicNav />

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

      <PublicFooter />

      <style>{`
        .font-sora { font-family: 'Sora', system-ui, sans-serif; }
      `}</style>
    </div>
  );
}
