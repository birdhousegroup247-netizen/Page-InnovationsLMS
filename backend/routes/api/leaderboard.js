const express = require('express');
const router = express.Router();
const LeaderboardController = require('../../controllers/leaderboard/leaderboardController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// GET /api/leaderboard?courseId=&limit=20
router.get('/', authenticate, LeaderboardController.getLeaderboard);

// GET /api/leaderboard/my-rank
router.get('/my-rank', authenticate, LeaderboardController.getMyRank);

module.exports = router;
