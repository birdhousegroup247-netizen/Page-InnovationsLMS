const express = require('express');
const router = express.Router();
const InstructorReviewController = require('../../controllers/instructor-reviews/instructorReviewController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// GET /api/instructors/:instructorId/reviews
router.get('/:instructorId/reviews', InstructorReviewController.getReviews);

// GET /api/instructors/:instructorId/reviews/stats
router.get('/:instructorId/reviews/stats', InstructorReviewController.getStats);

// POST /api/instructors/:instructorId/reviews  (student only)
router.post('/:instructorId/reviews', authenticate, authorize('student'), InstructorReviewController.createReview);

// PUT /api/instructors/:instructorId/reviews/:reviewId
router.put('/:instructorId/reviews/:reviewId', authenticate, InstructorReviewController.updateReview);

// DELETE /api/instructors/:instructorId/reviews/:reviewId
router.delete('/:instructorId/reviews/:reviewId', authenticate, InstructorReviewController.deleteReview);

module.exports = router;
