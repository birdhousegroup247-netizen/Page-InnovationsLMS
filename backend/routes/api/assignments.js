const express = require('express');
const router = express.Router();
const AssignmentsController = require('../../controllers/assignments/assignmentsController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ── Instructor ─────────────────────────────────────────────────────────────
router.get(
  '/instructor/courses/:courseId/assignments',
  authenticate, authorize('instructor', 'admin', 'super_admin'),
  AssignmentsController.getCourseAssignments
);
router.post(
  '/instructor/courses/:courseId/assignments',
  authenticate, authorize('instructor', 'admin', 'super_admin'),
  AssignmentsController.createAssignment
);
router.put(
  '/instructor/assignments/:id',
  authenticate, authorize('instructor', 'admin', 'super_admin'),
  AssignmentsController.updateAssignment
);
router.delete(
  '/instructor/assignments/:id',
  authenticate, authorize('instructor', 'admin', 'super_admin'),
  AssignmentsController.deleteAssignment
);
router.get(
  '/instructor/assignments/:id/submissions',
  authenticate, authorize('instructor', 'admin', 'super_admin'),
  AssignmentsController.getSubmissions
);
router.post(
  '/instructor/submissions/:submissionId/grade',
  authenticate, authorize('instructor', 'admin', 'super_admin'),
  AssignmentsController.gradeSubmission
);

// ── Student ────────────────────────────────────────────────────────────────
// All assignments across all enrolled courses
router.get(
  '/student/assignments',
  authenticate,
  AssignmentsController.getAllStudentAssignments
);
router.get(
  '/courses/:courseId/assignments',
  authenticate,
  AssignmentsController.getStudentAssignments
);
router.post(
  '/assignments/:id/submit',
  authenticate,
  AssignmentsController.submitAssignment
);
router.put(
  '/assignments/:id/submit',
  authenticate,
  AssignmentsController.updateSubmission
);

module.exports = router;
