const { User, Course, Enrollment, Certificate, Payment, EmailVerification, PasswordReset, Assignment, AssignmentSubmission, LiveSession, LiveSessionAttendance } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const { getPaginationParams, getPaginationMeta } = require('../../utils/pagination');
const { Op } = require('sequelize');
const bcrypt = require('bcrypt');
const emailService = require('../../services/email/emailService');
const ActivityController = require('../activity/activityController');

class UsersController {
  // Get all users with filters
  static async getAllUsers(req, res, next) {
    try {
      const { role, search } = req.query;

      // Get safe pagination parameters with maximum limit enforcement
      const { page, limit, offset } = getPaginationParams(req.query);

      const where = {};

      if (role && role !== 'all') {
        where.role = role;
      }

      if (search) {
        where[Op.or] = [
          { full_name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const { count, rows } = await User.findAndCountAll({
        where,
        attributes: { exclude: ['password'] },
        limit,
        offset,
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        users: rows,
        pagination: getPaginationMeta(page, limit, count),
      });
    } catch (error) {
      next(error);
    }
  }

  // Get user by ID with details
  static async getUserById(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password'] },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // High-level counts (cheap).
      const [enrollmentsCount, certificatesCount, coursesCreatedCount, paymentsCount] = await Promise.all([
        Enrollment.count({ where: { student_id: userId } }),
        Certificate.count({ where: { student_id: userId } }),
        Course.count({ where: { instructor_id: userId } }),
        Payment.count({ where: { user_id: userId } }).catch(() => 0),
      ]);

      // Lifetime spend across paid payments (best-effort — if Payment
      // model has 'status' use it, otherwise sum all).
      const totalSpent = await Payment.sum('amount', {
        where: { user_id: userId, status: 'paid' },
      }).catch(async () => Payment.sum('amount', { where: { user_id: userId } }).catch(() => 0));

      // Enrollment list — cap at 20 most recent, with course title.
      const recentEnrollments = user.role === 'student'
        ? await Enrollment.findAll({
            where: { student_id: userId },
            include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
            order: [['enrollment_date', 'DESC']],
            limit: 20,
          }).catch(() => [])
        : [];

      // Recent payments — cap at 10 most recent.
      const recentPayments = await Payment.findAll({
        where: { user_id: userId },
        attributes: ['id', 'amount', 'currency', 'status', 'created_at', 'provider', 'course_id'],
        include: [{ model: Course, as: 'course', attributes: ['id', 'title'], required: false }],
        order: [['created_at', 'DESC']],
        limit: 10,
      }).catch(() => []);

      return ApiResponse.success(res, {
        user,
        stats: {
          // Older callers read these top-level keys — keep them.
          enrollments: user.role === 'student' ? enrollmentsCount : null,
          certificates: user.role === 'student' ? certificatesCount : null,
          coursesCreated: ['instructor', 'admin', 'super_admin'].includes(user.role) ? coursesCreatedCount : null,
          // New richer fields for the AdminUserDetail page.
          payments_count: paymentsCount,
          total_spent: Number(totalSpent || 0),
        },
        recent_enrollments: recentEnrollments,
        recent_payments: recentPayments,
      });
    } catch (error) {
      next(error);
    }
  }

  // Create new user
  static async createUser(req, res, next) {
    try {
      const { full_name, email, password, role, phone } = req.body;

      // Check if email exists
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        throw new BadRequestError('Email already exists');
      }

      const user = await User.createUser({
        full_name,
        email,
        password,
        role: role || 'student',
        phone,
        is_active: true,
        email_verified: true, // Admin created users are auto-verified
      });

      logger.info(`User created by admin: ${email} with role ${role}`);
      await ActivityController.logFromRequest(req, 'admin_user_create', 'user', user.id, { email, role: role || 'student' }).catch(() => {});

      // Remove password from response
      const userResponse = user.toJSON();
      delete userResponse.password;

      return ApiResponse.created(res, { user: userResponse }, 'User created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Update user
  static async updateUser(req, res, next) {
    try {
      const { userId } = req.params;
      const updates = req.body;

      const user = await User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // If updating password, hash it into the correct field
      if (updates.password) {
        updates.password_hash = await bcrypt.hash(updates.password, 12);
        delete updates.password;
      }

      // Strip fields that must never be set via this endpoint
      const BLOCKED = ['id', 'created_at', 'password_hash', 'google_id', 'referral_code', 'referral_credits'];
      BLOCKED.forEach((f) => delete updates[f]);

      await user.update(updates);

      logger.info(`User updated by admin: ${user.email}`);
      await ActivityController.logFromRequest(req, 'admin_user_update', 'user', user.id, { email: user.email, changes: Object.keys(updates) }).catch(() => {});

      const userResponse = user.toJSON();
      delete userResponse.password;

      return ApiResponse.success(res, { user: userResponse }, 'User updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete/Deactivate user
  static async deleteUser(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Prevent self-deletion
      if (user.id === req.user.id) {
        throw new BadRequestError('Cannot delete your own account');
      }

      // Soft delete - deactivate instead of deleting
      await user.update({ is_active: false });

      logger.info(`User deactivated by admin: ${user.email}`);
      await ActivityController.logFromRequest(req, 'admin_user_deactivate', 'user', user.id, { email: user.email }).catch(() => {});

      return ApiResponse.success(res, null, 'User deactivated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Activate user
  static async activateUser(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      await user.update({ is_active: true });

      logger.info(`User activated by admin: ${user.email}`);

      return ApiResponse.success(res, null, 'User activated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * PATCH /api/admin/users/:userId/registration-status
   * Override a user's registration_status (unlock suspended, promote preview → active, etc.)
   * Optionally clears installment overdue lock on their payment record.
   */
  static async setRegistrationStatus(req, res, next) {
    try {
      const { userId } = req.params;
      const { registration_status, clear_installment_lock, note } = req.body;

      const VALID = ['preview', 'active', 'suspended'];
      if (!VALID.includes(registration_status)) {
        throw new BadRequestError(`registration_status must be one of: ${VALID.join(', ')}`);
      }

      const user = await User.findByPk(userId);
      if (!user) throw new NotFoundError('User not found');

      await user.update({ registration_status });

      // Optionally clear overdue installment lock so banner/modal disappear
      if (clear_installment_lock) {
        const { Op } = require('sequelize');
        await Payment.update(
          { installment_status: 'pending' },
          {
            where: {
              student_id: userId,
              payment_plan: 'installment',
              installment_status: 'overdue',
            },
          }
        );
      }

      logger.info(
        `[Admin] registration_status of user ${userId} set to '${registration_status}' by admin ${req.user.id}${note ? ` — ${note}` : ''}`
      );
      await ActivityController.logFromRequest(req, 'admin_user_access_change', 'user', user.id, {
        email: user.email, registration_status, note: note || null,
      }).catch(() => {});

      return ApiResponse.success(res, { user: { id: user.id, email: user.email, registration_status } },
        `User access updated to '${registration_status}'`);
    } catch (error) {
      next(error);
    }
  }

  // Get user roles distribution
  static async getRolesDistribution(req, res, next) {
    try {
      // Dual-role: approved instructors keep role='student' (everyone signs
      // up as a student). Count by EFFECTIVE role so the tallies match the
      // badges in the Users list — an approved instructor counts as an
      // instructor, not a student.
      const admins = await User.count({ where: { role: 'admin' } });
      const superAdmins = await User.count({ where: { role: 'super_admin' } });
      const instructors = await User.count({
        where: {
          [Op.and]: [
            { [Op.or]: [{ role: 'instructor' }, { instructor_status: 'approved' }] },
            { role: { [Op.notIn]: ['admin', 'super_admin'] } },
          ],
        },
      });
      const students = await User.count({
        where: { role: 'student', instructor_status: { [Op.ne]: 'approved' } },
      });

      return ApiResponse.success(res, {
        roles: {
          student: students,
          instructor: instructors,
          admin: admins,
          super_admin: superAdmins,
          total: students + instructors + admins + superAdmins,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin trigger — re-send the verification email for a user.
   * POST /api/admin/users/:userId/send-verification-email
   *
   * Issues a fresh EmailVerification token + 6-digit code and sends the
   * branded verification email. No-ops cleanly if the user is already
   * verified.
   */
  static async sendVerificationEmail(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await User.findByPk(userId);
      if (!user) throw new NotFoundError('User not found');
      if (user.email_verified) {
        return ApiResponse.success(res, { already_verified: true }, 'User is already verified.');
      }
      const { token, code } = await EmailVerification.createForUser(user.id);
      try {
        await emailService.sendVerificationEmail(user.email, user.full_name, token, code);
        logger.info(`Admin ${req.user.email} resent verification email to ${user.email}`);
      } catch (e) {
        logger.error(`Verification email send failed for ${user.email}: ${e.message}`);
        throw new BadRequestError('Could not send the verification email. Please check the email service configuration.');
      }
      return ApiResponse.success(res, null, 'Verification email sent.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Admin trigger — send a password reset link to the user.
   * POST /api/admin/users/:userId/send-password-reset
   */
  static async sendPasswordReset(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await User.findByPk(userId);
      if (!user) throw new NotFoundError('User not found');
      const { token } = await PasswordReset.createResetToken(user.id);
      try {
        await emailService.sendPasswordResetEmail(user.email, user.full_name, token);
        logger.info(`Admin ${req.user.email} sent password reset to ${user.email}`);
      } catch (e) {
        logger.error(`Password reset email send failed for ${user.email}: ${e.message}`);
        throw new BadRequestError('Could not send the password reset email. Please check the email service configuration.');
      }
      return ApiResponse.success(res, null, 'Password reset email sent.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:userId/assignment-performance
   *
   * Rolls up everything the admin needs to see how a single student
   * is doing on assignments across every course they're enrolled in:
   *  - totals (assigned / submitted / graded / missing / late)
   *  - average percentage across graded submissions
   *  - per-course breakdown
   *  - recent submissions (latest 20) with score + course context
   *
   * "Missing" = assignments where the student is enrolled in the course
   * but no submission row exists.
   */
  static async getAssignmentPerformance(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await User.findByPk(userId, { attributes: ['id', 'full_name', 'email'] });
      if (!user) throw new NotFoundError('User not found');

      // Every course this student is enrolled in.
      const enrollments = await Enrollment.findAll({
        where: { student_id: userId },
        attributes: ['course_id'],
        raw: true,
      });
      const courseIds = enrollments.map((e) => e.course_id);

      if (courseIds.length === 0) {
        return ApiResponse.success(res, {
          user,
          totals: { assigned: 0, submitted: 0, graded: 0, missing: 0, late: 0, auto_graded: 0 },
          average_percentage: null,
          by_course: [],
          recent: [],
        });
      }

      // All assignments in those courses, plus the student's submission
      // (left-join so missing rows still show up).
      const assignments = await Assignment.findAll({
        where: { course_id: { [Op.in]: courseIds } },
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title'] },
          {
            model: AssignmentSubmission,
            as: 'submissions',
            where: { student_id: userId },
            required: false,
          },
        ],
        order: [['created_at', 'DESC']],
      });

      // Roll-ups.
      let submittedCount = 0;
      let gradedCount   = 0;
      let missingCount  = 0;
      let lateCount     = 0;
      let autoGradedCount = 0;

      // Running average across graded submissions only — every assignment
      // is graded out of its own max_score, so we average the % per row.
      let pctSum = 0;
      let pctCount = 0;

      // Per-course breakdown {courseId, title, assigned, graded, avg_pct}.
      const byCourse = new Map();
      const recent = [];

      for (const a of assignments) {
        const sub = a.submissions?.[0] || null;
        const courseKey = a.course_id;
        if (!byCourse.has(courseKey)) {
          byCourse.set(courseKey, {
            course_id: a.course_id,
            course_title: a.course?.title || 'Unknown course',
            assigned: 0,
            graded: 0,
            pct_sum: 0,
          });
        }
        const cb = byCourse.get(courseKey);
        cb.assigned += 1;

        if (!sub) {
          missingCount += 1;
        } else {
          submittedCount += 1;
          if (sub.status === 'late') lateCount += 1;
          if (sub.status === 'graded' && sub.score !== null && sub.score !== undefined) {
            gradedCount += 1;
            if (sub.auto_graded) autoGradedCount += 1;
            const pct = a.max_score > 0 ? (Number(sub.score) / Number(a.max_score)) * 100 : 0;
            pctSum += pct;
            pctCount += 1;
            cb.graded += 1;
            cb.pct_sum += pct;
          }
          recent.push({
            submission_id: sub.id,
            assignment_id: a.id,
            assignment_title: a.title,
            course_id: a.course_id,
            course_title: a.course?.title || null,
            score: sub.score,
            max_score: a.max_score,
            status: sub.status,
            auto_graded: !!sub.auto_graded,
            submitted_at: sub.submitted_at,
            graded_at: sub.graded_at,
          });
        }
      }

      const by_course = Array.from(byCourse.values()).map((c) => ({
        course_id: c.course_id,
        course_title: c.course_title,
        assigned: c.assigned,
        graded: c.graded,
        average_percentage: c.graded > 0 ? Number((c.pct_sum / c.graded).toFixed(1)) : null,
      }));

      // Recent — newest 20 by submitted_at desc.
      recent.sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at));

      return ApiResponse.success(res, {
        user,
        totals: {
          assigned: assignments.length,
          submitted: submittedCount,
          graded: gradedCount,
          missing: missingCount,
          late: lateCount,
          auto_graded: autoGradedCount,
        },
        average_percentage: pctCount > 0 ? Number((pctSum / pctCount).toFixed(1)) : null,
        by_course,
        recent: recent.slice(0, 20),
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/users/:userId/attendance
   *
   * Per-student attendance rollup. Mirrors the assignment-performance
   * endpoint's shape so the admin UI can render both sections with
   * the same component pattern.
   *
   *   totals: { present, late, absent, excused, total_sessions }
   *   attendance_rate: % present-or-late across sessions the student
   *                    has a row for (excluding sessions still
   *                    in-flight)
   *   by_course: per-course breakdown
   *   recent:    last 20 sessions with status
   */
  static async getAttendance(req, res, next) {
    try {
      const { userId } = req.params;
      const user = await User.findByPk(userId, { attributes: ['id', 'full_name', 'email'] });
      if (!user) throw new NotFoundError('User not found');

      const enrollments = await Enrollment.findAll({
        where: { student_id: userId },
        attributes: ['course_id'],
        raw: true,
      });
      const courseIds = enrollments.map((e) => e.course_id);

      if (courseIds.length === 0) {
        return ApiResponse.success(res, {
          user,
          totals: { present: 0, late: 0, absent: 0, excused: 0, total_sessions: 0 },
          attendance_rate: null,
          by_course: [],
          recent: [],
        });
      }

      // Past + currently-running sessions for those courses. We
      // include 'live' so the admin can see a student's status during
      // an active class, but exclude 'scheduled' (nothing's happened
      // yet, so missing rows don't count against the student).
      const sessions = await LiveSession.findAll({
        where: {
          course_id: { [Op.in]: courseIds },
          status: { [Op.in]: ['live', 'ended'] },
        },
        include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }],
        order: [['scheduled_at', 'DESC']],
      });

      const records = await LiveSessionAttendance.findAll({
        where: { student_id: userId, live_session_id: { [Op.in]: sessions.map((s) => s.id) } },
        raw: true,
      });
      const recByS = new Map(records.map((r) => [r.live_session_id, r]));

      const totals = { present: 0, late: 0, absent: 0, excused: 0, total_sessions: sessions.length };
      const byCourse = new Map();
      const recent = [];

      for (const s of sessions) {
        const r = recByS.get(s.id);
        const courseKey = s.course_id;
        if (!byCourse.has(courseKey)) {
          byCourse.set(courseKey, {
            course_id: s.course_id,
            course_title: s.course?.title || 'Unknown course',
            sessions: 0,
            attended: 0,
          });
        }
        const cb = byCourse.get(courseKey);
        cb.sessions += 1;

        if (r) {
          totals[r.status] = (totals[r.status] || 0) + 1;
          if (r.status === 'present' || r.status === 'late') cb.attended += 1;
        }
        // No row + ended session: count toward absent in the rollup
        // (the auto-mark cron should have filled this, but the rollup
        // shouldn't depend on that having run).
        if (!r && s.status === 'ended') {
          totals.absent += 1;
        }

        recent.push({
          session_id: s.id,
          title: s.title,
          scheduled_at: s.scheduled_at,
          course_id: s.course_id,
          course_title: s.course?.title || null,
          status: r ? r.status : (s.status === 'ended' ? 'absent' : null),
          source: r ? r.source : null,
        });
      }

      // Attendance rate over sessions that have any final outcome
      // (present + late counted as attended; absent counted against).
      const denominator = totals.present + totals.late + totals.absent;
      const attendance_rate = denominator > 0
        ? Number(((totals.present + totals.late) / denominator * 100).toFixed(1))
        : null;

      const by_course = Array.from(byCourse.values()).map((c) => ({
        course_id: c.course_id,
        course_title: c.course_title,
        sessions: c.sessions,
        attended: c.attended,
        attendance_rate: c.sessions > 0 ? Number((c.attended / c.sessions * 100).toFixed(1)) : null,
      }));

      return ApiResponse.success(res, {
        user,
        totals,
        attendance_rate,
        by_course,
        recent: recent.slice(0, 20),
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UsersController;
