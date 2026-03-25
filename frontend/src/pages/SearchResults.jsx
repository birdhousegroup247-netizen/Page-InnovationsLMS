import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { searchAPI } from '../lib/api';
import { Search, BookOpen, FileText, ChevronRight, Users, Star } from 'lucide-react';
import { Container } from '../components/layout';
import { Spinner } from '../components/ui';

const TYPES = [
  { value: 'all', label: 'All' },
  { value: 'courses', label: 'Courses' },
  { value: 'lessons', label: 'Lessons' },
  { value: 'articles', label: 'Articles' },
];

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [type, setType] = useState(searchParams.get('type') || 'all');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 400);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      setSearchParams({ q: debouncedQuery, type });
      runSearch(debouncedQuery, type);
    } else {
      setResults(null);
    }
  }, [debouncedQuery, type]);

  const runSearch = async (q, t) => {
    setLoading(true);
    try {
      const res = await searchAPI.search(q, t, 20);
      setResults(res.data.data.results);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  const total = results
    ? (results.courses?.length || 0) + (results.lessons?.length || 0) + (results.articles?.length || 0)
    : 0;

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red py-10">
        <Container>
          <h1 className="text-3xl font-bold text-white mb-4">Search</h1>
          <div className="relative max-w-2xl">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search courses, lessons, articles..."
              autoFocus
              className="w-full pl-12 pr-4 py-3 rounded-xl border-0 bg-white dark:bg-dark-800 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 text-base focus:outline-none focus:ring-2 focus:ring-white/50 shadow-lg transition-colors"
            />
          </div>
        </Container>
      </div>

      <Container className="py-6">
        {/* Type Filter */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => setType(t.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                type === t.value
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-600'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {query.length < 2 && (
          <div className="text-center py-16 text-gray-400 dark:text-text-dark-muted">
            <Search className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p className="text-lg">Type at least 2 characters to search</p>
          </div>
        )}

        {query.length >= 2 && loading && (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        )}

        {!loading && results && total === 0 && (
          <div className="text-center py-16">
            <Search className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
            <p className="text-xl font-semibold text-gray-700 dark:text-text-dark-primary">No results for "{query}"</p>
            <p className="text-gray-500 dark:text-text-dark-muted mt-1">Try different keywords or check spelling</p>
          </div>
        )}

        {!loading && results && total > 0 && (
          <div className="space-y-8">
            {/* Courses */}
            {results.courses?.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary mb-3 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-brand-blue" /> Courses
                  <span className="text-sm font-normal text-gray-400">({results.courses.length})</span>
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {results.courses.map((course) => (
                    <Link
                      key={course.id}
                      to={`/courses/${course.id}`}
                      className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 hover:shadow-md transition-all group"
                    >
                      {course.thumbnail && (
                        <img src={course.thumbnail} alt={course.title}
                          className="w-full h-32 object-cover rounded-lg mb-3" />
                      )}
                      <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary group-hover:text-brand-blue transition-colors line-clamp-2">
                        {course.title}
                      </h3>
                      <p className="text-sm text-gray-400 dark:text-text-dark-muted mt-1">
                        {course.instructor?.full_name}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
                        <span className="flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> {course.enrollment_count || 0}
                        </span>
                        <span className="capitalize">{course.difficulty}</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}

            {/* Lessons */}
            {results.lessons?.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-brand-purple" /> Lessons
                  <span className="text-sm font-normal text-gray-400">({results.lessons.length})</span>
                </h2>
                <div className="space-y-2">
                  {results.lessons.map((lesson) => {
                    const courseId = lesson.module?.course?.id;
                    return (
                      <div
                        key={lesson.id}
                        onClick={() => courseId && navigate(`/courses/${courseId}/learn`)}
                        className={`bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all group ${courseId ? 'cursor-pointer' : 'cursor-default opacity-75'}`}
                      >
                        <FileText className="w-8 h-8 text-brand-purple flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-gray-900 dark:text-text-dark-primary group-hover:text-brand-blue transition-colors truncate">
                            {lesson.title}
                          </h3>
                          <p className="text-sm text-gray-400 dark:text-text-dark-muted truncate">
                            {lesson.module?.course?.title} · {lesson.module?.title}
                          </p>
                        </div>
                        {lesson.duration_minutes && (
                          <span className="text-xs text-gray-400 flex-shrink-0">{lesson.duration_minutes} min</span>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      </div>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Articles */}
            {results.articles?.length > 0 && (
              <section>
                <h2 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-green-500" /> Articles
                  <span className="text-sm font-normal text-gray-400">({results.articles.length})</span>
                </h2>
                <div className="space-y-2">
                  {results.articles.map((article) => (
                    <Link
                      key={article.id}
                      to={`/knowledge/${article.slug}`}
                      className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-all group"
                    >
                      <FileText className="w-8 h-8 text-green-500 flex-shrink-0" />
                      <h3 className="flex-1 font-medium text-gray-900 dark:text-text-dark-primary group-hover:text-brand-blue transition-colors">
                        {article.title}
                      </h3>
                      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </Container>
    </>
  );
}
