/**
 * Export Controller
 * Handles data export requests (CSV, PDF)
 */

const { Course, Enrollment, User, CourseReview, ActivityLog, AssignedTestAttempt } = require('../../models');
const ExportService = require('../../services/export/exportService');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { ForbiddenError } = require('../../utils/errors');

class ExportController {
  /**
   * Export enrollments to CSV
   * GET /api/export/enrollments/csv
   */
  static async exportEnrollmentsCSV(req, res, next) {
    try {
      const { course_id, status, start_date, end_date } = req.query;
      const { Op } = require('sequelize');

      const where = {};
      if (course_id) where.course_id = course_id;

      // Handle status filter (status doesn't exist in DB, use completed_at and progress_percentage)
      if (status === 'completed') {
        where.completed_at = { [Op.ne]: null };
      } else if (status === 'in_progress' || status === 'active') {
        where.completed_at = null;
        where.progress_percentage = { [Op.gt]: 0 };
      } else if (status === 'not_started') {
        where.progress_percentage = 0;
      }

      if (start_date || end_date) {
        where.enrollment_date = {};
        if (start_date) where.enrollment_date[Op.gte] = new Date(start_date);
        if (end_date) where.enrollment_date[Op.lte] = new Date(end_date);
      }

      const enrollments = await Enrollment.findAll({
        where,
        include: [
          { model: User, as: 'student', attributes: ['id', 'full_name', 'email'] },
          { model: Course, as: 'course', attributes: ['id', 'title'] },
        ],
        order: [['enrollment_date', 'DESC']],
      });

      const { data, filename, contentType } = await ExportService.exportEnrollments(
        enrollments.map((e) => e.toJSON())
      );

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);

      logger.info(`User ${req.user.id} exported ${enrollments.length} enrollments to CSV`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export students to CSV
   * GET /api/export/students/csv
   */
  static async exportStudentsCSV(req, res, next) {
    try {
      const { role, is_active } = req.query;

      const where = {};
      if (role) where.role = role;
      if (is_active !== undefined) where.is_active = is_active === 'true';

      const students = await User.findAll({
        where,
        attributes: { exclude: ['password'] },
        order: [['created_at', 'DESC']],
      });

      const { data, filename, contentType } = await ExportService.exportStudents(students.map((s) => s.toJSON()));

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);

      logger.info(`User ${req.user.id} exported ${students.length} students to CSV`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export course analytics to CSV
   * GET /api/export/courses/analytics/csv
   */
  static async exportCourseAnalyticsCSV(req, res, next) {
    try {
      const courses = await Course.findAll({
        include: [{ model: User, as: 'instructor', attributes: ['id', 'full_name'] }],
        order: [['created_at', 'DESC']],
      });

      // Calculate completion rates
      const analytics = await Promise.all(
        courses.map(async (course) => {
          const courseData = course.toJSON();
          courseData.completion_rate =
            courseData.enrollment_count > 0
              ? ((courseData.completion_count / courseData.enrollment_count) * 100).toFixed(2)
              : 0;
          return courseData;
        })
      );

      const { data, filename, contentType } = await ExportService.exportCourseAnalytics(analytics);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);

      logger.info(`User ${req.user.id} exported course analytics to CSV`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export reviews to CSV
   * GET /api/export/reviews/csv
   */
  static async exportReviewsCSV(req, res, next) {
    try {
      const { course_id, is_approved } = req.query;

      const where = {};
      if (course_id) where.course_id = course_id;
      if (is_approved !== undefined) where.is_approved = is_approved === 'true';

      const reviews = await CourseReview.findAll({
        where,
        include: [
          { model: User, as: 'student', attributes: ['id', 'full_name'] },
          { model: Course, as: 'course', attributes: ['id', 'title'] },
        ],
        order: [['created_at', 'DESC']],
      });

      const { data, filename, contentType } = await ExportService.exportReviews(reviews.map((r) => r.toJSON()));

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);

      logger.info(`User ${req.user.id} exported ${reviews.length} reviews to CSV`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Export activity logs to CSV
   * GET /api/export/activity-logs/csv
   */
  static async exportActivityLogsCSV(req, res, next) {
    try {
      const { action, entity_type, start_date, end_date } = req.query;

      const where = {};
      if (action) where.action = action;
      if (entity_type) where.entity_type = entity_type;
      if (start_date || end_date) {
        where.created_at = {};
        if (start_date) where.created_at[Op.gte] = new Date(start_date);
        if (end_date) where.created_at[Op.lte] = new Date(end_date);
      }

      const logs = await ActivityLog.findAll({
        where,
        include: [{ model: User, as: 'user', attributes: ['id', 'full_name', 'email'] }],
        order: [['created_at', 'DESC']],
        limit: 10000, // Limit to prevent huge exports
      });

      const { data, filename, contentType } = await ExportService.exportActivityLogs(logs.map((l) => l.toJSON()));

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);

      logger.info(`User ${req.user.id} exported ${logs.length} activity logs to CSV`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate course report PDF
   * GET /api/export/courses/:courseId/report/pdf
   */
  static async generateCourseReportPDF(req, res, next) {
    try {
      const { courseId } = req.params;

      const course = await Course.findByPk(courseId, {
        include: [{ model: User, as: 'instructor', attributes: ['id', 'full_name'] }],
      });

      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Check authorization - instructor or admin
      if (
        course.instructor_id !== req.user.id &&
        !['admin', 'super_admin'].includes(req.user.role)
      ) {
        throw new ForbiddenError('You do not have permission to generate this report');
      }

      const courseData = course.toJSON();
      courseData.completion_rate =
        courseData.enrollment_count > 0
          ? ((courseData.completion_count / courseData.enrollment_count) * 100).toFixed(2)
          : 0;

      const { data, filename, contentType } = await ExportService.generateCourseReportPDF(courseData);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);

      logger.info(`User ${req.user.id} generated course report PDF for course ${courseId}`);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Generate enrollment report PDF
   * GET /api/export/enrollments/report/pdf
   */
  static async generateEnrollmentReportPDF(req, res, next) {
    try {
      const { status } = req.query;
      const { Op } = require('sequelize');

      const where = {};
      // Handle status filter (status doesn't exist in DB)
      if (status === 'completed') {
        where.completed_at = { [Op.ne]: null };
      } else if (status === 'in_progress' || status === 'active') {
        where.completed_at = null;
        where.progress_percentage = { [Op.gt]: 0 };
      } else if (status === 'not_started') {
        where.progress_percentage = 0;
      }

      const enrollments = await Enrollment.findAll({
        where,
        include: [
          { model: User, as: 'student', attributes: ['id', 'full_name', 'email'] },
          { model: Course, as: 'course', attributes: ['id', 'title'] },
        ],
        order: [['enrollment_date', 'DESC']],
        limit: 50, // Recent 50 for PDF
      });

      const enrollmentData = {
        total: enrollments.length,
        active: enrollments.filter((e) => !e.completed_at && e.progress_percentage > 0).length,
        completed: enrollments.filter((e) => e.completed_at !== null).length,
        not_started: enrollments.filter((e) => e.progress_percentage === 0).length,
        recent: enrollments.slice(0, 20).map((e) => e.toJSON()),
      };

      const { data, filename, contentType } = await ExportService.generateEnrollmentReportPDF(enrollmentData);

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(data);

      logger.info(`User ${req.user.id} generated enrollment report PDF`);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ExportController;
