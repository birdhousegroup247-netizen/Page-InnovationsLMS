const express = require('express');
const router = express.Router();
const UsersController = require('../../../controllers/admin/usersController');
const ImportController = require('../../../controllers/admin/importController');
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

// Override registration_status (unlock suspended / clear preview / re-activate)
router.patch('/:userId/registration-status', UsersController.setRegistrationStatus);

module.exports = router;
