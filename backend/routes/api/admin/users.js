const express = require('express');
const router = express.Router();
const UsersController = require('../../../controllers/admin/usersController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

// IMPORTANT: Specific routes must come before dynamic :userId routes

// Get roles distribution (must be before /:userId)
router.get('/stats/roles', UsersController.getRolesDistribution);

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

module.exports = router;
