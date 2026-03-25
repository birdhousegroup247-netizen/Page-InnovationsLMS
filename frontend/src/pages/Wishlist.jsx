import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, BookOpen, Star, Users, Clock, Trash2, ShoppingCart } from 'lucide-react';
import { wishlistAPI } from '../lib/api';
import { Container, EmptyState } from '../components/layout';
import { Button, Spinner, Badge } from '../components/ui';
import { cn } from '../utils/cn';

export default function Wishlist() {
  const navigate = useNavigate();
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await wishlistAPI.getMyWishlist();
      setWishlist(res.data.data.wishlist || []);
    } catch (err) {
      setError('Failed to load wishlist');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (courseId) => {
    try {
      setRemoving(courseId);
      await wishlistAPI.remove(courseId);
      setWishlist((prev) => prev.filter((item) => item.course.id !== courseId));
    } catch (err) {
      setError('Failed to remove from wishlist');
    } finally {
      setRemoving(null);
    }
  };

  const difficultyColors = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'danger',
  };

  return (
    <Container className="py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary flex items-center gap-2">
            <Heart className="h-6 w-6 text-brand-red fill-brand-red" />
            My Wishlist
          </h1>
          <p className="text-gray-500 dark:text-text-dark-muted text-sm mt-1">
            {wishlist.length} {wishlist.length === 1 ? 'course' : 'courses'} saved
          </p>
        </div>
        <Link to="/courses">
          <Button variant="outline" leftIcon={<BookOpen className="h-4 w-4" />}>
            Browse Courses
          </Button>
        </Link>
      </div>

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

      {!loading && wishlist.length === 0 && (
        <EmptyState
          icon={<Heart className="w-16 h-16 text-gray-300" />}
          title="Your wishlist is empty"
          description="Save courses you want to take later by clicking the heart icon on any course."
          actionLabel="Browse Courses"
          onAction={() => navigate('/courses')}
        />
      )}

      {!loading && wishlist.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {wishlist.map(({ wishlist_id, course, added_at }) => {
            if (!course) return (
              <div key={wishlist_id} className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden shadow-sm border border-dashed border-gray-200 dark:border-border-dark flex flex-col items-center justify-center p-8 text-center gap-2">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Course no longer available</p>
                <p className="text-xs text-gray-400">This course was removed by the instructor or admin.</p>
              </div>
            );
            const thumbnail =
              course.thumbnail_url ||
              `https://placehold.co/400x225/0e2b5c/ffffff?text=${encodeURIComponent(course.title || 'Course')}`;

            return (
              <div
                key={wishlist_id}
                className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden shadow-sm dark:shadow-card hover:shadow-md transition-all"
              >
                {/* Thumbnail */}
                <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-dark-700">
                  <img
                    src={thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  <div className="absolute top-3 right-3">
                    <Badge variant={difficultyColors[course.difficulty] || 'info'}>
                      {course.difficulty}
                    </Badge>
                  </div>
                  {/* Remove button */}
                  <button
                    onClick={() => handleRemove(course.id)}
                    disabled={removing === course.id}
                    className="absolute top-3 left-3 p-1.5 bg-white/90 dark:bg-dark-800/90 rounded-full hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    title="Remove from wishlist"
                  >
                    {removing === course.id ? (
                      <Spinner size="xs" />
                    ) : (
                      <Heart className="h-4 w-4 text-brand-red fill-brand-red" />
                    )}
                  </button>
                </div>

                {/* Content */}
                <div className="p-5">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-text-dark-primary mb-1 line-clamp-2 min-h-[3rem]">
                    {course.title}
                  </h3>

                  {course.instructor && (
                    <p className="text-xs text-gray-500 dark:text-text-dark-muted mb-3">
                      by {course.instructor.full_name}
                    </p>
                  )}

                  <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-text-dark-muted mb-4">
                    {course.average_rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        {Number(course.average_rating).toFixed(1)}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />
                      {course.enrolled_count || 0}
                    </span>
                    {course.duration && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {course.duration}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-brand-blue dark:text-brand-blue-light">
                      {course.price > 0 ? `$${Number(course.price).toFixed(2)}` : 'Free'}
                    </span>
                    <div className="flex gap-2">
                      <Link to={`/courses/${course.id}`}>
                        <Button variant="outline" size="sm">
                          Details
                        </Button>
                      </Link>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={<ShoppingCart className="h-3.5 w-3.5" />}
                        onClick={() =>
                          course.price > 0
                            ? navigate(`/checkout?course_id=${course.id}`)
                            : navigate(`/courses/${course.id}`)
                        }
                      >
                        {course.price > 0 ? 'Enroll' : 'Start'}
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Container>
  );
}
