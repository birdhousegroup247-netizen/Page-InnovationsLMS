import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Package, BookOpen, Star, Tag, ChevronRight, ShoppingCart } from 'lucide-react';
import api from '../lib/api';
import { Container, EmptyState } from '../components/layout';
import { Button, Spinner, Badge } from '../components/ui';
import { formatPrice } from '../utils/currency';

export default function Bundles() {
  const navigate = useNavigate();
  const [bundles, setBundles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/api/bundles')
      .then((res) => setBundles(res.data.data.bundles || []))
      .catch(() => setError('Failed to load bundles'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      {/* Hero */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red py-14">
        <Container>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-white/20 rounded-2xl mb-4">
              <Package className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-3">Course Bundles</h1>
            <p className="text-white/85 text-lg max-w-xl mx-auto">
              Get more for less. Our bundles combine the best courses at a special discounted price.
            </p>
          </div>
        </Container>
      </div>

      <Container className="py-10">
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && (
          <div className="flex justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {!loading && bundles.length === 0 && (
          <EmptyState
            icon={<Package className="w-16 h-16 text-gray-300" />}
            title="No bundles available"
            description="Check back soon — we're working on some great bundles for you."
          />
        )}

        {!loading && bundles.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {bundles.map((bundle) => {
              const savings = bundle.savings || 0;
              return (
                <div
                  key={bundle.id}
                  className="bg-white dark:bg-dark-800 rounded-2xl shadow-sm dark:shadow-card border border-gray-100 dark:border-dark-700 overflow-hidden hover:shadow-md transition-all"
                >
                  {bundle.thumbnail_url && (
                    <img
                      src={bundle.thumbnail_url}
                      alt={bundle.title}
                      className="w-full h-44 object-cover"
                    />
                  )}

                  <div className="p-6">
                    {/* Title + savings badge */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary">
                        {bundle.title}
                      </h2>
                      {savings > 0 && (
                        <span className="flex-shrink-0 flex items-center gap-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <Tag className="h-3 w-3" />
                          Save ${savings.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {bundle.description && (
                      <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-4 line-clamp-2">
                        {bundle.description}
                      </p>
                    )}

                    {/* Courses list */}
                    <div className="mb-5 space-y-2">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">
                        Included courses ({(bundle.courses || []).length})
                      </p>
                      {(bundle.courses || []).map((course) => (
                        <div key={course.id} className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-dark-secondary">
                          <BookOpen className="h-4 w-4 text-brand-blue flex-shrink-0" />
                          <span className="truncate">{course.title}</span>
                          <span className="ml-auto flex-shrink-0 text-gray-400 text-xs">
                            {formatPrice(course.price)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Price row */}
                    <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-dark-700">
                      <div>
                        <p className="text-2xl font-bold text-brand-blue">
                          {formatPrice(bundle.price)}
                        </p>
                        {bundle.total_value > Number(bundle.price) && (
                          <p className="text-xs text-gray-400 line-through">
                            ${Number(bundle.total_value).toFixed(2)} individually
                          </p>
                        )}
                      </div>
                      <Button
                        variant="primary"
                        leftIcon={<ShoppingCart className="h-4 w-4" />}
                        onClick={() => navigate(`/bundles/${bundle.id}`)}
                      >
                        Get Bundle
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </>
  );
}
