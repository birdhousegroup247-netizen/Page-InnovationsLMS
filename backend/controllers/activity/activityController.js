/**
 * Activity Controller
 * Handles activity logging and retrieval
 */

const { ActivityLog, User } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');

class ActivityController {
  /**
   * Get all activity logs (Admin only)
   * GET /api/admin/activity-logs
   */
  static async getAllActivityLogs(req, res, next) {
    try {
      const { page = 1, limit = 50, action, entity_type, user_id, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;

      const where = {};

      // Filter by action
      if (action) {
        where.action = action;
      }

      // Filter by entity type
      if (entity_type) {
        where.entity_type = entity_type;
      }

      // Filter by user
      if (user_id) {
        where.user_id = user_id;
      }

      // Filter by date range
      if (start_date || end_date) {
        where.created_at = {};
        if (start_date) {
          where.created_at[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          where.created_at[Op.lte] = new Date(end_date);
        }
      }

      const { count, rows } = await ActivityLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'role'],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        logs: rows,
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
   * Get activity logs for a specific user (Admin only)
   * GET /api/admin/activity-logs/user/:userId
   */
  static async getUserActivityLogs(req, res, next) {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 50, action, start_date, end_date } = req.query;
      const offset = (page - 1) * limit;

      const where = { user_id: userId };

      // Filter by action
      if (action) {
        where.action = action;
      }

      // Filter by date range
      if (start_date || end_date) {
        where.created_at = {};
        if (start_date) {
          where.created_at[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          where.created_at[Op.lte] = new Date(end_date);
        }
      }

      const { count, rows } = await ActivityLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        logs: rows,
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
   * Get authenticated user's own activity
   * GET /api/activity/my
   */
  static async getMyActivity(req, res, next) {
    try {
      const { page = 1, limit = 20, action } = req.query;
      const offset = (page - 1) * limit;
      const userId = req.user.id;

      const where = { user_id: userId };

      // Filter by action
      if (action) {
        where.action = action;
      }

      const { count, rows } = await ActivityLog.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        logs: rows,
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
   * Get activity statistics (Admin only)
   * GET /api/admin/activity-logs/stats
   */
  static async getActivityStats(req, res, next) {
    try {
      const { start_date, end_date } = req.query;

      const where = {};

      // Filter by date range
      if (start_date || end_date) {
        where.created_at = {};
        if (start_date) {
          where.created_at[Op.gte] = new Date(start_date);
        }
        if (end_date) {
          where.created_at[Op.lte] = new Date(end_date);
        }
      }

      // Total activities
      const totalActivities = await ActivityLog.count({ where });

      // Activities by action
      const actionStats = await ActivityLog.findAll({
        where,
        attributes: ['action', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['action'],
        raw: true,
      });

      // Activities by entity type
      const entityStats = await ActivityLog.findAll({
        where,
        attributes: ['entity_type', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
        group: ['entity_type'],
        raw: true,
      });

      // Most active users
      const topUsers = await ActivityLog.findAll({
        where,
        attributes: ['user_id', [sequelize.fn('COUNT', sequelize.col('id')), 'activity_count']],
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'email', 'role'],
          },
        ],
        group: ['user_id', 'user.id'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        subQuery: false,
      });

      return ApiResponse.success(res, {
        total_activities: totalActivities,
        by_action: actionStats,
        by_entity_type: entityStats,
        top_users: topUsers,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Log an activity (Helper method for internal use)
   * Used by other controllers to log activities
   */
  static async logActivity(data) {
    try {
      const activity = await ActivityLog.create(data);
      logger.info(`Activity logged: ${data.action} by user ${data.user_id || 'system'}`);
      return activity;
    } catch (error) {
      logger.error(`Error logging activity: ${error.message}`);
      // Don't throw error - activity logging should not break main operations
    }
  }

  /**
   * Log activity from request (captures IP and user agent)
   */
  static async logFromRequest(req, action, entity_type = null, entity_id = null, metadata = null) {
    try {
      const data = {
        user_id: req.user ? req.user.id : null,
        action,
        entity_type,
        entity_id,
        metadata,
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
      };

      return await this.logActivity(data);
    } catch (error) {
      logger.error(`Error logging activity from request: ${error.message}`);
    }
  }
}

module.exports = ActivityController;
