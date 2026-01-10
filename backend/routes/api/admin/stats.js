const express = require('express');
const router = express.Router();
const StatsController = require('../../../controllers/admin/statsController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// ============================================================================
// STATISTICS ROUTES
// ============================================================================

// Get dashboard overview stats
router.get('/overview', StatsController.getOverviewStats);

// Get enrollment trends
router.get('/enrollments/trends', StatsController.getEnrollmentTrends);

// Get popular courses
router.get('/courses/popular', StatsController.getPopularCourses);

// Get recent activities
router.get('/activities/recent', StatsController.getRecentActivities);

// Get system health
router.get('/system/health', StatsController.getSystemHealth);

// Default stats endpoint (overview)
router.get('/', StatsController.getOverviewStats);

module.exports = router;
