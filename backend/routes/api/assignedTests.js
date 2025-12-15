const express = require('express');
const router = express.Router();
const AssignedTestController = require('../../controllers/exams/assignedTestController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// ASSIGNED TEST ROUTES (Instructor/Admin)
// ============================================================================

// Get all tests created by instructor
router.get('/my-tests', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.getInstructorTests);

// Create assigned test
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.createAssignedTest);

// Get test by ID
router.get('/:testId', authenticate, AssignedTestController.getTestById);

// Update test
router.put('/:testId', authenticate, AssignedTestController.updateTest);

// Delete test (archive)
router.delete('/:testId', authenticate, AssignedTestController.deleteTest);

// Add questions to test
router.post('/:testId/questions', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.addQuestionsToTest);

// Assign test to students
router.post('/:testId/assign', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.assignTestToStudents);

// ============================================================================
// STUDENT ROUTES
// ============================================================================

// Get my assignments
router.get('/my/assignments', authenticate, authorize('student'), AssignedTestController.getMyAssignments);

// Start assigned test
router.post('/assignments/:assignmentId/start', authenticate, authorize('student'), AssignedTestController.startAssignedTest);

// Submit assigned test
router.post('/attempts/:attemptId/submit', authenticate, authorize('student'), AssignedTestController.submitAssignedTest);

// Get test results
router.get('/attempts/:attemptId/results', authenticate, AssignedTestController.getAssignedTestResults);

module.exports = router;
