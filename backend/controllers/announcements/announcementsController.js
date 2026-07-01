/**
 * Announcements Controller
 * Handles course announcements from instructors
 */

const { CourseAnnouncement, Course, User, Enrollment, AdminAnnouncement, AnnouncementReaction } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const NotificationsController = require('../notifications/notificationsController');
const emailSvc = require('../../services/email/emailService');

// Shared helper for both the create() path and the scheduled cron.
// Sends the course-announcement email to every enrolled student.
// Fire-and-forget per recipient so a slow transport can't block the
// caller. Respects opt-out via emailService.sendEmail's opt-out check.
async function _fanoutAnnouncementEmail(courseId, announcement, courseTitle, instructorName) {
  try {
    const enrollments = await Enrollment.findAll({
      where: { course_id: courseId },
      attributes: ['student_id'],
    });
    if (!enrollments.length) return;
    const students = await User.findAll({
      where: { id: enrollments.map((e) => e.student_id), is_active: true },
      attributes: ['id', 'email', 'full_name'],
    });
    for (const s of students) {
      if (!s.email) continue;
      emailSvc.sendCourseAnnouncement(s.email, s.full_name, {
        id: announcement.id,
        course_id: courseId,
        course_title: courseTitle,
        title: announcement.title,
        content: announcement.message,
        instructor_name: instructorName,
      }).catch((err) => {
        logger.warn(`[announcement] email failed for user ${s.id}: ${err.message}`);
      });
    }
  } catch (e) {
    logger.warn(`[announcement] fanout failed for course ${courseId}: ${e.message}`);
  }
}

