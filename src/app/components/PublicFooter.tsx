import { Link } from 'react-router-dom';

export function PublicFooter() {
  return (
    <footer className="py-12 px-6 lg:px-12 bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div>
            <img src="/uploads/logo-white.png" alt="Pointhed" className="h-5 w-auto" />
          </div>
          <div className="flex items-center gap-4 sm:gap-8 text-sm text-gray-400">
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
  );
}
