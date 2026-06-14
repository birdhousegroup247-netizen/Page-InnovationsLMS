const express = require('express');
const router = express.Router();
const InstructorApplicationController = require('../../controllers/admin/instructorApplicationController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

/**
 * Instructor Application Routes (Admin Only)
 * Base path: /api/admin/instructor-applications
 */

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

/**
 * @route   GET /api/admin/instructor-applications/stats
 * @desc    Get instructor application statistics
 * @access  Admin only
 */
router.get('/stats', InstructorApplicationController.getStats);

/**
 * @route   GET /api/admin/instructor-applications/pending
 * @desc    Get all pending instructor applications
 * @access  Admin only
 */
router.get('/pending', InstructorApplicationController.getPendingApplications);

/**
 * @route   GET /api/admin/instructor-applications
 * @desc    Get all instructor applications (with optional status filter)
 * @query   status - Filter by status (pending, approved, rejected)
 * @access  Admin only
 */
router.get('/', InstructorApplicationController.getAllApplications);

/**
 * @route   PUT /api/admin/instructor-applications/:id/approve
 * @desc    Approve an instructor application
 * @access  Admin only
 */
router.put('/:id/approve', InstructorApplicationController.approveApplication);

/**
 * @route   PUT /api/admin/instructor-applications/:id/reject
 * @desc    Reject an instructor application
 * @body    reason (optional) - Reason for rejection
 * @access  Admin only
 */
router.put('/:id/reject', InstructorApplicationController.rejectApplication);

/**
 * @route   PUT /api/admin/instructor-applications/:id/revoke
 * @desc    Revoke instructor status (demote to student)
 * @body    reason (optional) - Reason for revocation
 * @access  Admin only
 */
router.put('/:id/revoke', InstructorApplicationController.revokeInstructor);

/**
 * @route   POST /api/admin/instructor-applications/seed-demo
 * @desc    Seed demo applications across statuses (idempotent by email).
 * @access  Admin only
 */
router.post('/seed-demo', InstructorApplicationController.seedDemo);

module.exports = router;
