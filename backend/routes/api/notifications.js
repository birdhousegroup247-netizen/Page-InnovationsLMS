/**
 * Notifications Routes
 * API endpoints for notification management
 */

const express = require('express');
const router = express.Router();
const NotificationsController = require('../../controllers/notifications/notificationsController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// All notification routes require authentication
router.use(authenticate);

// ============================================================================
// NOTIFICATION ROUTES
// ============================================================================

// Get all notifications for authenticated user
router.get('/', NotificationsController.getNotifications);

// Get unread notifications
router.get('/unread', NotificationsController.getUnreadNotifications);

// Get unread notification count
router.get('/unread/count', NotificationsController.getUnreadCount);

// Mark notification as read
router.put('/:notificationId/read', NotificationsController.markAsRead);

// Mark all notifications as read
router.put('/mark-all-read', NotificationsController.markAllAsRead);

// Delete a notification
router.delete('/:notificationId', NotificationsController.deleteNotification);

// Clear all notifications
router.delete('/clear-all', NotificationsController.clearAllNotifications);

module.exports = router;
