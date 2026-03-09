import { Link } from 'react-router-dom';
import { BookOpen, Mail } from 'lucide-react';
import { HelpSearch } from '../../components/help/HelpSearch';
import { CategoryCard } from '../../components/help/CategoryCard';
import { publicHelpCategories, getTotalArticleCount } from '../../../lib/helpContent';
import { PublicNav } from '../../components/PublicNav';
import { PublicFooter } from '../../components/PublicFooter';

export default function HelpCenterPage() {
  const totalArticles = getTotalArticleCount();

  return (
    <div className="min-h-screen bg-[#FAFAFA]" style={{ fontFamily: "'Bricolage Grotesque', system-ui, sans-serif" }}>
      <PublicNav />

      {/* Hero */}
      <section className="pt-36 lg:pt-44 pb-16 px-6 lg:px-12 bg-gradient-to-b from-[#264EFF]/[0.03] to-transparent">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#264EFF]/5 rounded-full mb-6">
            <BookOpen className="w-4 h-4 text-[#264EFF]" />
            <span className="text-sm font-medium text-[#264EFF]">Help Center</span>
          </div>
          <h1 className="font-sora text-3xl lg:text-5xl font-semibold tracking-tight text-gray-900 mb-4">
            How can we help you?
          </h1>
          <p className="text-lg text-gray-500 mb-10">
            Search {totalArticles} articles across {publicHelpCategories.length} topics to find the answers you need.
          </p>
          <HelpSearch autoFocus />
        </div>
      </section>

      {/* Categories Grid */}
      <section className="pb-24 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-sora text-xl font-semibold text-gray-900 mb-6">Browse by topic</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {publicHelpCategories.map((category) => (
              <CategoryCard key={category.slug} category={category} />
            ))}
          </div>
        </div>
      </section>

      {/* Contact Support CTA */}
      <section className="pb-24 px-6 lg:px-12">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white border border-gray-200 rounded-2xl p-8 lg:p-12 text-center">
            <Mail className="w-10 h-10 text-[#264EFF] mx-auto mb-4" />
            <h2 className="font-sora text-xl font-semibold text-gray-900 mb-2">
              Can't find what you're looking for?
            </h2>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Our support team is here to help. Send us a message and we'll get back to you within 24 hours.
            </p>
            <a
              href="mailto:support@pointhed.com"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[#264EFF] text-white font-medium rounded-full hover:bg-[#1a3ed9] transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </div>
      </section>

      <PublicFooter />

      {/* Font */}
      <style>{`
        .font-sora { font-family: 'Sora', system-ui, sans-serif; }
      `}</style>
    </div>
  );
}
