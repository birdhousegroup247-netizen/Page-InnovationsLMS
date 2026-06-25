const { LiveSession, Course, User, Enrollment, Notification } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const NotificationsController = require('../notifications/notificationsController');
const logger = require('../../utils/logger');
const zoomService = require('../../services/zoom/zoomService');

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

      const isAdminOrInstructor = ['admin', 'super_admin', 'instructor'].includes(req.user?.role);

      // Hide zoom_start_url from students — only visible to the session's own instructor or admin
      const sessionsData = sessions.map((s) => {
        const data = s.toJSON();
        const canSeeStartUrl =
          isAdminOrInstructor &&
          (req.user?.id === s.instructor_id || ['admin', 'super_admin'].includes(req.user?.role));
        if (!canSeeStartUrl) delete data.zoom_start_url;
        return data;
      });

      return ApiResponse.success(res, { sessions: sessionsData });
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

      const isZoom = platform === 'zoom';

      if (!title || !scheduled_at) {
        throw new BadRequestError('title and scheduled_at are required');
      }
      if (!isZoom && !meeting_url) {
        throw new BadRequestError('meeting_url is required for non-Zoom sessions');
      }

      let sessionData = {
        course_id: parseInt(courseId),
        instructor_id: req.user.id,
        title,
        description,
        meeting_url: meeting_url || null,
        platform: platform || 'other',
        scheduled_at,
        duration_minutes: duration_minutes || 60,
        status: 'scheduled',
      };

      // Auto-create Zoom meeting
      if (isZoom) {
        try {
          const zoom = await zoomService.createMeeting({
            topic: title,
            startTime: scheduled_at,
            durationMinutes: duration_minutes || 60,
          });
          sessionData.meeting_url = zoom.joinUrl;
          sessionData.zoom_meeting_id = zoom.meetingId;
          sessionData.zoom_start_url = zoom.startUrl;
        } catch (zoomErr) {
          logger.error(`Zoom meeting creation failed: ${zoomErr.message}`);
          throw new BadRequestError(`Could not create Zoom meeting: ${zoomErr.message}`);
        }
      }

      const session = await LiveSession.create(sessionData);

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

      // Sync Zoom meeting if it exists and any relevant fields changed
      if (session.zoom_meeting_id && (title || scheduled_at || duration_minutes)) {
        try {
          await zoomService.updateMeeting(session.zoom_meeting_id, {
            topic: title || session.title,
            startTime: scheduled_at || session.scheduled_at,
            durationMinutes: duration_minutes || session.duration_minutes,
          });
        } catch (zoomErr) {
          logger.warn(`Zoom meeting update failed (non-critical): ${zoomErr.message}`);
        }
      }

      await session.update({
        title: title || session.title,
        description: description !== undefined ? description : session.description,
        // Only update meeting_url for non-Zoom sessions (Zoom URL stays the same)
        meeting_url: session.zoom_meeting_id ? session.meeting_url : (meeting_url || session.meeting_url),
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

      // Auto-delete Zoom meeting if one was created
      if (session.zoom_meeting_id) {
        try {
          await zoomService.deleteMeeting(session.zoom_meeting_id);
        } catch (zoomErr) {
          logger.warn(`Zoom meeting deletion failed (non-critical): ${zoomErr.message}`);
          // Don't block session deletion if Zoom fails
        }
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

      const prevStatus = session.status;
      await session.update({ status });

      // Session just ended → auto-mark every unmarked enrolled student
      // as 'absent'. Fire-and-forget so a roster crawl can't block the
      // response. Hourly zombie sweep also calls this as a safety net.
      if (status === 'ended' && prevStatus !== 'ended') {
        const { autoMarkAbsentees } = require('./attendanceController');
        autoMarkAbsentees(session)
          .then((n) => {
            if (n > 0) logger.info(`[attendance] auto-marked ${n} absentee(s) for session ${session.id}`);
          })
          .catch((err) => logger.warn(`[attendance] auto-mark failed for session ${session.id}: ${err.message}`));
      }

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
