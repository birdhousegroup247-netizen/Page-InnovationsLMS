/**
 * Activity Routes
 * API endpoints for activity logging
 */

const express = require('express');
const router = express.Router();
const ActivityController = require('../../controllers/activity/activityController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// ACTIVITY LOG ROUTES
// ============================================================================

// Get authenticated user's own activity (default route)
router.get('/', authenticate, ActivityController.getMyActivity);

// Get authenticated user's own activity (explicit route)
router.get('/my', authenticate, ActivityController.getMyActivity);

// Admin routes - all activity logs
router.get('/admin/activity-logs', authenticate, authorize('admin', 'super_admin'), ActivityController.getAllActivityLogs);

// Admin routes - specific user's activity
router.get('/admin/activity-logs/user/:userId', authenticate, authorize('admin', 'super_admin'), ActivityController.getUserActivityLogs);

// Admin routes - activity statistics
router.get('/admin/activity-logs/stats', authenticate, authorize('admin', 'super_admin'), ActivityController.getActivityStats);

module.exports = router;
