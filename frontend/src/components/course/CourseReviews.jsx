import { useState, useEffect } from 'react';
import { Star, ThumbsUp, Edit2, Trash2, AlertCircle, CheckCircle } from 'lucide-react';
import { coursesAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../ui/Button';
import Modal from '../ui/Modal';

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
    comment: '',
  });
  const [submitting, setSubmitting] = useState(false);

  // Filter state
  const [filter, setFilter] = useState('all'); // all, 5, 4, 3, 2, 1

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchReviews();
    fetchStats();
  }, [courseId, filter, currentPage]);

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

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!reviewForm.comment.trim()) {
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
      setReviewForm({ rating: 5, comment: '' });
      setShowReviewForm(false);
      setEditingReview(null);

      // Refresh reviews
      fetchReviews();
      fetchStats();

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
      comment: review.comment,
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
      <div className="flex gap-1">
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
                  : 'text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const userHasReviewed = reviews.some(r => r.user_id === user?.id);
  const canLeaveReview = isEnrolled && user?.role === 'student' && !userHasReviewed;

  return (
    <>
    <div className="card p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-text-primary">
          Reviews & Ratings
        </h2>
        {canLeaveReview && !showReviewForm && (
          <button
            onClick={() => setShowReviewForm(true)}
            className="btn-primary text-sm"
          >
            Write a Review
          </button>
        )}
      </div>

      {/* Messages */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <div className="bg-dark-700 border border-dark-600 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-text-primary mb-4">
            {editingReview ? 'Edit Your Review' : 'Write Your Review'}
          </h3>
          <form onSubmit={handleSubmitReview} className="space-y-4">
            {/* Rating */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Rating
              </label>
              {renderStars(reviewForm.rating, true, (rating) =>
                setReviewForm({ ...reviewForm, rating })
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-medium text-text-primary mb-2">
                Comment
              </label>
              <textarea
                value={reviewForm.comment}
                onChange={(e) =>
                  setReviewForm({ ...reviewForm, comment: e.target.value })
                }
                rows={4}
                className="w-full bg-dark-600 border border-dark-500 text-text-primary rounded-lg px-4 py-3 focus:outline-none focus:border-brand-blue resize-none"
                placeholder="Share your experience with this course..."
                required
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : editingReview ? 'Update Review' : 'Submit Review'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowReviewForm(false);
                  setEditingReview(null);
                  setReviewForm({ rating: 5, comment: '' });
                }}
                className="btn-ghost"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Stats Summary */}
      {stats && (
        <div className="bg-dark-700 border border-dark-600 rounded-lg p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Average Rating */}
            <div className="text-center">
              <div className="text-5xl font-bold text-text-primary mb-2">
                {stats.averageRating ? stats.averageRating.toFixed(1) : '0.0'}
              </div>
              {renderStars(Math.round(stats.averageRating || 0))}
              <p className="text-sm text-text-secondary mt-2">
                {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
              </p>
            </div>

            {/* Rating Breakdown */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingBreakdown?.[star] || 0;
                const percentage = stats.totalReviews > 0
                  ? (count / stats.totalReviews) * 100
                  : 0;

                return (
                  <button
                    key={star}
                    onClick={() => setFilter(star.toString())}
                    className={`w-full flex items-center gap-3 hover:bg-dark-600 p-2 rounded transition-colors ${
                      filter === star.toString() ? 'bg-dark-600' : ''
                    }`}
                  >
                    <span className="text-sm text-text-primary w-8">{star} ★</span>
                    <div className="flex-1 h-2 bg-dark-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-text-secondary w-8 text-right">
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
              onClick={() => setFilter('all')}
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
            <p className="mt-4 text-text-secondary">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-text-secondary">
              {filter === 'all'
                ? 'No reviews yet. Be the first to review this course!'
                : `No ${filter}-star reviews yet.`}
            </p>
          </div>
        ) : (
          reviews.map((review) => (
            <div
              key={review.id}
              className="bg-dark-700 border border-dark-600 rounded-lg p-6"
            >
              {/* Review Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white font-semibold">
                    {review.User?.full_name?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div>
                    <p className="font-medium text-text-primary">
                      {review.User?.full_name || 'Anonymous'}
                    </p>
                    <p className="text-xs text-text-tertiary">
                      {new Date(review.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions for own review */}
                {review.user_id === user?.id && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEditReview(review)}
                      className="p-2 text-text-secondary hover:text-brand-blue hover:bg-dark-600 rounded-lg transition-colors"
                      title="Edit review"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="p-2 text-text-secondary hover:text-red-400 hover:bg-dark-600 rounded-lg transition-colors"
                      title="Delete review"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Rating */}
              <div className="mb-3">{renderStars(review.rating)}</div>

              {/* Comment */}
              <p className="text-text-secondary mb-4">{review.comment}</p>

              {/* Helpful Button */}
              <div className="flex items-center gap-4">
                <button
                  onClick={() => handleMarkHelpful(review.id)}
                  disabled={review.user_id === user?.id}
                  className={`flex items-center gap-2 text-sm ${
                    review.user_id === user?.id
                      ? 'text-text-tertiary cursor-not-allowed'
                      : 'text-text-secondary hover:text-brand-blue'
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
            className="px-4 py-2 bg-dark-700 text-text-primary rounded-lg hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
                      : 'bg-dark-700 text-text-primary hover:bg-dark-600'
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
            className="px-4 py-2 bg-dark-700 text-text-primary rounded-lg hover:bg-dark-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
