import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

export function PublicNav() {
  const [open, setOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[#FAFAFA]/80 backdrop-blur-md border-b border-black/5">
      <div className="max-w-7xl mx-auto px-6 lg:px-12">
        <div className="flex items-center justify-between h-16 lg:h-20">
          <Link to="/">
            <img src="/uploads/logo.png" alt="Pointhed" className="h-5 w-auto" />
          </Link>

          <div className="flex items-center gap-6">
            {/* Desktop links */}
            <Link
              to="/help"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Help
            </Link>
            <Link
              to="/login"
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors hidden sm:block"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              className="text-sm font-medium px-5 py-2.5 bg-[#264EFF] text-white rounded-full hover:bg-[#1a3ed9] transition-colors hidden sm:block"
            >
              Get started
            </Link>

            {/* Mobile hamburger */}
            <button
              onClick={() => setOpen(!open)}
              className="sm:hidden p-2 -mr-2 text-gray-600 hover:text-gray-900 transition-colors"
              aria-label="Toggle menu"
            >
              {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="sm:hidden bg-[#FAFAFA]/95 backdrop-blur-md border-t border-black/5">
          <div className="px-6 py-4 flex flex-col gap-3">
            <Link
              to="/help"
              onClick={() => setOpen(false)}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors py-2"
            >
              Help Center
            </Link>
            <Link
              to="/login"
              onClick={() => setOpen(false)}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors py-2"
            >
              Sign in
            </Link>
            <Link
              to="/signup"
              onClick={() => setOpen(false)}
              className="text-sm font-medium px-5 py-2.5 bg-[#264EFF] text-white rounded-full hover:bg-[#1a3ed9] transition-colors text-center"
            >
              Get started
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
