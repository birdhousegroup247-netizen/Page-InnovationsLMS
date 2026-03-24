const express = require('express');
const router = express.Router();
const QuestionBankController = require('../../controllers/exams/questionBankController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// QUESTION BANK ROUTES (All require authentication)
// ============================================================================

// Stats (before /:id to avoid param collision)
router.get('/stats', authenticate, authorize('instructor', 'admin', 'super_admin'), QuestionBankController.getStats);
router.get('/stats/by-course', authenticate, authorize('admin', 'super_admin'), QuestionBankController.getCourseStats);
router.get('/stats/by-category', authenticate, authorize('instructor', 'admin', 'super_admin'), QuestionBankController.getCategoryBreakdown);

// Browse questions
router.get('/', authenticate, authorize('instructor', 'admin', 'super_admin'), QuestionBankController.getAllQuestions);
router.get('/:id', authenticate, QuestionBankController.getQuestionById);

// Create questions
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), QuestionBankController.createQuestion);
router.post('/bulk', authenticate, authorize('instructor', 'admin', 'super_admin'), QuestionBankController.bulkCreateQuestions);

// Bulk operations (admin only)
router.post('/bulk/approve', authenticate, authorize('admin', 'super_admin'), QuestionBankController.bulkApprove);
router.post('/bulk/delete', authenticate, authorize('admin', 'super_admin'), QuestionBankController.bulkDeleteQuestions);

// Update and delete
router.put('/:id', authenticate, QuestionBankController.updateQuestion);
router.delete('/:id', authenticate, QuestionBankController.deleteQuestion);

// Approve / reject (admin only)
router.patch('/:id/approve', authenticate, authorize('admin', 'super_admin'), QuestionBankController.approveQuestion);
router.patch('/:id/reject', authenticate, authorize('admin', 'super_admin'), QuestionBankController.rejectQuestion);

module.exports = router;
