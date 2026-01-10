const express = require('express');
const router = express.Router();
const InstructorDashboardController = require('../../controllers/instructor/instructorDashboardController');
const StudentManagementController = require('../../controllers/instructor/studentManagementController');
const TestAnalyticsController = require('../../controllers/instructor/testAnalyticsController');
const QuestionStatusController = require('../../controllers/instructor/questionStatusController');
const CourseAnalyticsController = require('../../controllers/instructor/courseAnalyticsController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

/**
 * Instructor Routes
 * Base: /api/instructor
 * All routes require instructor, admin, or super_admin role
 */

// ============================================
// DASHBOARD ROUTES
// ============================================

// @route   GET /api/instructor/dashboard
// @desc    Get instructor dashboard overview
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/dashboard',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => InstructorDashboardController.getDashboard(req, res, next)
);

// @route   GET /api/instructor/stats
// @desc    Get instructor statistics
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/stats',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => InstructorDashboardController.getStats(req, res, next)
);

// ============================================
// STUDENT MANAGEMENT ROUTES
// ============================================

// @route   GET /api/instructor/students
// @desc    Get all students enrolled in any of the instructor's courses
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/students',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => StudentManagementController.getAllStudents(req, res, next)
);

// @route   GET /api/instructor/courses/:courseId/students
// @desc    Get all students enrolled in a specific course
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/courses/:courseId/students',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => StudentManagementController.getCourseStudents(req, res, next)
);

// @route   GET /api/instructor/students/:studentId/progress/:courseId
// @desc    Get detailed progress for a specific student in a course
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/students/:studentId/progress/:courseId',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => StudentManagementController.getStudentProgress(req, res, next)
);

// @route   GET /api/instructor/students/:studentId/test-results
// @desc    Get test results for a specific student
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/students/:studentId/test-results',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => StudentManagementController.getStudentTestResults(req, res, next)
);

// @route   GET /api/instructor/courses/:courseId/enrollments
// @desc    Get enrollment details for a course
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/courses/:courseId/enrollments',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => StudentManagementController.getCourseEnrollments(req, res, next)
);

// ============================================
// TEST ANALYTICS ROUTES
// ============================================

// @route   GET /api/instructor/tests/:testId/analytics
// @desc    Get comprehensive analytics for a specific test
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/tests/:testId/analytics',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => TestAnalyticsController.getTestAnalytics(req, res, next)
);

// @route   GET /api/instructor/tests/:testId/results
// @desc    Get all test results for a specific test
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/tests/:testId/results',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => TestAnalyticsController.getTestResults(req, res, next)
);

// @route   GET /api/instructor/attempts/:attemptId/details
// @desc    Get detailed results for a specific student attempt
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/attempts/:attemptId/details',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => TestAnalyticsController.getAttemptDetails(req, res, next)
);

// ============================================
// QUESTION STATUS ROUTES
// ============================================

// @route   GET /api/instructor/questions/stats
// @desc    Get question approval statistics for the instructor
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/questions/stats',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => QuestionStatusController.getQuestionStats(req, res, next)
);

// @route   GET /api/instructor/questions/my
// @desc    Get all questions submitted by the instructor
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/questions/my',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => QuestionStatusController.getMyQuestions(req, res, next)
);

// @route   GET /api/instructor/questions/:questionId/status
// @desc    Get detailed approval status for a specific question
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/questions/:questionId/status',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => QuestionStatusController.getQuestionStatus(req, res, next)
);

// ============================================
// COURSE ANALYTICS ROUTES
// ============================================

// @route   GET /api/instructor/courses/:courseId/analytics
// @desc    Get comprehensive analytics for a specific course
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/courses/:courseId/analytics',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => CourseAnalyticsController.getCourseAnalytics(req, res, next)
);

// @route   GET /api/instructor/courses/:courseId/enrollment-trends
// @desc    Get enrollment trends over time for a course
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/courses/:courseId/enrollment-trends',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => CourseAnalyticsController.getEnrollmentTrends(req, res, next)
);

// @route   GET /api/instructor/courses/:courseId/progress-distribution
// @desc    Get student progress distribution for a course
// @access  Private (Instructor, Admin, Super Admin)
router.get(
  '/courses/:courseId/progress-distribution',
  authenticate,
  authorize('instructor', 'admin', 'super_admin'),
  (req, res, next) => CourseAnalyticsController.getProgressDistribution(req, res, next)
);

module.exports = router;
