import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, BookOpen, FileText, X, ArrowRight } from 'lucide-react';
import { searchAPI } from '../../lib/api';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const navigate = useNavigate();
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    searchAPI.search(debouncedQuery)
      .then((res) => {
        if (!cancelled) {
          setResults(res.data.data.results);
          setOpen(true);
        }
      })
      .catch(() => {
        if (!cancelled) setResults(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const clearSearch = () => {
    setQuery('');
    setResults(null);
    setOpen(false);
  };

  const handleSelect = (url) => {
    clearSearch();
    navigate(url);
  };

  const hasResults = results && (
    results.courses?.length > 0 ||
    results.lessons?.length > 0 ||
    results.articles?.length > 0
  );

  return (
    <div ref={containerRef} className="relative w-full max-w-xs sm:max-w-sm">
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-text-dark-muted pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => query.length >= 2 && setOpen(true)}
          placeholder="Search courses, lessons..."
          className="w-full pl-9 pr-8 py-2 text-sm rounded-lg border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors"
        />
        {query && (
          <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors">
            <X className="w-3.5 h-3.5 text-gray-400" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && query.length >= 2 && (
        <div className="absolute top-full mt-1 left-0 right-0 z-50 bg-white dark:bg-dark-800 rounded-xl shadow-lg dark:shadow-elevated border border-gray-200 dark:border-border-dark overflow-hidden">
          {loading && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-text-dark-muted">Searching...</div>
          )}

          {!loading && !hasResults && (
            <div className="px-4 py-3 text-sm text-gray-500 dark:text-text-dark-muted">No results for "{query}"</div>
          )}

          {/* See all results footer */}
          {!loading && hasResults && (
            <Link
              to={`/search?q=${encodeURIComponent(query)}`}
              onClick={clearSearch}
              className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm text-brand-blue hover:bg-gray-50 dark:hover:bg-dark-700 border-t border-gray-100 dark:border-border-dark transition-colors font-medium"
            >
              See all results <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}

          {!loading && hasResults && (
            <div className="max-h-80 overflow-y-auto">
              {/* Courses */}
              {results.courses?.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-text-dark-muted uppercase tracking-wider border-b border-gray-100 dark:border-border-dark">
                    Courses
                  </div>
                  {results.courses.map((course) => (
                    <button
                      key={course.id}
                      onClick={() => handleSelect(`/courses/${course.id}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left"
                    >
                      <BookOpen className="w-4 h-4 text-brand-blue flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary truncate">{course.title}</p>
                        <p className="text-xs text-gray-400 dark:text-text-dark-muted">{course.instructor?.full_name}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Lessons */}
              {results.lessons?.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-text-dark-muted uppercase tracking-wider border-b border-gray-100 dark:border-border-dark">
                    Lessons
                  </div>
                  {results.lessons.map((lesson) => {
                    const courseId = lesson.module?.course?.id;
                    return (
                      <button
                        key={lesson.id}
                        onClick={() => courseId ? handleSelect(`/courses/${courseId}/learn`) : undefined}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left"
                      >
                        <FileText className="w-4 h-4 text-brand-purple flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary truncate">{lesson.title}</p>
                          <p className="text-xs text-gray-400 dark:text-text-dark-muted truncate">{lesson.module?.course?.title}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Articles */}
              {results.articles?.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-400 dark:text-text-dark-muted uppercase tracking-wider border-b border-gray-100 dark:border-border-dark">
                    Articles
                  </div>
                  {results.articles.map((article) => (
                    <button
                      key={article.id}
                      onClick={() => handleSelect(`/knowledge/${article.slug}`)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left"
                    >
                      <FileText className="w-4 h-4 text-green-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary truncate">{article.title}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
