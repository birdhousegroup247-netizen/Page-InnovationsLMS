const { InstructorReview, User, Course, Enrollment } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op, fn, col } = require('sequelize');

class InstructorReviewController {
  // GET /api/instructors/:instructorId/reviews
  static async getReviews(req, res, next) {
    try {
      const { instructorId } = req.params;

      const instructor = await User.findByPk(instructorId, { attributes: ['id', 'full_name'] });
      if (!instructor) throw new NotFoundError('Instructor not found');

      const reviews = await InstructorReview.findAll({
        where: { instructor_id: instructorId },
        include: [
          { model: User, as: 'student', attributes: ['id', 'full_name', 'profile_picture'] },
          { model: Course, as: 'course', attributes: ['id', 'title'] },
        ],
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, { reviews, instructor });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/instructors/:instructorId/reviews/stats
  static async getStats(req, res, next) {
    try {
      const { instructorId } = req.params;

      const stats = await InstructorReview.findOne({
        where: { instructor_id: instructorId },
        attributes: [
          [fn('AVG', col('rating')), 'average_rating'],
          [fn('COUNT', col('id')), 'total_reviews'],
        ],
        raw: true,
      });

      return ApiResponse.success(res, {
        average_rating: stats?.average_rating ? parseFloat(Number(stats.average_rating).toFixed(2)) : 0,
        total_reviews: parseInt(stats?.total_reviews) || 0,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/instructors/:instructorId/reviews
  static async createReview(req, res, next) {
    try {
      const { instructorId } = req.params;
      const { rating, comment, course_id } = req.body;

      if (!rating || rating < 1 || rating > 5) {
        throw new BadRequestError('Rating must be between 1 and 5');
      }
      if (!course_id) {
        throw new BadRequestError('course_id is required');
      }

      // Verify instructor exists
      const instructor = await User.findByPk(instructorId);
      if (!instructor || !['instructor', 'admin', 'super_admin'].includes(instructor.role)) {
        throw new NotFoundError('Instructor not found');
      }

      // Verify course belongs to this instructor
      const course = await Course.findOne({ where: { id: course_id, instructor_id: instructorId } });
      if (!course) throw new BadRequestError('Course not found for this instructor');

      // Verify student is enrolled in the course
      const enrollment = await Enrollment.findOne({
        where: { student_id: req.user.id, course_id },
      });
      if (!enrollment) throw new ForbiddenError('You must be enrolled in one of this instructor\'s courses to review them');

      // Check for existing review
      const existing = await InstructorReview.findOne({
        where: { instructor_id: instructorId, student_id: req.user.id, course_id },
      });
      if (existing) throw new BadRequestError('You have already reviewed this instructor for this course');

      const review = await InstructorReview.create({
        instructor_id: parseInt(instructorId),
        student_id: req.user.id,
        course_id: parseInt(course_id),
        rating: parseInt(rating),
        comment: comment || null,
      });

      return ApiResponse.created(res, { review }, 'Review submitted successfully');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/instructors/:instructorId/reviews/:reviewId
  static async updateReview(req, res, next) {
    try {
      const { instructorId, reviewId } = req.params;
      const { rating, comment } = req.body;

      const review = await InstructorReview.findOne({
        where: { id: reviewId, instructor_id: instructorId },
      });
      if (!review) throw new NotFoundError('Review not found');
      if (review.student_id !== req.user.id) throw new ForbiddenError('You can only edit your own reviews');

      if (rating && (rating < 1 || rating > 5)) throw new BadRequestError('Rating must be between 1 and 5');

      await review.update({
        rating: rating ? parseInt(rating) : review.rating,
        comment: comment !== undefined ? comment : review.comment,
      });

      return ApiResponse.success(res, { review }, 'Review updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/instructors/:instructorId/reviews/:reviewId
  static async deleteReview(req, res, next) {
    try {
      const { instructorId, reviewId } = req.params;

      const review = await InstructorReview.findOne({
        where: { id: reviewId, instructor_id: instructorId },
      });
      if (!review) throw new NotFoundError('Review not found');

      const isOwner = review.student_id === req.user.id;
      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      if (!isOwner && !isAdmin) throw new ForbiddenError('You can only delete your own reviews');

      await review.destroy();

      return ApiResponse.success(res, null, 'Review deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InstructorReviewController;
