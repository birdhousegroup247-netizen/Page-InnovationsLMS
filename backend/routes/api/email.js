const express = require('express');
const router = express.Router();
const EmailController = require('../../controllers/email/emailController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// Public — token is the auth
router.get('/unsubscribe/verify', EmailController.verifyToken);
router.post('/unsubscribe', EmailController.unsubscribe);

// Authenticated
router.post('/resubscribe', authenticate, EmailController.resubscribe);

module.exports = router;
