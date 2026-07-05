const express = require('express');
const router = express.Router();
const AssignedTestController = require('../../controllers/exams/assignedTestController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// STUDENT ROUTES (must be before /:testId to avoid param collision)
// ============================================================================

// Get all tests assigned to me
router.get('/student/my-tests', authenticate, authorize('student'), AssignedTestController.getStudentTests);

// Attempt routes (before /student/:testId to avoid collision)
router.get('/student/attempts/:attemptId/results', authenticate, AssignedTestController.getAssignedTestResults);
router.get('/student/attempts/:attemptId', authenticate, authorize('student'), AssignedTestController.getStudentAttempt);
router.post('/student/attempts/:attemptId/submit', authenticate, authorize('student'), AssignedTestController.submitAssignedTest);

// Start test by testId (student)
router.post('/student/:testId/start', authenticate, authorize('student'), AssignedTestController.startTestByTestId);

// Get single test (student view)
router.get('/student/:testId', authenticate, authorize('student'), AssignedTestController.getStudentTest);

// Legacy: my assignments
router.get('/my/assignments', authenticate, AssignedTestController.getMyAssignments);

// Legacy: start by assignmentId
router.post('/assignments/:assignmentId/start', authenticate, AssignedTestController.startAssignedTest);

// Legacy: submit/results
router.post('/attempts/:attemptId/submit', authenticate, AssignedTestController.submitAssignedTest);
router.get('/attempts/:attemptId/results', authenticate, AssignedTestController.getAssignedTestResults);

// ============================================================================
// INSTRUCTOR / ADMIN ROUTES
// ============================================================================

// Get all tests created by instructor/admin
router.get('/my-tests', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.getInstructorTests);

// Create assigned test
router.post('/', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.createAssignedTest);

// Publish test + assign to students
router.patch('/:testId/publish', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.publishTest);

// Archive test
router.patch('/:testId/archive', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.archiveTest);

// Get test by ID
router.get('/:testId', authenticate, AssignedTestController.getTestById);

// Update test
router.put('/:testId', authenticate, AssignedTestController.updateTest);

// Delete test
router.delete('/:testId', authenticate, AssignedTestController.deleteTest);

// Add questions to test
router.post('/:testId/questions', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.addQuestionsToTest);

// Assign test to students (manual)
router.post('/:testId/assign', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.assignTestToStudents);

// Per-test results list (instructor/admin view) — used by /test-results/:testId
router.get('/:testId/results', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.getTestAttempts);

// Release withheld results to students — bulk (no body) or per-student
// ({ assignment_ids }). Instructor/admin only.
router.post('/:testId/release-results', authenticate, authorize('instructor', 'admin', 'super_admin'), AssignedTestController.releaseResults);

module.exports = router;
