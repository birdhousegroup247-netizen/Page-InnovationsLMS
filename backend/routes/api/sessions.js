const express = require('express');
const router = express.Router();
const LiveSessionController = require('../../controllers/live-sessions/liveSessionController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// Routes for /api/sessions/:id
router.put('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), LiveSessionController.update);
router.delete('/:id', authenticate, authorize('instructor', 'admin', 'super_admin'), LiveSessionController.deleteSession);
router.patch('/:id/status', authenticate, authorize('instructor', 'admin', 'super_admin'), LiveSessionController.updateStatus);

module.exports = router;
