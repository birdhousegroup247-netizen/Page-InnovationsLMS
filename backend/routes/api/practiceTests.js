const express = require('express');
const router = express.Router();
const PracticeTestController = require('../../controllers/exams/practiceTestController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// PRACTICE TEST ROUTES (Student Only)
// ============================================================================

// Generate new practice test
router.post('/generate', authenticate, authorize('student'), PracticeTestController.generatePracticeTest);

// Get test history
router.get('/history', authenticate, authorize('student'), PracticeTestController.getTestHistory);

// Get ongoing test
router.get('/:attemptId', authenticate, authorize('student'), PracticeTestController.getOngoingTest);

// Submit practice test
router.post('/:attemptId/submit', authenticate, authorize('student'), PracticeTestController.submitPracticeTest);

// Get test results
router.get('/:attemptId/results', authenticate, authorize('student'), PracticeTestController.getTestResults);

module.exports = router;
