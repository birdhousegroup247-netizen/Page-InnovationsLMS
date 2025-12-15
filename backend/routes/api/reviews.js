/**
 * Reviews Routes
 * API endpoints for course reviews and ratings
 */

const express = require('express');
const router = express.Router();
const ReviewsController = require('../../controllers/reviews/reviewsController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// COURSE REVIEW ROUTES
// ============================================================================

// Get all reviews for a course (Public)
router.get('/courses/:courseId/reviews', ReviewsController.getCourseReviews);

// Get review statistics for a course (Public)
router.get('/courses/:courseId/reviews/stats', ReviewsController.getReviewStats);

// Submit a review (Student only)
router.post('/courses/:courseId/reviews', authenticate, authorize('student'), ReviewsController.submitReview);

// Update a review (Student only - own review)
router.put('/courses/:courseId/reviews/:reviewId', authenticate, authorize('student'), ReviewsController.updateReview);

// Delete a review (Student or Admin)
router.delete('/courses/:courseId/reviews/:reviewId', authenticate, ReviewsController.deleteReview);

// Mark review as helpful (Authenticated)
router.post('/courses/:courseId/reviews/:reviewId/helpful', authenticate, ReviewsController.markHelpful);

module.exports = router;
