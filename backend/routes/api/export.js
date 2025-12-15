/**
 * Export Routes
 * API endpoints for data exports (CSV, PDF)
 */

const express = require('express');
const router = express.Router();
const ExportController = require('../../controllers/export/exportController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// All export routes require admin or instructor authentication
router.use(authenticate);
router.use(authorize('instructor', 'admin', 'super_admin'));

// ============================================================================
// CSV EXPORT ROUTES
// ============================================================================

// Export enrollments
router.get('/enrollments/csv', ExportController.exportEnrollmentsCSV);

// Export students (Admin only)
router.get('/students/csv', authorize('admin', 'super_admin'), ExportController.exportStudentsCSV);

// Export course analytics
router.get('/courses/analytics/csv', ExportController.exportCourseAnalyticsCSV);

// Export reviews
router.get('/reviews/csv', ExportController.exportReviewsCSV);

// Export activity logs (Admin only)
router.get('/activity-logs/csv', authorize('admin', 'super_admin'), ExportController.exportActivityLogsCSV);

// ============================================================================
// PDF REPORT ROUTES
// ============================================================================

// Generate course report PDF
router.get('/courses/:courseId/report/pdf', ExportController.generateCourseReportPDF);

// Generate enrollment report PDF
router.get('/enrollments/report/pdf', ExportController.generateEnrollmentReportPDF);

module.exports = router;
