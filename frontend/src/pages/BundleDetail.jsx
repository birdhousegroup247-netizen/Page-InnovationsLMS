import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../lib/api';
import { Package, BookOpen, Star, Tag, ArrowLeft, CheckCircle, Clock, BarChart2, ShoppingCart } from 'lucide-react';
import { Spinner } from '../components/ui';

export default function BundleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/bundles/${id}`)
      .then((res) => setBundle(res.data.data.bundle))
      .catch(() => setError('Bundle not found or no longer available'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBuyBundle = () => {
    // Bundle purchase routes each course through checkout individually.
    // Navigate to the first unpaid course in the bundle as the entry point.
    if (!bundle?.courses?.length) return;
    navigate(`/checkout?course_id=${bundle.courses[0].id}&bundle_id=${bundle.id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !bundle) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center">
        <p className="text-text-secondary mb-4">{error || 'Bundle not found'}</p>
        <Link to="/bundles" className="text-brand-blue hover:underline">Back to Bundles</Link>
      </div>
    );
  }

  const savings = bundle.savings || 0;
  const savingsPct = bundle.total_value > 0
    ? Math.round((savings / bundle.total_value) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Back */}
      <button
        onClick={() => navigate('/bundles')}
        className="flex items-center gap-2 text-sm text-text-secondary hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> All Bundles
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left — course list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-6 h-6 text-brand-blue" />
              <h1 className="text-2xl font-bold text-white">{bundle.name}</h1>
            </div>
            {bundle.description && (
              <p className="text-text-secondary leading-relaxed">{bundle.description}</p>
            )}
          </div>

          {/* Courses */}
          <div>
            <h2 className="text-sm font-semibold text-text-secondary uppercase tracking-wide mb-4">
              {bundle.courses?.length || 0} Courses Included
            </h2>
            <div className="space-y-3">
              {(bundle.courses || []).map((course) => (
                <div
                  key={course.id}
                  className="flex gap-4 bg-dark-800 border border-dark-700 rounded-xl p-4"
                >
                  {course.thumbnail_url ? (
                    <img
                      src={course.thumbnail_url}
                      alt={course.title}
                      className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-dark-700 flex items-center justify-center flex-shrink-0">
                      <BookOpen className="w-6 h-6 text-text-secondary" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">{course.title}</h3>
                    {course.instructor && (
                      <p className="text-text-secondary text-xs mt-0.5">by {course.instructor.full_name}</p>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-xs text-text-secondary">
                      {course.difficulty && (
                        <span className="flex items-center gap-1">
                          <BarChart2 className="w-3 h-3" /> {course.difficulty}
                        </span>
                      )}
                      {course.duration && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {course.duration}
                        </span>
                      )}
                      {course.average_rating > 0 && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                          {Number(course.average_rating).toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-text-secondary text-sm line-through">
                      ${Number(course.price || 0).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — purchase card */}
        <div className="lg:col-span-1">
          <div className="bg-dark-800 border border-dark-700 rounded-2xl p-6 sticky top-24">
            {savingsPct > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <span className="px-2.5 py-1 bg-green-900/40 text-green-400 text-xs font-semibold rounded-full flex items-center gap-1">
                  <Tag className="w-3 h-3" /> Save {savingsPct}%
                </span>
              </div>
            )}

            <div className="mb-4">
              <p className="text-3xl font-bold text-white">${Number(bundle.price || 0).toFixed(2)}</p>
              {savings > 0 && (
                <p className="text-text-secondary text-sm mt-1">
                  <span className="line-through">${Number(bundle.total_value).toFixed(2)}</span>
                  <span className="text-green-400 ml-2">You save ${Number(savings).toFixed(2)}</span>
                </p>
              )}
            </div>

            <button
              onClick={handleBuyBundle}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-blue hover:bg-brand-blue-light text-white font-semibold rounded-xl transition-colors mb-4"
            >
              <ShoppingCart className="w-4 h-4" /> Buy Bundle
            </button>

            <ul className="space-y-2 text-sm text-text-secondary">
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                {bundle.courses?.length || 0} courses in one purchase
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                Lifetime access to all content
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                Certificate for each completed course
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
