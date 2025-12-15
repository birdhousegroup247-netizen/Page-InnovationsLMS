const express = require('express');
const router = express.Router();
const StatsController = require('../controllers/statsController');
const { authenticateAdmin } = require('../middleware/adminAuth');

// All routes require admin authentication
router.use(authenticateAdmin);

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

module.exports = router;
