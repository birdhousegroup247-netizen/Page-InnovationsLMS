const { Enrollment, User, Course, ContentProgress } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError, ConflictError } = require('../../utils/errors');
const { Op, fn, col, literal } = require('sequelize');
const emailService = require('../../services/email/emailService');
const ActivityController = require('../activity/activityController');

class AdminEnrollmentsController {
  // GET /api/admin/enrollments — list all enrollments with filters
  static async getAllEnrollments(req, res, next) {
    try {
      const {
        course_id,
        student_id,
        completed,
        search,
        page = 1,
        limit = 20,
      } = req.query;

      const where = {};
      if (course_id) where.course_id = course_id;
      if (student_id) where.student_id = student_id;
      if (completed === 'true') where.completed_at = { [Op.ne]: null };
      if (completed === 'false') where.completed_at = null;

      const studentWhere = {};
      if (search) {
        studentWhere[Op.or] = [
          { full_name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows } = await Enrollment.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email', 'profile_picture'],
            where: Object.keys(studentWhere).length ? studentWhere : undefined,
          },
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title', 'thumbnail', 'price'],
          },
        ],
        limit: parseInt(limit),
        offset,
        order: [['enrollment_date', 'DESC']],
      });

      return ApiResponse.success(res, {
        enrollments: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / parseInt(limit)),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/admin/enrollments/stats
  static async getEnrollmentStats(req, res, next) {
    try {
      const [total, completed, notStarted] = await Promise.all([
        Enrollment.count(),
        Enrollment.count({ where: { completed_at: { [Op.ne]: null } } }),
        Enrollment.count({ where: { progress_percentage: 0 } }),
      ]);

      const inProgress = total - completed - notStarted;

      return ApiResponse.success(res, {
        total,
        completed,
        in_progress: inProgress < 0 ? 0 : inProgress,
        not_started: notStarted,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/enrollments — manually enroll a student
  static async createEnrollment(req, res, next) {
    try {
      const { student_id, course_id } = req.body;

      if (!student_id || !course_id) {
        throw new BadRequestError('student_id and course_id are required');
      }

      // Verify student exists
      const student = await User.findByPk(student_id);
      if (!student) throw new NotFoundError('Student not found');

      // Verify course exists
      const course = await Course.findByPk(course_id);
      if (!course) throw new NotFoundError('Course not found');

      // Check if already enrolled
      const existing = await Enrollment.findOne({ where: { student_id, course_id } });
      if (existing) {
        throw new BadRequestError('Student is already enrolled in this course');
      }

      const enrollment = await Enrollment.create({
        student_id,
        course_id,
        enrollment_date: new Date(),
        progress_percentage: 0,
      });

      // Bump enrollment_count on course
      await course.increment('enrollment_count');

      // Send enrollment confirmation email (fire-and-forget)
      emailService.sendEnrollmentConfirmation(student.email, student.full_name, course).catch((e) =>
        logger.warn(`Admin enroll email failed for ${student.email}: ${e.message}`)
      );

      // Badge check for enrollment milestone
      const BadgesController = require('../badges/badgesController');
      BadgesController.checkAndAward(student_id, 'enrollment_count').catch(() => {});

      logger.info(`Admin ${req.user.email} manually enrolled student ${student_id} in course ${course_id}`);
      await ActivityController.logFromRequest(req, 'enrollment_create', 'enrollment', enrollment.id, {
        student_name: student.full_name, student_email: student.email,
        course_title: course.title, course_id,
      }).catch(() => {});

      return ApiResponse.created(res, { enrollment }, 'Student enrolled successfully');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/admin/enrollments/:id — remove enrollment
  static async deleteEnrollment(req, res, next) {
    try {
      const { id } = req.params;

      const enrollment = await Enrollment.findByPk(id, {
        include: [
          { model: Course, as: 'course', attributes: ['id', 'enrollment_count'] },
        ],
      });

      if (!enrollment) throw new NotFoundError('Enrollment not found');

      const courseId = enrollment.course_id;
      const studentId = enrollment.student_id;

      await enrollment.destroy();

      // Discord: remove course access (non-blocking)
      try {
        const discordCtrl = require('../discord/discordController');
        discordCtrl.onUnenroll(studentId, courseId).catch(() => {});
      } catch (discordErr) {
        logger.warn(`Discord unenroll hook skipped: ${discordErr.message}`);
      }

      // Decrement enrollment_count (guard against going below 0)
      await Course.update(
        { enrollment_count: literal('GREATEST(enrollment_count - 1, 0)') },
        { where: { id: courseId } }
      );

      logger.info(`Admin ${req.user.email} removed enrollment ${id}`);
      await ActivityController.logFromRequest(req, 'enrollment_delete', 'enrollment', id, {
        student_id: studentId, course_id: courseId,
      }).catch(() => {});

      return ApiResponse.success(res, null, 'Enrollment removed successfully');
    } catch (error) {
      next(error);
    }
  }

  // PATCH /api/admin/enrollments/:id/progress — manually set progress
  static async updateProgress(req, res, next) {
    try {
      const { id } = req.params;
      const { progress_percentage } = req.body;

      if (progress_percentage === undefined || progress_percentage < 0 || progress_percentage > 100) {
        throw new BadRequestError('progress_percentage must be between 0 and 100');
      }

      const enrollment = await Enrollment.findByPk(id);
      if (!enrollment) throw new NotFoundError('Enrollment not found');

      const update = { progress_percentage };
      if (parseFloat(progress_percentage) >= 100) {
        update.completed_at = update.completed_at || new Date();
      }

      await enrollment.update(update);

      return ApiResponse.success(res, { enrollment }, 'Progress updated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminEnrollmentsController;
