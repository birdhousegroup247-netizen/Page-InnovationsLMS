import { useState, useEffect } from 'react';
import { Star, ThumbsUp, Edit2, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { coursesAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

/**
 * Course reviews + ratings block on the course detail page.
 *
 * Field names follow the backend CourseReview model exactly:
 *   - review rows carry `student_id`, `review_text`, and a `student`
 *     include ({ id, full_name, profile_picture })
 *   - stats endpoint returns snake_case: average_rating, total_reviews,
 *     rating_distribution
 * An earlier version read user_id / User / comment / camelCase stats —
 * none of which the API ever sent, so names showed "Anonymous", review
 * text was silently dropped, and the summary always said 0.0.
 */
export default function CourseReviews({ courseId, isEnrolled }) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Review form state
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [editingReview, setEditingReview] = useState(null);
  const [deleteReviewId, setDeleteReviewId] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    review_text: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [filter, setFilter] = useState('all'); // all, 5, 4, 3, 2, 1

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // The signed-in user's own review (if any) — fetched unfiltered so it's
  // found even when the visible list is paginated or star-filtered.
  const [myReview, setMyReview] = useState(null);

  useEffect(() => {
    fetchReviews();
  }, [courseId, filter, currentPage]);

  useEffect(() => {
    fetchStats();
    fetchMyReview();
  }, [courseId]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const params = {
        page: currentPage,
        limit: 10,
      };

      if (filter !== 'all') {
        params.rating = filter;
      }

      const response = await coursesAPI.getReviews(courseId, params);
      const data = response.data.data;
      setReviews(data.reviews);
      setTotalPages(data.pagination?.totalPages || 1);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await coursesAPI.getReviewStats(courseId);
      setStats(response.data.data);
    } catch (err) {
      console.error('Error fetching review stats:', err);
    }
  };

  const fetchMyReview = async () => {
    if (!user) return;
    try {
      // Cheap scan of the first pages for the user's own review. Reviews
      // are recent-first, so an author's review is almost always early.
      const response = await coursesAPI.getReviews(courseId, { page: 1, limit: 50 });
      const rows = response.data.data.reviews || [];
      setMyReview(rows.find((r) => r.student_id === user.id) || null);
    } catch {
      // non-fatal — worst case the button shows and the API rejects dupes
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!reviewForm.review_text.trim()) {
      setError('Please write a comment');
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      if (editingReview) {
        await coursesAPI.updateReview(courseId, editingReview.id, reviewForm);
        setSuccess('Review updated successfully!');
      } else {
        await coursesAPI.addReview(courseId, reviewForm);
        setSuccess('Review submitted successfully!');
      }

      // Reset form
      setReviewForm({ rating: 5, review_text: '' });
      setShowReviewForm(false);
      setEditingReview(null);

      // Refresh
      fetchReviews();
      fetchStats();
      fetchMyReview();

      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditReview = (review) => {
    setEditingReview(review);
    setReviewForm({
      rating: review.rating,
      review_text: review.review_text || '',
    });
    setShowReviewForm(true);
  };

  const handleDeleteReview = (reviewId) => {
    setDeleteReviewId(reviewId);
  };

  const confirmDeleteReview = async () => {
    try {
      await coursesAPI.deleteReview(courseId, deleteReviewId);
      setDeleteReviewId(null);
      setSuccess('Review deleted successfully!');
      fetchReviews();
      fetchStats();
      setMyReview(null);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting review:', err);
      setError('Failed to delete review');
    }
  };

  const handleMarkHelpful = async (reviewId) => {
    try {
      await coursesAPI.markReviewHelpful(courseId, reviewId);
      fetchReviews(); // Refresh to show updated helpful count
    } catch (err) {
      console.error('Error marking review as helpful:', err);
    }
  };

  const renderStars = (rating, interactive = false, onChange = null) => {
    return (
      <div className="flex gap-1 justify-center sm:justify-start">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type={interactive ? 'button' : undefined}
            onClick={() => interactive && onChange && onChange(star)}
            disabled={!interactive}
            className={`${
              interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'
            } transition-transform`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= rating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const averageRating = parseFloat(stats?.average_rating || 0);
  const totalReviews = stats?.total_reviews || 0;
  const ratingDistribution = stats?.rating_distribution || {};

  const canLeaveReview = isEnrolled && user?.role === 'student' && !myReview;

  return (
    <>
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm dark:shadow-card p-6 space-y-6 transition-colors">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">
          Reviews & Ratings
        </h2>
        {canLeaveReview && !showReviewForm && (
          <Button variant="primary" size="sm" onClick={() => setShowReviewForm(true)}>
            Write a Review
          </Button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 text-red-700 dark:text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 dark:bg-green-500/10 border border-green-200 dark:border-green-500/20 text-green-700 dark:text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <div className="bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-border-dark rounded-lg p-6 transition-colors">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">
            {editingReview ? 'Edit Your Review' : 'Write Your Review'}
          </h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2 transition-colors">
                Rating
              </label>
              {renderStars(reviewForm.rating, true, (rating) =>
                setReviewForm({ ...reviewForm, rating })
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2 transition-colors">
                Comment
              </label>
              <textarea
                value={reviewForm.review_text}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, review_text: e.target.value })
                }
                rows={4}
                className="w-full bg-white dark:bg-dark-600 border border-gray-300 dark:border-dark-500 text-gray-900 dark:text-text-dark-primary rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none transition-colors"
                placeholder="Share your experience with this course..."
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button type="submit" variant="primary" disabled={submitting}>
                {submitting ? 'Submitting...' : editingReview ? 'Update Review' : 'Submit Review'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setShowReviewForm(false);
                  setEditingReview(null);
                  setReviewForm({ rating: 5, review_text: '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-border-dark rounded-lg p-6 transition-colors">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-5xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                {averageRating ? averageRating.toFixed(1) : '0.0'}
              </div>
              {renderStars(Math.round(averageRating))}
              <p className="text-sm text-gray-600 dark:text-text-dark-secondary mt-2 transition-colors">
                {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </p>
            </div>

            {/* Rating Breakdown */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = ratingDistribution[star] || 0;
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;

                return (
                  <button
                    key={star}
                    onClick={() => {
                      setFilter(star.toString());
                      setCurrentPage(1);
                    }}
                    className={`w-full flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-dark-600 p-2 rounded transition-colors ${
                      filter === star.toString() ? 'bg-gray-100 dark:bg-dark-600' : ''
                    }`}
                  >
                    <span className="text-sm text-gray-700 dark:text-text-dark-primary w-8 transition-colors">{star} ★</span>
                    <div className="flex-1 h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden transition-colors">
                      <div
                        className="h-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-text-dark-secondary w-8 text-right transition-colors">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Filter Reset */}
          {filter !== 'all' && (
            <button
              onClick={() => {
                setFilter('all');
                setCurrentPage(1);
              }}
              className="mt-4 text-sm text-brand-blue hover:text-brand-blue/80"
            >
              Show all reviews
            </button>
          )}
        </div>
      )}

      {/* Reviews List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent"></div>
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary transition-colors">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600 dark:text-text-dark-secondary transition-colors">
              {filter === 'all'
                ? 'No reviews yet. Be the first to review this course!'
                : `No ${filter}-star reviews yet.`}
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-gray-50 dark:bg-dark-700 border border-gray-200 dark:border-border-dark rounded-lg p-6 transition-colors"
            >
              {/* Review Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {review.student?.profile_picture ? (
                    <img
                      src={review.student.profile_picture}
                      alt={review.student?.full_name || 'Reviewer'}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white font-semibold">
                      {review.student?.full_name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-gray-900 dark:text-text-dark-primary transition-colors">
                      {review.student?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-text-dark-muted transition-colors">
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions for own review */}
                {review.student_id === user?.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditReview(review)}
                      className="p-2 text-gray-500 dark:text-text-dark-secondary hover:text-brand-blue hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg transition-colors"
                      title="Edit review"
                      aria-label="Edit review"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-2 text-gray-500 dark:text-text-dark-secondary hover:text-red-500 hover:bg-gray-100 dark:hover:bg-dark-600 rounded-lg transition-colors"
                      title="Delete review"
                      aria-label="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="mb-3">{renderStars(review.rating)}</div>

              {/* Review text */}
              {review.review_text && (
                <p className="text-gray-700 dark:text-text-dark-secondary mb-4 transition-colors">{review.review_text}</p>
              )}

              {/* Helpful Button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleMarkHelpful(review.id)}
                  disabled={review.student_id === user?.id}
                  className={`flex items-center gap-2 text-sm ${
                    review.student_id === user?.id
                      ? 'text-gray-400 dark:text-text-dark-muted cursor-not-allowed'
                      : 'text-gray-600 dark:text-text-dark-secondary hover:text-brand-blue'
                  } transition-colors`}
                >
                  <ThumbsUp className="h-4 w-4" />
                  Helpful ({review.helpful_count || 0})
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-text-dark-primary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>

          <div className="flex items-center gap-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    currentPage === pageNum
                      ? 'bg-brand-blue text-white'
                      : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-text-dark-primary hover:bg-gray-200 dark:hover:bg-dark-600'
                  }`}
                >
                  {pageNum}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-text-dark-primary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>

    <Modal
      isOpen={!!deleteReviewId}
      onClose={() => setDeleteReviewId(null)}
      title="Delete Review"
      size="sm"
    >
      <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
        Are you sure you want to delete this review?
      </p>
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setDeleteReviewId(null)}>Cancel</Button>
        <Button variant="danger" onClick={confirmDeleteReview}>Delete Review</Button>
      </div>
    </Modal>
    </>
  );
}
