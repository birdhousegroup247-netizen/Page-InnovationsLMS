/**
 * Profile Routes
 * API endpoints for user profile management
 */

const express = require('express');
const router = express.Router();
const ProfileController = require('../../controllers/profile/profileController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// All profile routes require authentication
router.use(authenticate);

// ============================================================================
// PROFILE ROUTES
// ============================================================================

// Get authenticated user's profile
router.get('/', ProfileController.getProfile);

// Update profile
router.put('/', ProfileController.updateProfile);

// Update profile picture
router.put('/avatar', ProfileController.updateAvatar);

// Change password
router.put('/password', ProfileController.changePassword);

// Get learning statistics
router.get('/stats', ProfileController.getStats);

// Get activity timeline
router.get('/activity', ProfileController.getActivity);

// ============================================================================
// PUBLIC PROFILE ROUTES
// ============================================================================

// Get public profile (no authentication required for this specific route)
router.get('/users/:userId/public', ProfileController.getPublicProfile);

module.exports = router;
