import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { Article } from '../../../lib/helpContent';

interface ArticleCardProps {
  article: Article;
  categorySlug: string;
}

export function ArticleCard({ article, categorySlug }: ArticleCardProps) {
  return (
    <Link
      to={`/help/${categorySlug}/${article.slug}`}
      className="group flex items-center justify-between gap-4 py-4 px-5 bg-white border border-gray-200 rounded-xl hover:border-[#264EFF]/30 hover:shadow-md hover:shadow-[#264EFF]/5 transition-all duration-200"
    >
      <div className="min-w-0">
        <h3 className="font-medium text-gray-900 group-hover:text-[#264EFF] transition-colors">
          {article.title}
        </h3>
        <p className="text-sm text-gray-500 mt-0.5 truncate">{article.summary}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#264EFF] transition-colors flex-shrink-0" />
    </Link>
  );
}
