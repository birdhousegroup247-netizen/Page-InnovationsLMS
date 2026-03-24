const express = require('express');
const router = express.Router();
const AdminEnrollmentsController = require('../../../controllers/admin/enrollmentsController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// Stats (before /:id)
router.get('/stats', AdminEnrollmentsController.getEnrollmentStats);

// List all enrollments (filters: course_id, student_id, completed, search)
router.get('/', AdminEnrollmentsController.getAllEnrollments);

// Manually enroll a student
router.post('/', AdminEnrollmentsController.createEnrollment);

// Remove an enrollment
router.delete('/:id', AdminEnrollmentsController.deleteEnrollment);

// Manually set progress
router.patch('/:id/progress', AdminEnrollmentsController.updateProgress);

module.exports = router;
