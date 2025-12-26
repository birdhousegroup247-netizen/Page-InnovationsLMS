const { User, InstructorApplication } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../utils/errors');
const ActivityController = require('../activity/activityController');

/**
 * Instructor Application Controller (Admin Only)
 * Manages instructor verification and approval
 */

class InstructorApplicationController {
  /**
   * Get all pending instructor applications
   * GET /api/admin/instructor-applications/pending
   */
  static async getPendingApplications(req, res, next) {
    try {
      // Find all pending instructor applications
      const applications = await InstructorApplication.findAll({
        where: { status: 'pending' },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'phone', 'profile_picture', 'created_at'],
          },
        ],
        order: [['applied_at', 'ASC']], // Oldest first for FIFO processing
      });

      logger.info(`Admin ${req.user.email} fetched ${applications.length} pending instructor applications`);

      return ApiResponse.success(res, {
        applications,
        count: applications.length,
      }, 'Pending instructor applications retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all instructor applications (all statuses)
   * GET /api/admin/instructor-applications
   */
  static async getAllApplications(req, res, next) {
    try {
      const { status } = req.query;

      const where = {};
      if (status && ['pending', 'under_review', 'approved', 'rejected', 'revoked'].includes(status)) {
        where.status = status;
      }

      const applications = await InstructorApplication.findAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'phone', 'profile_picture', 'role', 'created_at'],
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'full_name', 'email'],
            required: false,
          },
        ],
        order: [['created_at', 'DESC']],
      });

      logger.info(`Admin ${req.user.email} fetched instructor applications (filter: ${status || 'all'})`);

      return ApiResponse.success(res, {
        applications,
        count: applications.length,
      }, 'Instructor applications retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Approve instructor application
   * PUT /api/admin/instructor-applications/:id/approve
   */
  static async approveApplication(req, res, next) {
    try {
      const { id } = req.params;

      // Find application
      const application = await InstructorApplication.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'role', 'instructor_status'],
          },
        ],
      });

      if (!application) {
        throw new NotFoundError('Instructor application not found');
      }

      // Check if application is pending
      if (application.status !== 'pending') {
        throw new BadRequestError(`Cannot approve application with status: ${application.status}`);
      }

      // Approve application using model method
      await application.approve(req.user.id);

      // Update user role and instructor_status for backward compatibility
      const user = application.user;
      user.role = 'instructor';
      user.instructor_status = 'approved';
      await user.save();

      logger.info(`Admin ${req.user.email} approved instructor application for user ${user.email}`);

      // Log activity
      await ActivityController.logFromRequest(
        req,
        'instructor_application_approve',
        'user',
        user.id,
        {
          approved_user_name: user.full_name,
          approved_user_email: user.email,
          application_id: application.id,
        }
      );

      // Send approval email to user
      try {
        const emailService = require('../../services/email/emailService');
        await emailService.sendInstructorApprovalEmail(user.email, user.full_name);
        logger.info(`Instructor approval email sent to ${user.email}`);
      } catch (emailError) {
        logger.error(`Failed to send instructor approval email to ${user.email}:`, emailError);
        // Don't fail the whole operation if email fails
      }

      return ApiResponse.success(res, {
        application,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          instructor_status: user.instructor_status,
        },
      }, 'Instructor application approved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reject instructor application
   * PUT /api/admin/instructor-applications/:id/reject
   */
  static async rejectApplication(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body; // Optional rejection reason

      // Find application
      const application = await InstructorApplication.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'instructor_status'],
          },
        ],
      });

      if (!application) {
        throw new NotFoundError('Instructor application not found');
      }

      // Check if application is pending
      if (application.status !== 'pending') {
        throw new BadRequestError(`Cannot reject application with status: ${application.status}`);
      }

      // Reject application using model method
      await application.reject(req.user.id, reason);

      // Update user instructor_status for backward compatibility
      const user = application.user;
      user.instructor_status = 'rejected';
      await user.save();

      logger.info(`Admin ${req.user.email} rejected instructor application for user ${user.email}${reason ? ` (reason: ${reason})` : ''}`);

      // Log activity
      await ActivityController.logFromRequest(
        req,
        'instructor_application_reject',
        'user',
        user.id,
        {
          rejected_user_name: user.full_name,
          rejected_user_email: user.email,
          reason,
          application_id: application.id,
        }
      );

      // Send rejection email to user with reason
      try {
        const emailService = require('../../services/email/emailService');
        await emailService.sendInstructorRejectionEmail(user.email, user.full_name, reason);
        logger.info(`Instructor rejection email sent to ${user.email}`);
      } catch (emailError) {
        logger.error(`Failed to send instructor rejection email to ${user.email}:`, emailError);
        // Don't fail the whole operation if email fails
      }

      return ApiResponse.success(res, {
        application,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          instructor_status: user.instructor_status,
        },
      }, 'Instructor application rejected');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoke instructor status (demote to student)
   * PUT /api/admin/instructor-applications/:id/revoke
   */
  static async revokeInstructor(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      // Find application (most recent for this user)
      const application = await InstructorApplication.findByPk(id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'role', 'instructor_status'],
          },
        ],
      });

      if (!application) {
        throw new NotFoundError('Instructor application not found');
      }

      const user = application.user;

      // Check if user is actually an instructor
      if (user.role !== 'instructor') {
        throw new BadRequestError('User is not an instructor');
      }

      // Revoke application using model method
      await application.revoke(req.user.id, reason);

      // Revoke instructor status
      user.role = 'student';
      user.instructor_status = 'revoked';
      await user.save();

      logger.warn(`Admin ${req.user.email} revoked instructor status for user ${user.email}${reason ? ` (reason: ${reason})` : ''}`);

      // Send notification email to user
      try {
        const emailService = require('../../services/email/emailService');
        await emailService.sendInstructorRevocationEmail(user.email, user.full_name, reason);
        logger.info(`Instructor revocation email sent to ${user.email}`);
      } catch (emailError) {
        logger.error(`Failed to send instructor revocation email to ${user.email}:`, emailError);
        // Don't fail the whole operation if email fails
      }

      return ApiResponse.success(res, {
        application,
        user: {
          id: user.id,
          full_name: user.full_name,
          email: user.email,
          role: user.role,
          instructor_status: user.instructor_status,
        },
      }, 'Instructor status revoked successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get instructor application statistics
   * GET /api/admin/instructor-applications/stats
   */
  static async getStats(req, res, next) {
    try {
      const stats = await InstructorApplication.findAll({
        attributes: [
          'status',
          [InstructorApplication.sequelize.fn('COUNT', InstructorApplication.sequelize.col('id')), 'count'],
        ],
        group: ['status'],
      });

      const formattedStats = {
        pending: 0,
        under_review: 0,
        approved: 0,
        rejected: 0,
        revoked: 0,
      };

      stats.forEach((stat) => {
        formattedStats[stat.status] = parseInt(stat.dataValues.count, 10);
      });

      formattedStats.total = formattedStats.pending + formattedStats.under_review + formattedStats.approved + formattedStats.rejected + formattedStats.revoked;

      logger.info(`Admin ${req.user.email} fetched instructor application stats`);

      return ApiResponse.success(res, formattedStats, 'Instructor application statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InstructorApplicationController;
