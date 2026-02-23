const express = require('express');
const router = express.Router();
const BadgesController = require('../../controllers/badges/badgesController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// GET /api/badges           — all badge definitions
router.get('/', authenticate, BadgesController.getAllBadges);

// GET /api/badges/my        — current user's earned badges
router.get('/my', authenticate, BadgesController.getMyBadges);

// GET /api/badges/user/:userId
router.get('/user/:userId', authenticate, BadgesController.getUserBadges);

module.exports = router;
