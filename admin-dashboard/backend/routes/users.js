const express = require('express');
const router = express.Router();
const UsersController = require('../controllers/usersController');
const { authenticateAdmin, superAdminOnly } = require('../middleware/adminAuth');

// All routes require admin authentication
router.use(authenticateAdmin);

// ============================================================================
// USER MANAGEMENT ROUTES
// ============================================================================

// Get all users
router.get('/', UsersController.getAllUsers);

// Get user by ID
router.get('/:userId', UsersController.getUserById);

// Create new user (super admin only)
router.post('/', superAdminOnly, UsersController.createUser);

// Update user
router.put('/:userId', UsersController.updateUser);

// Deactivate user (super admin only)
router.delete('/:userId', superAdminOnly, UsersController.deleteUser);

// Activate user
router.patch('/:userId/activate', UsersController.activateUser);

// Get roles distribution
router.get('/stats/roles', UsersController.getRolesDistribution);

module.exports = router;
