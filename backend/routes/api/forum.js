const express = require('express');
const router = express.Router({ mergeParams: true });
const ForumController = require('../../controllers/forum/forumController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// Routes mounted at /api/courses/:courseId/forum
router.get('/', authenticate, ForumController.getPosts);
router.post('/', authenticate, ForumController.createPost);

module.exports = router;
