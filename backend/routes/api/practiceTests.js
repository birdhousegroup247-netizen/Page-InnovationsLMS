const express = require('express');
const router = express.Router();
const PracticeTestController = require('../../controllers/exams/practiceTestController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');
const { testSubmissionLimiter } = require('../../middleware/rateLimiter');

// ============================================================================
// PRACTICE TEST ROUTES (Student Only)
// ============================================================================

// Generate new practice test
router.post('/generate', authenticate, authorize('student'), PracticeTestController.generatePracticeTest);

// Get test history
router.get('/history', authenticate, authorize('student'), PracticeTestController.getTestHistory);

// Get ongoing test
router.get('/:attemptId', authenticate, authorize('student'), PracticeTestController.getOngoingTest);

// Submit practice test (rate limited to prevent spam)
router.post('/:attemptId/submit', authenticate, authorize('student'), testSubmissionLimiter, PracticeTestController.submitPracticeTest);

// Get test results
router.get('/:attemptId/results', authenticate, authorize('student'), PracticeTestController.getTestResults);

module.exports = router;
