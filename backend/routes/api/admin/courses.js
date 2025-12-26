const express = require('express');
const router = express.Router();
const AdminCoursesController = require('../../../controllers/admin/coursesController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// Bulk operations (must come before /:id routes)
router.post('/bulk/status', AdminCoursesController.bulkUpdateStatus);
router.post('/bulk/delete', AdminCoursesController.bulkDelete);
router.post('/bulk/update-field', AdminCoursesController.bulkUpdateField);

// Get all courses
router.get('/', AdminCoursesController.getAllCourses);

// Get course stats
router.get('/stats', AdminCoursesController.getCourseStats);

// Get course by ID
router.get('/:id', AdminCoursesController.getCourseById);

// Update course status
router.patch('/:id/status', AdminCoursesController.updateCourseStatus);

module.exports = router;
