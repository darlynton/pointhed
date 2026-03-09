import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { searchArticles, type Category, type Article } from '../../../lib/helpContent';
import { Link } from 'react-router-dom';

interface HelpSearchProps {
  /** Auto-focus the input on mount */
  autoFocus?: boolean;
  /** Compact variant for article pages */
  compact?: boolean;
}

export function HelpSearch({ autoFocus = false, compact = false }: HelpSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{ category: Category; article: Article }[]>([]);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length >= 2) {
      setResults(searchArticles(query).slice(0, 8));
      setOpen(true);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={wrapperRef} className={`relative w-full ${compact ? 'max-w-md' : 'max-w-2xl'} mx-auto`}>
      <div className={`relative flex items-center ${compact ? '' : 'shadow-lg shadow-black/5'} rounded-2xl bg-white border border-gray-200 focus-within:border-[#264EFF]/40 focus-within:ring-2 focus-within:ring-[#264EFF]/10 transition-all`}>
        <Search className={`absolute left-4 ${compact ? 'w-4 h-4' : 'w-5 h-5'} text-gray-400 pointer-events-none`} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          placeholder="Search for help articles…"
          autoFocus={autoFocus}
          className={`w-full bg-transparent ${compact ? 'pl-10 pr-10 py-2.5 text-sm' : 'pl-12 pr-12 py-4 text-base'} outline-none placeholder:text-gray-400`}
        />
        {query && (
          <button
            onClick={() => { setQuery(''); setResults([]); setOpen(false); }}
            className="absolute right-4 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Results dropdown */}
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/10 overflow-hidden">
          {results.map(({ category, article }) => (
            <Link
              key={`${category.slug}-${article.slug}`}
              to={`/help/${category.slug}/${article.slug}`}
              onClick={() => setOpen(false)}
              className="block px-5 py-3.5 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
            >
              <p className="text-sm font-medium text-gray-900">{article.title}</p>
              <p className="text-xs text-gray-500 mt-0.5">{category.title} · {article.summary}</p>
            </Link>
          ))}
        </div>
      )}

      {open && query.trim().length >= 2 && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-xl shadow-xl shadow-black/10 p-6 text-center">
          <p className="text-sm text-gray-500">No articles found for "{query}"</p>
          <p className="text-xs text-gray-400 mt-1">Try different keywords or <a href="mailto:support@pointhed.com" className="text-[#264EFF] hover:underline">contact support</a></p>
        </div>
      )}
    </div>
  );
}
