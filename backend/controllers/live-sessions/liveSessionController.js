const { LiveSession, Course, User, Enrollment, Notification } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const NotificationsController = require('../notifications/notificationsController');
const logger = require('../../utils/logger');

class LiveSessionController {
  // GET /api/courses/:courseId/sessions
  static async getByCourse(req, res, next) {
    try {
      const { courseId } = req.params;

      const sessions = await LiveSession.findAll({
        where: { course_id: courseId },
        include: [
          { model: User, as: 'instructor', attributes: ['id', 'full_name', 'profile_picture'] },
        ],
        order: [['scheduled_at', 'ASC']],
      });

      return ApiResponse.success(res, { sessions });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/courses/:courseId/sessions
  static async create(req, res, next) {
    try {
      const { courseId } = req.params;
      const { title, description, meeting_url, platform, scheduled_at, duration_minutes } = req.body;

      const course = await Course.findByPk(courseId);
      if (!course) throw new NotFoundError('Course not found');

      // Only course instructor or admin can create sessions
      if (course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Only the course instructor can create sessions');
      }

      if (!title || !meeting_url || !scheduled_at) {
        throw new BadRequestError('title, meeting_url, and scheduled_at are required');
      }

      const session = await LiveSession.create({
        course_id: parseInt(courseId),
        instructor_id: req.user.id,
        title,
        description,
        meeting_url,
        platform: platform || 'other',
        scheduled_at,
        duration_minutes: duration_minutes || 60,
        status: 'scheduled',
      });

      // Notify enrolled students
      try {
        const enrollments = await Enrollment.findAll({
          where: { course_id: courseId },
          attributes: ['student_id'],
        });
        if (enrollments.length > 0) {
          const notifications = enrollments.map((e) => ({
            user_id: e.student_id,
            type: 'live_session',
            title: 'New Live Session Scheduled',
            message: `"${title}" has been scheduled for ${new Date(scheduled_at).toLocaleDateString()}`,
            link: `/courses/${courseId}/learn`,
            priority: 'normal',
          }));
          await NotificationsController.createBulkNotifications(notifications);
        }
      } catch (notifErr) {
        logger.error('Failed to send live session notifications:', notifErr.message);
      }

      return ApiResponse.created(res, { session }, 'Live session created');
    } catch (error) {
      next(error);
    }
  }

  // PUT /api/sessions/:id
  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { title, description, meeting_url, platform, scheduled_at, duration_minutes, recording_url } = req.body;

      const session = await LiveSession.findByPk(id);
      if (!session) throw new NotFoundError('Session not found');

      if (session.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Only the session instructor can update it');
      }

      await session.update({
        title: title || session.title,
        description: description !== undefined ? description : session.description,
        meeting_url: meeting_url || session.meeting_url,
        platform: platform || session.platform,
        scheduled_at: scheduled_at || session.scheduled_at,
        duration_minutes: duration_minutes || session.duration_minutes,
        recording_url: recording_url !== undefined ? recording_url : session.recording_url,
      });

      return ApiResponse.success(res, { session }, 'Session updated');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/sessions/:id
  static async deleteSession(req, res, next) {
    try {
      const { id } = req.params;

      const session = await LiveSession.findByPk(id);
      if (!session) throw new NotFoundError('Session not found');

      if (session.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Only the session instructor can cancel it');
      }

      await session.destroy();

      return ApiResponse.success(res, null, 'Session cancelled');
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/sessions/:id/status
  static async updateStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!['scheduled', 'live', 'ended'].includes(status)) {
        throw new BadRequestError('Status must be scheduled, live, or ended');
      }

      const session = await LiveSession.findByPk(id);
      if (!session) throw new NotFoundError('Session not found');

      if (session.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Only the session instructor can update status');
      }

      await session.update({ status });

      // If going live, send in-app notification
      if (status === 'live') {
        try {
          const enrollments = await Enrollment.findAll({
            where: { course_id: session.course_id },
            attributes: ['student_id'],
          });
          if (enrollments.length > 0) {
            const notifications = enrollments.map((e) => ({
              user_id: e.student_id,
              type: 'live_session',
              title: 'Live Session is Starting!',
              message: `"${session.title}" is now live. Join now!`,
              link: `/courses/${session.course_id}/learn`,
              priority: 'high',
            }));
            await NotificationsController.createBulkNotifications(notifications);
          }
        } catch (notifErr) {
          logger.error('Failed to send live notifications:', notifErr.message);
        }
      }

      return ApiResponse.success(res, { session }, 'Session status updated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = LiveSessionController;
