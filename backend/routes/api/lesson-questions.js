/**
 * Lesson Questions Routes
 * API endpoints for lesson Q&A system
 */

const express = require('express');
const router = express.Router();
const QuestionsController = require('../../controllers/questions/questionsController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// LESSON QUESTION ROUTES
// ============================================================================

// Get all questions for a lesson (Public)
router.get('/lessons/:contentId/questions', QuestionsController.getLessonQuestions);

// Ask a question on a lesson (Authenticated)
router.post('/lessons/:contentId/questions', authenticate, QuestionsController.askQuestion);

// Get a specific question with replies (Public)
router.get('/questions/:questionId', QuestionsController.getQuestionById);

// Update a question (Authenticated - owner only)
router.put('/questions/:questionId', authenticate, QuestionsController.updateQuestion);

// Delete a question (Authenticated - owner or admin)
router.delete('/questions/:questionId', authenticate, QuestionsController.deleteQuestion);

// Upvote a question (Authenticated)
router.post('/questions/:questionId/upvote', authenticate, QuestionsController.upvoteQuestion);

// ============================================================================
// QUESTION REPLY ROUTES
// ============================================================================

// Reply to a question (Authenticated)
router.post('/questions/:questionId/replies', authenticate, QuestionsController.replyToQuestion);

// Update a reply (Authenticated - owner only)
router.put('/replies/:replyId', authenticate, QuestionsController.updateReply);

// Delete a reply (Authenticated - owner or admin)
router.delete('/replies/:replyId', authenticate, QuestionsController.deleteReply);

// Upvote a reply (Authenticated)
router.post('/replies/:replyId/upvote', authenticate, QuestionsController.upvoteReply);

module.exports = router;