class AnnouncementsController {
  /**
   * Create a course announcement
   * POST /api/courses/:courseId/announcements
   */
  static async createAnnouncement(req, res, next) {
    try {
      const { courseId } = req.params;
      const {
        title, message, priority, scheduled_at,
        is_important, is_pinned,
        attachment_url, attachment_type, attachment_name,
      } = req.body;
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

      // Was this scheduled for the future? If so, defer the
      // notification fan-out — the announcementScheduler cron picks
      // up rows whose scheduled_at has passed and fires then.
      const isFutureSchedule =
        scheduled_at && new Date(scheduled_at).getTime() > Date.now();

      const announcement = await CourseAnnouncement.create({
        course_id: courseId,
        instructor_id: instructorId,
        title,
        message,
        priority: priority || 'normal',
        scheduled_at: scheduled_at || null,
        is_important: !!is_important,
        is_pinned: !!is_pinned,
        attachment_url: attachment_url || null,
        attachment_type: attachment_type || null,
        attachment_name: attachment_name || null,
        // Stamp now if going out immediately; cron sets it on scheduled
        // delivery.
        notifications_sent_at: isFutureSchedule ? null : new Date(),
      });

      // Fire notifications now only when not scheduled for the future.
      if (!isFutureSchedule) {
        const enrollments = await Enrollment.findAll({
          where: { course_id: courseId },
          attributes: ['student_id'],
        });

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

          const instructor = await User.findByPk(instructorId, { attributes: ['full_name'] });
          _fanoutAnnouncementEmail(
            courseId,
            announcement,
            course.title,
            instructor?.full_name
          ).catch(() => {});
        }
      }

      logger.info(
        `Instructor ${instructorId} created announcement for course ${courseId}` +
        (isFutureSchedule ? ` (scheduled for ${scheduled_at})` : '')
      );

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
      const {
        title, message, priority, scheduled_at,
        is_important, is_pinned,
        attachment_url, attachment_type, attachment_name,
      } = req.body;
      const userId = req.user.id;

      const announcement = await CourseAnnouncement.findByPk(announcementId);

      if (!announcement) {
        throw new NotFoundError('Announcement not found');
      }

      if (announcement.instructor_id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Only the announcement creator or admin can update it');
      }

      if (title)    announcement.title = title;
      if (message)  announcement.message = message;
      if (priority) announcement.priority = priority;
      if (scheduled_at !== undefined) announcement.scheduled_at = scheduled_at || null;
      if (is_important !== undefined) announcement.is_important = !!is_important;
      if (is_pinned    !== undefined) announcement.is_pinned    = !!is_pinned;
      if (attachment_url  !== undefined) announcement.attachment_url  = attachment_url  || null;
      if (attachment_type !== undefined) announcement.attachment_type = attachment_type || null;
      if (attachment_name !== undefined) announcement.attachment_name = attachment_name || null;
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

  /**
   * GET /api/announcements/feed
   *
   * Returns the merged announcement feed for the caller:
   *   - Platform broadcasts (AdminAnnouncement) targeted at them:
   *       target=all_users        → everyone
   *       target=all_students     → students
   *       target=all_instructors  → instructors + admins
   *       target=course           → enrolled students of that course
   *   - CourseAnnouncement rows on:
   *       students   → courses they're enrolled in
   *       instructors → courses they teach (lead or via CourseInstructor)
   *
   * Each row is tagged with `source` so the frontend can render the
   * right chrome (Admin badge vs My announcement).
   */
  static async getMyFeed(req, res, next) {
    try {
      const userId = req.user.id;
      const role = req.user.role;
      const isStudent = role === 'student';
      const isInstructor = ['instructor', 'admin', 'super_admin'].includes(role);

      // Helper — filter out scheduled-in-the-future rows. Non-owners
      // shouldn't see drafts; owners (and admins) still get them with
      // a Scheduled badge on the client.
      const futureScheduleFilter = () => ({
        [Op.or]: [
          { scheduled_at: null },
          { scheduled_at: { [Op.lte]: new Date() } },
        ],
      });

      // --- Admin/platform announcements ---------------------------------
      const targetClauses = [{ target: 'all_users' }];
      if (isStudent) targetClauses.push({ target: 'all_students' });
      if (isInstructor) targetClauses.push({ target: 'all_instructors' });

      // Course-targeted admin announcements only reach enrolled students
      // (matches _resolveRecipients in admin/announcementsController).
      let enrolledCourseIds = [];
      if (isStudent) {
        const enrollments = await Enrollment.findAll({
          where: { student_id: userId },
          attributes: ['course_id'],
          raw: true,
        });
        enrolledCourseIds = enrollments.map((e) => e.course_id);
        if (enrolledCourseIds.length > 0) {
          targetClauses.push({ target: 'course', course_id: { [Op.in]: enrolledCourseIds } });
        }
      }

      let adminRows = [];
      try {
        adminRows = await AdminAnnouncement.findAll({
          where: {
            [Op.and]: [
              { [Op.or]: targetClauses },
              futureScheduleFilter(),
            ],
          },
          include: [
            { model: User, as: 'admin', attributes: ['id', 'full_name', 'profile_picture'], required: false },
            { model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'], required: false },
          ],
          // Pinned float to the top; same-pinned-status sorted by date desc.
          order: [['is_pinned', 'DESC'], ['created_at', 'DESC']],
          limit: 50,
        });
      } catch (e) {
        logger.warn(`[announcements.feed] admin lookup failed: ${e.message}`);
      }

      // --- Course announcements (yours or your enrollments) ------------
      let courseIdsForCourseAnnouncements = [];
      if (isStudent) {
        courseIdsForCourseAnnouncements = enrolledCourseIds;
      } else if (isInstructor) {
        // Lead instructor on the course
        const owned = await Course.findAll({
          where: { instructor_id: userId },
          attributes: ['id'],
          raw: true,
        });
        const ownedIds = owned.map((c) => c.id);
        // Co-instructor / TA via the join table
        let coIds = [];
        try {
          const { CourseInstructor } = require('../../models');
          const co = await CourseInstructor.findAll({
            where: { instructor_id: userId },
            attributes: ['course_id'],
            raw: true,
          });
          coIds = co.map((c) => c.course_id);
        } catch { /* table might not exist */ }
        courseIdsForCourseAnnouncements = Array.from(new Set([...ownedIds, ...coIds]));
      }

      let courseRows = [];
      if (courseIdsForCourseAnnouncements.length > 0) {
        const courseWhere = {
          course_id: { [Op.in]: courseIdsForCourseAnnouncements },
        };
        // Students never see future-scheduled rows. Instructors see
        // their own scheduled drafts so they can edit before publish.
        if (!isInstructor) {
          courseWhere[Op.and] = [futureScheduleFilter()];
        } else {
          courseWhere[Op.and] = [{
            [Op.or]: [
              { scheduled_at: null },
              { scheduled_at: { [Op.lte]: new Date() } },
              { instructor_id: userId },
            ],
          }];
        }
        courseRows = await CourseAnnouncement.findAll({
          where: courseWhere,
          include: [
            { model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] },
            { model: User, as: 'instructor', attributes: ['id', 'full_name', 'profile_picture'] },
          ],
          order: [['is_pinned', 'DESC'], ['created_at', 'DESC']],
          limit: 100,
        });
      }

      // --- Reactions ------------------------------------------------------
      // Pull all reactions for the rows we're about to send back, in
      // one go. Then build per-row tally + the caller's own emojis.
      const adminIds = adminRows.map((r) => r.id);
      const courseIds = courseRows.map((r) => r.id);
      let reactionRows = [];
      try {
        const orClauses = [];
        if (adminIds.length)  orClauses.push({ source: 'admin',  announcement_id: { [Op.in]: adminIds  } });
        if (courseIds.length) orClauses.push({ source: 'course', announcement_id: { [Op.in]: courseIds } });
        if (orClauses.length) {
          reactionRows = await AnnouncementReaction.findAll({
            where: { [Op.or]: orClauses },
            attributes: ['source', 'announcement_id', 'user_id', 'emoji'],
            raw: true,
          });
        }
      } catch (e) {
        logger.warn(`[announcements.feed] reactions lookup failed: ${e.message}`);
      }
      const reactionsFor = (source, id) => {
        const tally = {};
        const mine = [];
        for (const r of reactionRows) {
          if (r.source !== source || r.announcement_id !== id) continue;
          tally[r.emoji] = (tally[r.emoji] || 0) + 1;
          if (r.user_id === userId) mine.push(r.emoji);
        }
        return { tally, mine };
      };

      // --- Shape + merge --------------------------------------------------
      const adminMapped = adminRows.map((a) => {
        const plain = a.toJSON();
        const { tally, mine } = reactionsFor('admin', plain.id);
        return {
          ...plain,
          source: 'admin',
          author_name: plain.admin?.full_name || 'TekyPro',
          author_avatar: plain.admin?.profile_picture || null,
          can_edit: false,
          can_delete: false,
          reactions: tally,
          my_reactions: mine,
        };
      });

      const courseMapped = courseRows.map((a) => {
        const plain = a.toJSON();
        const mineRow = plain.instructor_id === userId;
        const { tally, mine } = reactionsFor('course', plain.id);
        return {
          ...plain,
          source: mineRow ? 'mine' : 'course',
          author_name: plain.instructor?.full_name || 'Instructor',
          author_avatar: plain.instructor?.profile_picture || null,
          can_edit: mineRow || ['admin', 'super_admin'].includes(role),
          can_delete: mineRow || ['admin', 'super_admin'].includes(role),
          reactions: tally,
          my_reactions: mine,
        };
      });

      // Global sort: pinned first, then by date desc. Pinned admin and
      // pinned course rows interleave correctly.
      const merged = [...adminMapped, ...courseMapped].sort((a, b) => {
        if (!!b.is_pinned !== !!a.is_pinned) return b.is_pinned ? 1 : -1;
        return new Date(b.created_at) - new Date(a.created_at);
      });

      return ApiResponse.success(res, {
        announcements: merged,
        counts: {
          total: merged.length,
          from_admin: adminMapped.length,
          from_courses: courseMapped.length,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Toggle a reaction on an announcement.
   * POST /api/announcements/:source/:announcementId/reactions
   * Body: { emoji }
   * If the user already reacted with that emoji, the row is removed
   * (toggle). Otherwise it's inserted. Caps to a small whitelist of
   * emojis so the table doesn't fill with arbitrary unicode.
   */
  static async toggleReaction(req, res, next) {
    try {
      const ALLOWED = ['👍', '❤️', '🎉', '👀', '💡'];
      const { source, announcementId } = req.params;
      const { emoji } = req.body;
      const userId = req.user.id;

      if (!['admin', 'course'].includes(source)) {
        throw new BadRequestError('Invalid source');
      }
      if (!emoji || !ALLOWED.includes(emoji)) {
        throw new BadRequestError('Invalid emoji');
      }

      // Verify the announcement exists (cheap sanity check).
      if (source === 'admin') {
        const a = await AdminAnnouncement.findByPk(announcementId, { attributes: ['id'] });
        if (!a) throw new NotFoundError('Announcement not found');
      } else {
        const a = await CourseAnnouncement.findByPk(announcementId, { attributes: ['id'] });
        if (!a) throw new NotFoundError('Announcement not found');
      }

      // 1-emoji-per-user-per-announcement rule:
      //   - clicking the same emoji again removes it (toggle off)
      //   - clicking a different emoji REPLACES the previous one
      //
      // Means a user can react with at most one emoji on any given
      // announcement at a time. Matches the explicit product call.
      const existingSame = await AnnouncementReaction.findOne({
        where: { source, announcement_id: announcementId, user_id: userId, emoji },
      });
      if (existingSame) {
        await existingSame.destroy();
        return ApiResponse.success(res, { action: 'removed', emoji });
      }
      // Different emoji (or first ever) — wipe any other reaction this
      // user has on this row, then add the new one.
      await AnnouncementReaction.destroy({
        where: { source, announcement_id: announcementId, user_id: userId },
      });
      await AnnouncementReaction.create({
        source, announcement_id: announcementId, user_id: userId, emoji,
      });
      return ApiResponse.success(res, { action: 'added', emoji });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Cron task — fires notifications for scheduled announcements whose
   * scheduled_at has passed. Idempotent via notifications_sent_at.
   * Imported and registered by server.js.
   */
  static async runScheduledNotificationsJob() {
    const now = new Date();

    // --- Course-level scheduled announcements -------------------------
    let courseDue = [];
    try {
      courseDue = await CourseAnnouncement.findAll({
        where: {
          scheduled_at: { [Op.ne]: null, [Op.lte]: now },
          notifications_sent_at: null,
        },
        limit: 50,
      });
    } catch (e) {
      logger.warn(`[announcements.cron] course lookup failed: ${e.message}`);
    }
    for (const a of courseDue) {
      try {
        const enrollments = await Enrollment.findAll({
          where: { course_id: a.course_id },
          attributes: ['student_id'],
        });
        if (enrollments.length > 0) {
          await NotificationsController.createBulkNotifications(
            enrollments.map((e) => ({
              user_id: e.student_id,
              type: 'announcement',
              title: `New Announcement: ${a.title}`,
              message: (a.message || '').substring(0, 150) + ((a.message || '').length > 150 ? '...' : ''),
              link: `/courses/${a.course_id}/announcements/${a.id}`,
              priority: a.priority === 'urgent' ? 'high' : 'normal',
            }))
          );
        }
        // Load course + instructor for the email body
        const [course, instructor] = await Promise.all([
          Course.findByPk(a.course_id, { attributes: ['title'] }),
          User.findByPk(a.instructor_id, { attributes: ['full_name'] }),
        ]);
        _fanoutAnnouncementEmail(a.course_id, a, course?.title, instructor?.full_name).catch(() => {});
        a.notifications_sent_at = new Date();
        await a.save();
        logger.info(`[announcements.cron] delivered course announcement ${a.id}`);
      } catch (e) {
        logger.warn(`[announcements.cron] failed to deliver course ${a.id}: ${e.message}`);
      }
    }

    // --- Admin scheduled announcements --------------------------------
    let adminDue = [];
    try {
      adminDue = await AdminAnnouncement.findAll({
        where: {
          scheduled_at: { [Op.ne]: null, [Op.lte]: now },
          notifications_sent_at: null,
        },
        limit: 50,
      });
    } catch (e) {
      logger.warn(`[announcements.cron] admin lookup failed: ${e.message}`);
    }
    // Admin scheduling is fanned out by the admin controller helper, but
    // we mirror enough of it here to avoid circular imports. The target
    // resolution mirrors admin/announcementsController._resolveRecipients.
    for (const a of adminDue) {
      try {
        let recipientIds = [];
        if (a.target === 'all_users') {
          const users = await User.findAll({ where: { is_active: true }, attributes: ['id'], raw: true });
          recipientIds = users.map((u) => u.id);
        } else if (a.target === 'all_students') {
          const users = await User.findAll({ where: { is_active: true, role: 'student' }, attributes: ['id'], raw: true });
          recipientIds = users.map((u) => u.id);
        } else if (a.target === 'all_instructors') {
          const users = await User.findAll({ where: { is_active: true, role: ['instructor', 'admin', 'super_admin'] }, attributes: ['id'], raw: true });
          recipientIds = users.map((u) => u.id);
        } else if (a.target === 'course' && a.course_id) {
          const enrollments = await Enrollment.findAll({
            where: { course_id: a.course_id },
            attributes: ['student_id'],
            raw: true,
          });
          recipientIds = enrollments.map((e) => e.student_id);
        }

        if (recipientIds.length > 0) {
          await NotificationsController.createBulkNotifications(
            recipientIds.map((user_id) => ({
              user_id,
              type: 'announcement',
              title: a.title,
              message: a.message,
              link: a.link || null,
              priority: 'normal',
            }))
          );
        }
        a.notifications_sent_at = new Date();
        await a.save();
        logger.info(`[announcements.cron] delivered admin announcement ${a.id} to ${recipientIds.length}`);
      } catch (e) {
        logger.warn(`[announcements.cron] failed to deliver admin ${a.id}: ${e.message}`);
      }
    }

    return { course: courseDue.length, admin: adminDue.length };
  }
}

module.exports = AnnouncementsController;
