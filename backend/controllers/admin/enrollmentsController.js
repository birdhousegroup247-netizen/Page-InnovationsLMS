const { Enrollment, User, Course, ContentProgress, Payment, ChatRoom, ChatRoomMember } = require('../../models');
const { sequelize } = require('../../config/database');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError, ConflictError } = require('../../utils/errors');
const { Op, fn, col, literal } = require('sequelize');
const emailService = require('../../services/email/emailService');
const enrollmentSvc = require('../../services/enrollment/enrollmentService');
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

  // POST /api/admin/enrollments — manually (comp) enroll a student.
  // Runs the exact same side-effects as a paid enrollment (chat, tests,
  // activation, notification, badge) so a comped student is
  // indistinguishable from a paid one at the platform level. Drops a
  // zero-amount Payment marker so admin Payments still has a record.
  static async createEnrollment(req, res, next) {
    try {
      const { student_id, course_id } = req.body;

      if (!student_id || !course_id) {
        throw new BadRequestError('student_id and course_id are required');
      }

      const student = await User.findByPk(student_id);
      if (!student) throw new NotFoundError('Student not found');

      const course = await Course.findByPk(course_id);
      if (!course) throw new NotFoundError('Course not found');

      const existing = await Enrollment.findOne({ where: { student_id, course_id } });
      if (existing) {
        throw new BadRequestError('Student is already enrolled in this course');
      }

      let compPayment;
      let enrollment;
      await sequelize.transaction(async (transaction) => {
        compPayment = await Payment.create({
          student_id,
          course_id,
          amount: 0,
          intended_amount: 0,
          original_amount: course.price || 0,
          discount_amount: course.price || 0,
          currency: 'USD',
          payment_method: 'comp',
          payment_status: 'completed',
          payment_plan: 'full',
          payment_gateway: 'stripe', // enum requires a value; not actually used
          payment_date: new Date(),
          installment_status: 'not_applicable',
          transaction_id: `COMP-${student_id}-${course_id}-${Date.now()}`,
          metadata: {
            comped_by_admin_id: req.user.id,
            comped_by_admin_email: req.user.email,
            comp_reason: req.body.reason || null,
          },
        }, { transaction });

        const { enrollments } = await enrollmentSvc.runTransactionalSideEffects({
          payment: compPayment,
          studentId: student_id,
          courseIds: [parseInt(course_id)],
          transaction,
        });
        enrollment = enrollments[0];
      });

      // Post-commit side-effects. Comped enrollments skip receipt email
      // (there's no receipt to send) but still fire the enrollment
      // notification, congrats email, referral reward, badge check.
      enrollmentSvc.runPostCommitSideEffects({
        studentId: student_id,
        courseIds: [parseInt(course_id)],
        payment: compPayment,
        gateway: 'comp',
        sendEmails: false,
      }).catch((e) => logger.warn(`comp post-commit failed (non-critical): ${e.message}`));

      // Legacy enrollment-confirmation email — kept because it has
      // course-specific wording, and it's the same email students see
      // when they self-enroll in a free course.
      emailService.sendEnrollmentConfirmation(student.email, student.full_name, course).catch((e) =>
        logger.warn(`Admin enroll email failed for ${student.email}: ${e.message}`)
      );

      logger.info(`Admin ${req.user.email} comped student ${student_id} into course ${course_id} (payment ${compPayment.id})`);
      await ActivityController.logFromRequest(req, 'enrollment_create', 'enrollment', enrollment.id, {
        student_name: student.full_name, student_email: student.email,
        course_title: course.title, course_id,
        comp_payment_id: compPayment.id,
      }).catch(() => {});

      return ApiResponse.created(res, { enrollment, payment_id: compPayment.id }, 'Student enrolled successfully');
    } catch (error) {
      next(error);
    }
  }

  // POST /api/admin/enrollments/bulk — enroll many students into ONE course
  // from a list of emails (CSV import). Each student is comped exactly like
  // createEnrollment (same side-effects), one transaction per student so a
  // single bad row never rolls back the whole batch. Returns a per-outcome
  // summary the UI shows back to the admin.
  static async bulkEnroll(req, res, next) {
    try {
      const { course_id } = req.body;
      let { emails } = req.body;

      if (!course_id || !Array.isArray(emails) || emails.length === 0) {
        throw new BadRequestError('course_id and a non-empty emails array are required');
      }

      // Normalise + de-dupe
      emails = [...new Set(emails.map((e) => String(e || '').trim().toLowerCase()).filter(Boolean))];
      if (emails.length > 500) {
        throw new BadRequestError('Maximum 500 students per import');
      }

      const course = await Course.findByPk(course_id);
      if (!course) throw new NotFoundError('Course not found');

      const results = { enrolled: 0, already_enrolled: 0, not_found: [], errors: [] };

      for (const email of emails) {
        try {
          // case-insensitive exact match that works on both MySQL & Postgres
          const student = await User.findOne({ where: sequelize.where(fn('lower', col('email')), email) });
          if (!student) {
            results.not_found.push(email);
            continue;
          }

          const existing = await Enrollment.findOne({ where: { student_id: student.id, course_id } });
          if (existing) {
            results.already_enrolled += 1;
            continue;
          }

          let compPayment;
          await sequelize.transaction(async (transaction) => {
            compPayment = await Payment.create({
              student_id: student.id,
              course_id,
              amount: 0,
              intended_amount: 0,
              original_amount: course.price || 0,
              discount_amount: course.price || 0,
              currency: 'USD',
              payment_method: 'comp',
              payment_status: 'completed',
              payment_plan: 'full',
              payment_gateway: 'stripe', // enum requires a value; not actually used
              payment_date: new Date(),
              installment_status: 'not_applicable',
              transaction_id: `COMP-${student.id}-${course_id}-${Date.now()}`,
              metadata: {
                comped_by_admin_id: req.user.id,
                comped_by_admin_email: req.user.email,
                comp_reason: req.body.reason || 'bulk CSV enroll',
                bulk_import: true,
              },
            }, { transaction });

            await enrollmentSvc.runTransactionalSideEffects({
              payment: compPayment,
              studentId: student.id,
              courseIds: [parseInt(course_id)],
              transaction,
            });
          });

          // Fire-and-forget post-commit (notification/badge/referral); skip
          // per-student emails to avoid blasting a whole cohort on import.
          enrollmentSvc.runPostCommitSideEffects({
            studentId: student.id,
            courseIds: [parseInt(course_id)],
            payment: compPayment,
            gateway: 'comp',
            sendEmails: false,
          }).catch((e) => logger.warn(`bulk enroll post-commit failed (non-critical): ${e.message}`));

          results.enrolled += 1;
        } catch (rowErr) {
          results.errors.push({ email, message: rowErr.message });
        }
      }

      logger.info(
        `Admin ${req.user.email} bulk-enrolled ${results.enrolled} student(s) into course ${course_id} ` +
        `(${results.already_enrolled} already, ${results.not_found.length} not found, ${results.errors.length} errors)`
      );
      await ActivityController.logFromRequest(req, 'enrollment_bulk_create', 'course', course_id, {
        course_title: course.title,
        enrolled: results.enrolled,
        already_enrolled: results.already_enrolled,
        not_found: results.not_found.length,
      }).catch(() => {});

      return ApiResponse.success(res, results, `Enrolled ${results.enrolled} student(s)`);
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/admin/enrollments/:id — revoke access.
  //
  // Removes enrollment + chat membership. If there's a Payment row for
  // this enrollment, flag it as revoked in metadata (do NOT auto-refund
  // — refunds go through the Payments page so the admin picks the
  // provider action explicitly).
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

      await sequelize.transaction(async (transaction) => {
        // Remove chat room membership
        const chatRoom = await ChatRoom.findOne({
          where: { course_id: courseId },
          transaction,
        });
        if (chatRoom) {
          await ChatRoomMember.destroy({
            where: { room_id: chatRoom.id, user_id: studentId },
            transaction,
          });
        }

        await enrollment.destroy({ transaction });

        // Decrement enrollment_count (guard against going below 0)
        await Course.update(
          { enrollment_count: literal('GREATEST(enrollment_count - 1, 0)') },
          { where: { id: courseId }, transaction }
        );

        // Flag the Payment row(s) tied to this enrollment/course/student.
        // Comp payments get comped_revoked; paid rows get revoked_by_admin
        // so the accounting picture still tells the truth. Actual refund
        // (money movement) stays on the Payments page flow.
        const relatedPayments = await Payment.findAll({
          where: {
            student_id: studentId,
            course_id: courseId,
            payment_status: 'completed',
          },
          transaction,
        });
        for (const p of relatedPayments) {
          const meta = p.metadata || {};
          const flag = p.payment_method === 'comp' ? 'comped_revoked' : 'access_revoked';
          await p.update({
            metadata: {
              ...meta,
              [flag]: true,
              revoked_by_admin_id: req.user.id,
              revoked_at: new Date().toISOString(),
              revoke_reason: req.body?.reason || null,
            },
          }, { transaction });
        }
      });

      // Discord: remove course access (non-blocking)
      try {
        const discordCtrl = require('../discord/discordController');
        discordCtrl.onUnenroll(studentId, courseId).catch(() => {});
      } catch (discordErr) {
        logger.warn(`Discord unenroll hook skipped: ${discordErr.message}`);
      }

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
