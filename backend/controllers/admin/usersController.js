const { User, Course, Enrollment, Certificate, Payment, EmailVerification, PasswordReset } = require('../../models');
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

      // Get user statistics
      const enrollments = await Enrollment.count({ where: { student_id: userId } });
      const certificates = await Certificate.count({ where: { student_id: userId } });
      const coursesCreated = await Course.count({ where: { instructor_id: userId } });

      return ApiResponse.success(res, {
        user,
        stats: {
          enrollments: user.role === 'student' ? enrollments : null,
          certificates: user.role === 'student' ? certificates : null,
          coursesCreated: ['instructor', 'admin', 'super_admin'].includes(user.role) ? coursesCreated : null,
        },
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
      const students = await User.count({ where: { role: 'student' } });
      const instructors = await User.count({ where: { role: 'instructor' } });
      const admins = await User.count({ where: { role: 'admin' } });
      const superAdmins = await User.count({ where: { role: 'super_admin' } });

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
}

module.exports = UsersController;
