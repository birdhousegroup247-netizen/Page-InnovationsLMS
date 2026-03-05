const express = require('express');
const router = express.Router({ mergeParams: true });
const LiveSessionController = require('../../controllers/live-sessions/liveSessionController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// Routes mounted at /api/courses/:courseId/sessions
router.get('/', authenticate, LiveSessionController.getByCourse);
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), LiveSessionController.create);

module.exports = router;
