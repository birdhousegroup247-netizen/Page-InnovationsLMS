const express = require('express');
const router = express.Router();
const AnalyticsController = require('../controllers/analyticsController');
const { authenticateAdmin } = require('../middleware/adminAuth');

// All routes require admin authentication
router.use(authenticateAdmin);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

// Student performance analytics
router.get('/students/performance', AnalyticsController.getStudentPerformance);

// Course analytics
router.get('/courses', AnalyticsController.getCourseAnalytics);

// Question bank analytics
router.get('/questions', AnalyticsController.getQuestionAnalytics);

// Instructor analytics
router.get('/instructors', AnalyticsController.getInstructorAnalytics);

// Enrollment analytics
router.get('/enrollments', AnalyticsController.getEnrollmentAnalytics);

module.exports = router;
