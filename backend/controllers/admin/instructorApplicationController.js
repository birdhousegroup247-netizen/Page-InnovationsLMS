const { User } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { BadRequestError, NotFoundError, ForbiddenError } = require('../../utils/errors');

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
      // Find all users with pending instructor status
      const applications = await User.findAll({
        where: { instructor_status: 'pending' },
        attributes: ['id', 'full_name', 'email', 'bio', 'created_at', 'instructor_status'],
        order: [['created_at', 'ASC']],
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
      if (status && ['pending', 'approved', 'rejected'].includes(status)) {
        where.instructor_status = status;
      } else {
        // Get all except 'none' (users who never applied)
        where.instructor_status = ['pending', 'approved', 'rejected'];
      }

      const applications = await User.findAll({
        where,
        attributes: ['id', 'full_name', 'email', 'bio', 'role', 'instructor_status', 'created_at'],
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

      // Find user
      const user = await User.findByPk(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if application is pending
      if (user.instructor_status !== 'pending') {
        throw new BadRequestError(`Cannot approve application with status: ${user.instructor_status}`);
      }

      // Approve application: change role to instructor and status to approved
      user.role = 'instructor';
      user.instructor_status = 'approved';
      await user.save();

      logger.info(`Admin ${req.user.email} approved instructor application for user ${user.email}`);

      // TODO: Send approval email to user
      // const emailService = require('../../services/email/emailService');
      // await emailService.sendInstructorApprovalEmail(user.email, user.full_name);

      return ApiResponse.success(res, {
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

      // Find user
      const user = await User.findByPk(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if application is pending
      if (user.instructor_status !== 'pending') {
        throw new BadRequestError(`Cannot reject application with status: ${user.instructor_status}`);
      }

      // Reject application
      user.instructor_status = 'rejected';
      await user.save();

      logger.info(`Admin ${req.user.email} rejected instructor application for user ${user.email}${reason ? ` (reason: ${reason})` : ''}`);

      // TODO: Send rejection email to user with reason
      // const emailService = require('../../services/email/emailService');
      // await emailService.sendInstructorRejectionEmail(user.email, user.full_name, reason);

      return ApiResponse.success(res, {
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

      // Find user
      const user = await User.findByPk(id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Check if user is actually an instructor
      if (user.role !== 'instructor') {
        throw new BadRequestError('User is not an instructor');
      }

      // Revoke instructor status
      user.role = 'student';
      user.instructor_status = 'rejected';
      await user.save();

      logger.warn(`Admin ${req.user.email} revoked instructor status for user ${user.email}${reason ? ` (reason: ${reason})` : ''}`);

      // TODO: Send notification email to user
      // const emailService = require('../../services/email/emailService');
      // await emailService.sendInstructorRevocationEmail(user.email, user.full_name, reason);

      return ApiResponse.success(res, {
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
      const stats = await User.findAll({
        attributes: [
          'instructor_status',
          [User.sequelize.fn('COUNT', User.sequelize.col('id')), 'count'],
        ],
        where: {
          instructor_status: ['pending', 'approved', 'rejected'],
        },
        group: ['instructor_status'],
      });

      const formattedStats = {
        pending: 0,
        approved: 0,
        rejected: 0,
      };

      stats.forEach((stat) => {
        formattedStats[stat.instructor_status] = parseInt(stat.dataValues.count, 10);
      });

      formattedStats.total = formattedStats.pending + formattedStats.approved + formattedStats.rejected;

      logger.info(`Admin ${req.user.email} fetched instructor application stats`);

      return ApiResponse.success(res, formattedStats, 'Instructor application statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = InstructorApplicationController;
