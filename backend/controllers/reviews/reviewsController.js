/**
 * Reviews Controller
 * Handles course reviews and ratings
 */

const { CourseReview, Course, User, Enrollment } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const NotificationsController = require('../notifications/notificationsController');
const CacheService = require('../../services/cache/cacheService');

class ReviewsController {
  /**
   * Submit a course review
   * POST /api/courses/:courseId/reviews
   */
  static async submitReview(req, res, next) {
    try {
      const { courseId } = req.params;
      const { rating, review_text } = req.body;
      const studentId = req.user.id;

      // Validate rating
      if (!rating || rating < 1 || rating > 5) {
        throw new BadRequestError('Rating must be between 1 and 5');
      }

      // Check if course exists
      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Check if student is enrolled
      const enrollment = await Enrollment.findOne({
        where: { student_id: studentId, course_id: courseId },
      });

      if (!enrollment) {
        throw new ForbiddenError('You must be enrolled in this course to review it');
      }

      // Check if student already reviewed
      const existingReview = await CourseReview.findOne({
        where: { student_id: studentId, course_id: courseId },
      });

      if (existingReview) {
        throw new BadRequestError('You have already reviewed this course. Use the update endpoint to modify your review.');
      }

      // Create review
      const review = await CourseReview.create({
        course_id: courseId,
        student_id: studentId,
        rating,
        review_text: review_text || null,
        is_approved: true, // Auto-approve for now; can be changed to require moderation
      });

      // Update course average rating
      await this.updateCourseRating(courseId);

      logger.info(`Student ${studentId} reviewed course ${courseId} with rating ${rating}`);

      return ApiResponse.success(res, { review }, 'Review submitted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all reviews for a course
   * GET /api/courses/:courseId/reviews
   */
  static async getCourseReviews(req, res, next) {
    try {
      const { courseId } = req.params;
      const { page = 1, limit = 10, sort = 'recent' } = req.query;
      const offset = (page - 1) * limit;

      // Check if course exists
      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Determine sort order
      let order;
      switch (sort) {
        case 'helpful':
          order = [['helpful_count', 'DESC']];
          break;
        case 'rating_high':
          order = [['rating', 'DESC']];
          break;
        case 'rating_low':
          order = [['rating', 'ASC']];
          break;
        default: // recent
          order = [['created_at', 'DESC']];
      }

      const { count, rows } = await CourseReview.findAndCountAll({
        where: {
          course_id: courseId,
          is_approved: true,
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'profile_picture'],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
      });

      return ApiResponse.success(res, {
        reviews: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get review statistics for a course
   * GET /api/courses/:courseId/reviews/stats
   */
  static async getReviewStats(req, res, next) {
    try {
      const { courseId } = req.params;

      // Try cache first
      const cachedRating = await CacheService.getCachedCourseRating(courseId);

      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Get rating distribution
      const reviews = await CourseReview.findAll({
        where: {
          course_id: courseId,
          is_approved: true,
        },
        attributes: ['rating'],
      });

      const totalReviews = reviews.length;
      const ratingDistribution = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      };

      reviews.forEach((review) => {
        ratingDistribution[review.rating]++;
      });

      // Calculate percentages
      const ratingPercentages = {};
      Object.keys(ratingDistribution).forEach((rating) => {
        ratingPercentages[rating] = totalReviews > 0 ? ((ratingDistribution[rating] / totalReviews) * 100).toFixed(1) : 0;
      });

      const averageRating = cachedRating !== null ? cachedRating : (course.average_rating || 0);

      return ApiResponse.success(res, {
        average_rating: averageRating,
        total_reviews: totalReviews,
        rating_distribution: ratingDistribution,
        rating_percentages: ratingPercentages,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a review
   * PUT /api/courses/:courseId/reviews/:reviewId
   */
  static async updateReview(req, res, next) {
    try {
      const { courseId, reviewId } = req.params;
      const { rating, review_text } = req.body;
      const studentId = req.user.id;

      // Validate rating if provided
      if (rating && (rating < 1 || rating > 5)) {
        throw new BadRequestError('Rating must be between 1 and 5');
      }

      const review = await CourseReview.findByPk(reviewId);

      if (!review) {
        throw new NotFoundError('Review not found');
      }

      // Verify ownership
      if (review.student_id !== studentId) {
        throw new ForbiddenError('You can only update your own reviews');
      }

      // Verify course match
      if (review.course_id !== parseInt(courseId)) {
        throw new BadRequestError('Review does not belong to this course');
      }

      // Update review
      if (rating) review.rating = rating;
      if (review_text !== undefined) review.review_text = review_text;
      await review.save();

      // Update course average rating
      await this.updateCourseRating(courseId);

      logger.info(`Student ${studentId} updated review ${reviewId}`);

      return ApiResponse.success(res, { review }, 'Review updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a review
   * DELETE /api/courses/:courseId/reviews/:reviewId
   */
  static async deleteReview(req, res, next) {
    try {
      const { courseId, reviewId } = req.params;
      const studentId = req.user.id;

      const review = await CourseReview.findByPk(reviewId);

      if (!review) {
        throw new NotFoundError('Review not found');
      }

      // Only the review owner or admin can delete
      if (review.student_id !== studentId && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only delete your own reviews');
      }

      // Verify course match
      if (review.course_id !== parseInt(courseId)) {
        throw new BadRequestError('Review does not belong to this course');
      }

      await review.destroy();

      // Update course average rating
      await this.updateCourseRating(courseId);

      logger.info(`Review ${reviewId} deleted by user ${req.user.id}`);

      return ApiResponse.success(res, null, 'Review deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark review as helpful
   * POST /api/courses/:courseId/reviews/:reviewId/helpful
   */
  static async markHelpful(req, res, next) {
    try {
      const { reviewId } = req.params;

      const review = await CourseReview.findByPk(reviewId);

      if (!review) {
        throw new NotFoundError('Review not found');
      }

      review.helpful_count += 1;
      await review.save();

      logger.info(`Review ${reviewId} marked as helpful by user ${req.user.id}`);

      return ApiResponse.success(res, { helpful_count: review.helpful_count }, 'Review marked as helpful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Helper: Update course average rating
   * Called after review create/update/delete
   */
  static async updateCourseRating(courseId) {
    try {
      const reviews = await CourseReview.findAll({
        where: {
          course_id: courseId,
          is_approved: true,
        },
        attributes: ['rating'],
      });

      if (reviews.length === 0) {
        await Course.update({ average_rating: 0 }, { where: { id: courseId } });
        // Clear cache
        await CacheService.cacheCourseRating(courseId, 0);
        return;
      }

      const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = (totalRating / reviews.length).toFixed(2);

      await Course.update({ average_rating: averageRating }, { where: { id: courseId } });

      // Cache the rating for 30 minutes
      await CacheService.cacheCourseRating(courseId, parseFloat(averageRating), 1800);

      // Invalidate course cache
      await CacheService.invalidateCourse(courseId);

      logger.info(`Updated course ${courseId} average rating to ${averageRating}`);
    } catch (error) {
      logger.error(`Error updating course rating: ${error.message}`);
    }
  }
}

module.exports = ReviewsController;
