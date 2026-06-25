const express = require('express');
const router = express.Router();
const UsersController = require('../../../controllers/admin/usersController');
const ImportController = require('../../../controllers/admin/importController');
const AdminCoursesController = require('../../../controllers/admin/coursesController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 2 * 1024 * 1024 } }); // 2MB

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

// IMPORTANT: Specific routes must come before dynamic :userId routes

// Get roles distribution (must be before /:userId)
router.get('/stats/roles', UsersController.getRolesDistribution);

// Bulk import users via CSV (must be before /:userId)
router.post('/import', upload.single('file'), ImportController.importUsers);

// Get all users
router.get('/', UsersController.getAllUsers);

// Get user by ID
router.get('/:userId', UsersController.getUserById);

// Create new user (super admin only)
router.post('/', authorize('super_admin'), UsersController.createUser);

// Update user
router.put('/:userId', UsersController.updateUser);

// Deactivate user (super admin only)
router.delete('/:userId', authorize('super_admin'), UsersController.deleteUser);

// Activate user
router.patch('/:userId/activate', UsersController.activateUser);

// Send (or re-send) the verification email to a user
router.post('/:userId/send-verification-email', UsersController.sendVerificationEmail);

// Send a password-reset link to a user
router.post('/:userId/send-password-reset', UsersController.sendPasswordReset);

// Override registration_status (unlock suspended / clear preview / re-activate)
router.patch('/:userId/registration-status', UsersController.setRegistrationStatus);

// Courses this user teaches (lead + co + TA)
router.get('/:userId/teaching-courses', AdminCoursesController.listInstructorCourses);

// Per-student assignment performance — totals, average, recent submissions.
// Surfaces on the admin User profile page.
router.get('/:userId/assignment-performance', UsersController.getAssignmentPerformance);

// Per-student live-session attendance rollup.
router.get('/:userId/attendance', UsersController.getAttendance);

module.exports = router;
