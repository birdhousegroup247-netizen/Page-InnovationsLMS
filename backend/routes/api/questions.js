const express = require('express');
const router = express.Router();
const QuestionBankController = require('../../controllers/exams/questionBankController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// QUESTION BANK ROUTES (All require authentication)
// ============================================================================

// Browse questions (instructors and admins)
router.get('/', authenticate, authorize('instructor', 'admin', 'super_admin'), QuestionBankController.getAllQuestions);
router.get('/:id', authenticate, QuestionBankController.getQuestionById);

// Create questions (instructors and admins)
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), QuestionBankController.createQuestion);
router.post('/bulk', authenticate, authorize('instructor', 'admin', 'super_admin'), QuestionBankController.bulkCreateQuestions);

// Update and delete questions
router.put('/:id', authenticate, QuestionBankController.updateQuestion);
router.delete('/:id', authenticate, QuestionBankController.deleteQuestion);

// Approve question (admin only)
router.patch('/:id/approve', authenticate, authorize('admin', 'super_admin'), QuestionBankController.approveQuestion);

module.exports = router;
