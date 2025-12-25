import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Search, X } from 'lucide-react';

export default function SearchBar({ className = '' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [query, setQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef(null);

  // Get search query from URL if on courses page
  useEffect(() => {
    if (location.pathname === '/courses') {
      const params = new URLSearchParams(location.search);
      const searchParam = params.get('search');
      if (searchParam) {
        setQuery(searchParam);
      }
    }
  }, [location]);

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (query.trim()) {
      // Navigate to courses page with search query
      navigate(`/courses?search=${encodeURIComponent(query.trim())}`);
      setIsExpanded(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    if (location.pathname === '/courses' && location.search.includes('search=')) {
      // Remove search parameter
      navigate('/courses');
    }
  };

  return (
    <div className={`relative ${className}`}>
      {/* Mobile/Compact View */}
      <div className="md:hidden">
        {!isExpanded ? (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-2 text-text-secondary hover:text-text-primary hover:bg-dark-700 rounded-lg transition-colors"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </button>
        ) : (
          <form onSubmit={handleSubmit} className="absolute right-0 top-0 z-50">
            <div className="flex items-center gap-2 bg-dark-800 border border-dark-600 rounded-lg p-2">
              <Search className="h-5 w-5 text-text-tertiary flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses..."
                className="bg-transparent text-text-primary placeholder-text-tertiary focus:outline-none w-48"
              />
              {query && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setIsExpanded(false);
                  handleClear();
                }}
                className="text-text-tertiary hover:text-text-primary ml-2"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>

      {/* Desktop View */}
      <form onSubmit={handleSubmit} className="hidden md:block">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-text-tertiary" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search courses..."
            className="block w-full pl-10 pr-10 py-2 bg-dark-700 border border-dark-600 rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:border-brand-blue focus:ring-1 focus:ring-brand-blue transition-colors"
          />
          {query && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-tertiary hover:text-text-primary"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
