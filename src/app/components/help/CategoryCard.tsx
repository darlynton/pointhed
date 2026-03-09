import { Link } from 'react-router-dom';
import { ChevronRight, Rocket, Users, Gift, ShoppingBag, Megaphone, Settings, Shield, CreditCard, CircleHelp, type LucideIcon } from 'lucide-react';
import type { Category } from '../../../lib/helpContent';

const iconMap: Record<string, LucideIcon> = {
  Rocket,
  Users,
  Gift,
  ShoppingBag,
  Megaphone,
  Settings,
  Shield,
  CreditCard,
  CircleHelp,
};

interface CategoryCardProps {
  category: Category;
}

export function CategoryCard({ category }: CategoryCardProps) {
  const Icon = iconMap[category.icon] || CircleHelp;

  return (
    <Link
      to={`/help/${category.slug}`}
      className="group block bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#264EFF]/30 hover:shadow-lg hover:shadow-[#264EFF]/5 transition-all duration-200"
    >
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-[#264EFF]/5 flex items-center justify-center group-hover:bg-[#264EFF]/10 transition-colors">
          <Icon className="w-5 h-5 text-[#264EFF]" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-gray-900 group-hover:text-[#264EFF] transition-colors">
              {category.title}
            </h3>
            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#264EFF] transition-colors flex-shrink-0" />
          </div>
          <p className="text-sm text-gray-500 mt-1 leading-relaxed">{category.description}</p>
          <p className="text-xs text-gray-400 mt-3">{category.articles.length} article{category.articles.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </Link>
  );
}
