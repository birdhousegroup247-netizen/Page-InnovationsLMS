/**
 * Announcements Controller
 * Handles course announcements from instructors
 */

const { CourseAnnouncement, Course, User, Enrollment } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const NotificationsController = require('../notifications/notificationsController');

class AnnouncementsController {
  /**
   * Create a course announcement
   * POST /api/courses/:courseId/announcements
   */
  static async createAnnouncement(req, res, next) {
    try {
      const { courseId } = req.params;
      const { title, message, priority, scheduled_at } = req.body;
      const instructorId = req.user.id;

      if (!title || !message) {
        throw new BadRequestError('Title and message are required');
      }

      // Validate course exists
      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Verify instructor owns the course or is admin
      if (course.instructor_id !== instructorId && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Only the course instructor or admin can create announcements');
      }

      // Create announcement
      const announcement = await CourseAnnouncement.create({
        course_id: courseId,
        instructor_id: instructorId,
        title,
        message,
        priority: priority || 'normal',
        scheduled_at: scheduled_at || null,
      });

      // Get all enrolled students
      const enrollments = await Enrollment.findAll({
        where: { course_id: courseId },
        attributes: ['student_id'],
      });

      // Create notifications for all enrolled students
      if (enrollments.length > 0) {
        const notifications = enrollments.map((enrollment) => ({
          user_id: enrollment.student_id,
          type: 'announcement',
          title: `New Announcement: ${title}`,
          message: message.substring(0, 150) + (message.length > 150 ? '...' : ''),
          link: `/courses/${courseId}/announcements/${announcement.id}`,
          priority: priority === 'urgent' ? 'high' : 'normal',
        }));

        await NotificationsController.createBulkNotifications(notifications);
      }

      logger.info(`Instructor ${instructorId} created announcement for course ${courseId}`);

      return ApiResponse.success(res, { announcement }, 'Announcement created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all announcements for a course
   * GET /api/courses/:courseId/announcements
   */
  static async getCourseAnnouncements(req, res, next) {
    try {
      const { courseId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      // Validate course exists
      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      const { count, rows } = await CourseAnnouncement.findAndCountAll({
        where: { course_id: courseId },
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'full_name', 'profile_picture'],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        announcements: rows,
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
   * Get a specific announcement
   * GET /api/announcements/:announcementId
   */
  static async getAnnouncementById(req, res, next) {
    try {
      const { announcementId } = req.params;

      const announcement = await CourseAnnouncement.findByPk(announcementId, {
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title'],
          },
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'full_name', 'profile_picture'],
          },
        ],
      });

      if (!announcement) {
        throw new NotFoundError('Announcement not found');
      }

      return ApiResponse.success(res, { announcement });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update an announcement
   * PUT /api/announcements/:announcementId
   */
  static async updateAnnouncement(req, res, next) {
    try {
      const { announcementId } = req.params;
      const { title, message, priority } = req.body;
      const userId = req.user.id;

      const announcement = await CourseAnnouncement.findByPk(announcementId);

      if (!announcement) {
        throw new NotFoundError('Announcement not found');
      }

      // Verify instructor owns the announcement or is admin
      if (announcement.instructor_id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Only the announcement creator or admin can update it');
      }

      // Update fields
      if (title) announcement.title = title;
      if (message) announcement.message = message;
      if (priority) announcement.priority = priority;
      await announcement.save();

      logger.info(`Announcement ${announcementId} updated by user ${userId}`);

      return ApiResponse.success(res, { announcement }, 'Announcement updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete an announcement
   * DELETE /api/announcements/:announcementId
   */
  static async deleteAnnouncement(req, res, next) {
    try {
      const { announcementId } = req.params;
      const userId = req.user.id;

      const announcement = await CourseAnnouncement.findByPk(announcementId);

      if (!announcement) {
        throw new NotFoundError('Announcement not found');
      }

      // Verify instructor owns the announcement or is admin
      if (announcement.instructor_id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Only the announcement creator or admin can delete it');
      }

      await announcement.destroy();

      logger.info(`Announcement ${announcementId} deleted by user ${userId}`);

      return ApiResponse.success(res, null, 'Announcement deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all announcements for authenticated student (from enrolled courses)
   * GET /api/announcements/my
   */
  static async getMyAnnouncements(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      const studentId = req.user.id;

      // Get enrolled course IDs
      const enrollments = await Enrollment.findAll({
        where: { student_id: studentId },
        attributes: ['course_id'],
      });

      const courseIds = enrollments.map((e) => e.course_id);

      if (courseIds.length === 0) {
        return ApiResponse.success(res, {
          announcements: [],
          pagination: {
            currentPage: parseInt(page),
            totalPages: 0,
            totalItems: 0,
            itemsPerPage: parseInt(limit),
          },
        });
      }

      const { count, rows } = await CourseAnnouncement.findAndCountAll({
        where: {
          course_id: {
            [Op.in]: courseIds,
          },
        },
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title', 'thumbnail'],
          },
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'full_name', 'profile_picture'],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        announcements: rows,
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
}

module.exports = AnnouncementsController;
