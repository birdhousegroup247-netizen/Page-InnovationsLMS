const express = require('express');
const router = express.Router();
const ForumController = require('../../controllers/forum/forumController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// GET /api/forum/:postId
router.get('/:postId', authenticate, ForumController.getPost);

// PUT /api/forum/:postId
router.put('/:postId', authenticate, ForumController.updatePost);

// DELETE /api/forum/:postId
router.delete('/:postId', authenticate, ForumController.deletePost);

// POST /api/forum/:postId/replies
router.post('/:postId/replies', authenticate, ForumController.addReply);

// POST /api/forum/:postId/pin (instructor/admin)
router.post('/:postId/pin', authenticate, authorize('instructor', 'admin', 'super_admin'), ForumController.pinPost);

// POST /api/forum/:postId/upvote
router.post('/:postId/upvote', authenticate, ForumController.upvotePost);

// PUT /api/forum/replies/:replyId
router.put('/replies/:replyId', authenticate, ForumController.updateReply);

// DELETE /api/forum/replies/:replyId
router.delete('/replies/:replyId', authenticate, ForumController.deleteReply);

module.exports = router;
