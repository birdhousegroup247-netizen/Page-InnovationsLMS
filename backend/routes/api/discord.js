const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');
const {
  connectAccount,
  handleCallback,
  getStatus,
  disconnect,
  getCourseInvite,
  adminSyncUser,
} = require('../../controllers/discord/discordController');

// Connect Discord account (redirect to OAuth)
router.get('/auth', authenticate, connectAccount);

// OAuth callback (Discord redirects here after authorization)
router.get('/callback', handleCallback);

// Get current user's Discord connection status
router.get('/status', authenticate, getStatus);

// Disconnect Discord account
router.delete('/disconnect', authenticate, disconnect);

// Get Discord invite link for a course (enrolled students only)
router.get('/course/:courseId/invite', authenticate, getCourseInvite);

// Admin: manually sync a user's Discord roles
router.post('/admin/sync/:userId', authenticate, authorize('admin', 'super_admin'), adminSyncUser);

module.exports = router;
