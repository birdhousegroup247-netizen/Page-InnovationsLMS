const { AdminAnnouncement, User, Course, Enrollment } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { BadRequestError, NotFoundError } = require('../../utils/errors');
const { Op } = require('sequelize');
const NotificationsController = require('../notifications/notificationsController');

class AdminAnnouncementsController {
  // GET /api/admin/announcements — history
  static async getAll(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await AdminAnnouncement.findAndCountAll({
        include: [
          { model: User, as: 'admin', attributes: ['id', 'full_name', 'email'] },
          { model: Course, as: 'course', attributes: ['id', 'title'], required: false },
        ],
        limit: parseInt(limit),
        offset,
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        announcements: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/announcements/recipient-count — preview how many users will receive
  static async getRecipientCount(req, res, next) {
    try {
      const { target, course_id } = req.query;
      const count = await AdminAnnouncementsController._resolveRecipients(target, course_id, true);
      return ApiResponse.success(res, { count });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/announcements — send announcement
  static async send(req, res, next) {
    try {
      const {
        title,
        message,
        target,
        course_id,
        link,
        attachment_url,
        attachment_type,
        attachment_name,
      } = req.body;

      if (!title || !message || !target) {
        throw new BadRequestError('title, message, and target are required');
      }

      const validTargets = ['all_users', 'all_students', 'all_instructors', 'course'];
      if (!validTargets.includes(target)) {
        throw new BadRequestError('Invalid target. Must be: all_users, all_students, all_instructors, or course');
      }

      if (target === 'course' && !course_id) {
        throw new BadRequestError('course_id is required when target is "course"');
      }

      if (target === 'course') {
        const course = await Course.findByPk(course_id);
        if (!course) throw new NotFoundError('Course not found');
      }

      // Resolve recipients
      const recipientIds = await AdminAnnouncementsController._resolveRecipients(target, course_id, false);

      if (recipientIds.length === 0) {
        throw new BadRequestError('No recipients found for the selected audience');
      }

      // Save announcement record first
      const announcement = await AdminAnnouncement.create({
        admin_id: req.user.id,
        title,
        message,
        target,
        course_id: course_id || null,
        link: link || null,
        attachment_url: attachment_url || null,
        attachment_type: attachment_type || null,
        attachment_name: attachment_name || null,
        recipient_count: recipientIds.length,
      });

      // Bulk create notifications (fire in background — don't block response)
      const notifications = recipientIds.map(user_id => ({
        user_id,
        type: 'announcement',
        title,
        message,
        link: link || null,
        priority: 'normal',
      }));

      NotificationsController.createBulkNotifications(notifications).catch(err =>
        logger.error('Announcement bulk notify error:', err.message)
      );

      logger.info(`Admin ${req.user.email} sent announcement "${title}" to ${recipientIds.length} users (target: ${target})`);

      return ApiResponse.created(res, { announcement }, `Announcement sent to ${recipientIds.length} users`);
    } catch (error) {
      next(error);
    }
  }

  // Internal: resolve recipient user IDs based on target
  static async _resolveRecipients(target, course_id, countOnly) {
    let users;

    if (target === 'all_users') {
      users = await User.findAll({
        where: { is_active: true },
        attributes: ['id'],
        raw: true,
      });
    } else if (target === 'all_students') {
      users = await User.findAll({
        where: { is_active: true, role: 'student' },
        attributes: ['id'],
        raw: true,
      });
    } else if (target === 'all_instructors') {
      users = await User.findAll({
        where: { is_active: true, role: ['instructor', 'admin', 'super_admin'] },
        attributes: ['id'],
        raw: true,
      });
    } else if (target === 'course') {
      const enrollments = await Enrollment.findAll({
        where: { course_id },
        attributes: ['student_id'],
        raw: true,
      });
      if (countOnly) return enrollments.length;
      return enrollments.map(e => e.student_id);
    }

    if (countOnly) return users.length;
    return users.map(u => u.id);
  }
}

module.exports = AdminAnnouncementsController;
