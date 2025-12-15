/**
 * Notifications Controller
 * Handles in-app notifications for users
 */

const { Notification, User } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const CacheService = require('../../services/cache/cacheService');

class NotificationsController {
  /**
   * Get all notifications for the authenticated user
   * GET /api/notifications
   */
  static async getNotifications(req, res, next) {
    try {
      const { page = 1, limit = 20, type, is_read } = req.query;
      const offset = (page - 1) * limit;

      const where = { user_id: req.user.id };

      // Filter by notification type
      if (type) {
        where.type = type;
      }

      // Filter by read status
      if (is_read !== undefined) {
        where.is_read = is_read === 'true';
      }

      const { count, rows } = await Notification.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        notifications: rows,
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
   * Get unread notifications
   * GET /api/notifications/unread
   */
  static async getUnreadNotifications(req, res, next) {
    try {
      const { limit = 10 } = req.query;

      const notifications = await Notification.findAll({
        where: {
          user_id: req.user.id,
          is_read: false,
        },
        limit: parseInt(limit),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, { notifications });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get unread notification count
   * GET /api/notifications/unread/count
   */
  static async getUnreadCount(req, res, next) {
    try {
      // Try cache first (1-minute TTL)
      const cachedCount = await CacheService.getCachedNotificationCount(req.user.id);

      if (cachedCount !== null) {
        return ApiResponse.success(res, { unread_count: cachedCount });
      }

      // Get from database
      const count = await Notification.count({
        where: {
          user_id: req.user.id,
          is_read: false,
        },
      });

      // Cache for 1 minute
      await CacheService.cacheNotificationCount(req.user.id, count, 60);

      return ApiResponse.success(res, { unread_count: count });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark a notification as read
   * PUT /api/notifications/:notificationId/read
   */
  static async markAsRead(req, res, next) {
    try {
      const { notificationId } = req.params;

      const notification = await Notification.findByPk(notificationId);

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      // Verify ownership
      if (notification.user_id !== req.user.id) {
        throw new ForbiddenError('You can only mark your own notifications as read');
      }

      notification.is_read = true;
      await notification.save();

      // Invalidate cache
      await CacheService.invalidateNotifications(req.user.id);

      logger.info(`User ${req.user.id} marked notification ${notificationId} as read`);

      return ApiResponse.success(res, { notification }, 'Notification marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Mark all notifications as read
   * PUT /api/notifications/mark-all-read
   */
  static async markAllAsRead(req, res, next) {
    try {
      const [updatedCount] = await Notification.update(
        { is_read: true },
        {
          where: {
            user_id: req.user.id,
            is_read: false,
          },
        }
      );

      // Invalidate cache
      await CacheService.invalidateNotifications(req.user.id);

      logger.info(`User ${req.user.id} marked ${updatedCount} notifications as read`);

      return ApiResponse.success(res, { updated_count: updatedCount }, 'All notifications marked as read');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a notification
   * DELETE /api/notifications/:notificationId
   */
  static async deleteNotification(req, res, next) {
    try {
      const { notificationId } = req.params;

      const notification = await Notification.findByPk(notificationId);

      if (!notification) {
        throw new NotFoundError('Notification not found');
      }

      // Verify ownership
      if (notification.user_id !== req.user.id) {
        throw new ForbiddenError('You can only delete your own notifications');
      }

      await notification.destroy();

      logger.info(`User ${req.user.id} deleted notification ${notificationId}`);

      return ApiResponse.success(res, null, 'Notification deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Clear all notifications
   * DELETE /api/notifications/clear-all
   */
  static async clearAllNotifications(req, res, next) {
    try {
      const deletedCount = await Notification.destroy({
        where: {
          user_id: req.user.id,
        },
      });

      logger.info(`User ${req.user.id} cleared ${deletedCount} notifications`);

      return ApiResponse.success(res, { deleted_count: deletedCount }, 'All notifications cleared');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create a notification (helper method for internal use)
   * Used by other controllers to create notifications
   */
  static async createNotification(data) {
    try {
      const notification = await Notification.create(data);

      // Invalidate user's notification cache
      await CacheService.invalidateNotifications(data.user_id);

      logger.info(`Notification created for user ${data.user_id}: ${data.type}`);
      return notification;
    } catch (error) {
      logger.error(`Error creating notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create bulk notifications (for announcements, etc.)
   */
  static async createBulkNotifications(notifications) {
    try {
      const created = await Notification.bulkCreate(notifications);
      logger.info(`${created.length} notifications created in bulk`);
      return created;
    } catch (error) {
      logger.error(`Error creating bulk notifications: ${error.message}`);
      throw error;
    }
  }
}

module.exports = NotificationsController;
