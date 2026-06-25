const { Assignment, AssignmentSubmission, User, Course, Enrollment, ModuleContent, AssignedTest } = require('../../models');
const ApiResponse = require('../../utils/response');
const { Op } = require('sequelize');
const NotificationsController = require('../notifications/notificationsController');
const ActivityController = require('../activity/activityController');

// Reject anything that isn't an http(s) URL — keeps junk and javascript:
// schemes out of link_url before they end up in someone's <a href>.
function isValidHttpUrl(u) {
  if (typeof u !== 'string') return false;
  try {
    const parsed = new URL(u.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

const instructorInclude = [{ model: User, as: 'instructor', attributes: ['id', 'full_name'] }];
const studentInclude = [{ model: User, as: 'student', attributes: ['id', 'full_name', 'profile_picture'] }];

class AssignmentsController {
  // ── Instructor: manage assignments ────────────────────────────────────────

  // GET /api/instructor/courses/:courseId/assignments
  static async getCourseAssignments(req, res, next) {
    try {
      const { courseId } = req.params;
      const assignments = await Assignment.findAll({
        where: { course_id: courseId, created_by: req.user.id },
        include: [
          { model: ModuleContent, as: 'content', attributes: ['id', 'title'] },
          {
            model: AssignmentSubmission, as: 'submissions',
            attributes: ['id', 'student_id', 'status', 'score', 'submitted_at'],
          },
        ],
        order: [['created_at', 'DESC']],
      });
      return ApiResponse.success(res, { assignments });
    } catch (err) { next(err); }
  }

  // POST /api/instructor/courses/:courseId/assignments
  static async createAssignment(req, res, next) {
    try {
      const { courseId } = req.params;
      const {
        title, description, due_date, max_score,
        allow_file_upload, allow_text_submission, allow_link_submission,
        content_id, linked_test_id,
      } = req.body;
      if (!title?.trim()) return ApiResponse.error(res, 'Title is required', 400);

      // If a linked_test_id is set, validate it belongs to the same
      // course so an instructor can't reach across courses.
      if (linked_test_id) {
        const test = await AssignedTest.findByPk(linked_test_id);
        if (!test || String(test.course_id) !== String(courseId)) {
          return ApiResponse.error(res, 'Linked test must belong to this course', 400);
        }
      }

      const isLinkedTest = !!linked_test_id;
      const assignment = await Assignment.create({
        course_id: courseId,
        created_by: req.user.id,
        content_id: content_id || null,
        title: title.trim(),
        description,
        due_date: due_date || null,
        max_score: max_score || 100,
        // When linked to a test, the test IS the submission — turn
        // off file/text/link inputs so the student form stays clean.
        allow_file_upload: isLinkedTest ? false : allow_file_upload !== false,
        allow_text_submission: isLinkedTest ? false : allow_text_submission !== false,
        allow_link_submission: isLinkedTest ? false : !!allow_link_submission,
        linked_test_id: linked_test_id || null,
      });
      await ActivityController.logFromRequest(req, 'assignment_create', 'assignment', assignment.id, {
        title: assignment.title, course_id: parseInt(courseId),
      }).catch(() => {});
      return ApiResponse.success(res, { assignment }, 'Assignment created', 201);
    } catch (err) { next(err); }
  }

  // PUT /api/instructor/assignments/:id
  static async updateAssignment(req, res, next) {
    try {
      const assignment = await Assignment.findOne({ where: { id: req.params.id, created_by: req.user.id } });
      if (!assignment) return ApiResponse.error(res, 'Assignment not found', 404);
      const {
        title, description, due_date, max_score,
        allow_file_upload, allow_text_submission, allow_link_submission,
        linked_test_id,
      } = req.body;

      if (linked_test_id !== undefined && linked_test_id) {
        const test = await AssignedTest.findByPk(linked_test_id);
        if (!test || String(test.course_id) !== String(assignment.course_id)) {
          return ApiResponse.error(res, 'Linked test must belong to this course', 400);
        }
      }

      const isLinkedTest = (linked_test_id !== undefined ? !!linked_test_id : !!assignment.linked_test_id);
      await assignment.update({
        title, description, due_date, max_score,
        allow_file_upload: isLinkedTest ? false : allow_file_upload,
        allow_text_submission: isLinkedTest ? false : allow_text_submission,
        allow_link_submission: isLinkedTest ? false : allow_link_submission,
        linked_test_id: linked_test_id !== undefined ? (linked_test_id || null) : assignment.linked_test_id,
      });
      return ApiResponse.success(res, { assignment });
    } catch (err) { next(err); }
  }

  // DELETE /api/instructor/assignments/:id
  static async deleteAssignment(req, res, next) {
    try {
      const assignment = await Assignment.findOne({ where: { id: req.params.id, created_by: req.user.id } });
      if (!assignment) return ApiResponse.error(res, 'Assignment not found', 404);
      await assignment.destroy();
      return ApiResponse.success(res, null, 'Assignment deleted');
    } catch (err) { next(err); }
  }

  // GET /api/instructor/assignments/:id/submissions
  static async getSubmissions(req, res, next) {
    try {
      const assignment = await Assignment.findOne({ where: { id: req.params.id, created_by: req.user.id } });
      if (!assignment) return ApiResponse.error(res, 'Assignment not found', 404);
      const submissions = await AssignmentSubmission.findAll({
        where: { assignment_id: req.params.id },
        include: studentInclude,
        order: [['submitted_at', 'ASC']],
      });
      return ApiResponse.success(res, { assignment, submissions });
    } catch (err) { next(err); }
  }

  // POST /api/instructor/submissions/:submissionId/grade
  static async gradeSubmission(req, res, next) {
    try {
      const { score, feedback } = req.body;
      const submission = await AssignmentSubmission.findOne({
        where: { id: req.params.submissionId },
        include: [{ model: Assignment, as: 'assignment', where: { created_by: req.user.id } }],
      });
      if (!submission) return ApiResponse.error(res, 'Submission not found', 404);
      if (submission.auto_graded) return ApiResponse.error(res, 'This submission was auto-graded from a linked test', 403);
      if (score === undefined || score === null) return ApiResponse.error(res, 'Score is required', 400);
      await submission.update({ score, feedback, status: 'graded', graded_at: new Date() });

      // Notify student their assignment was graded
      NotificationsController.createNotification({
        user_id: submission.student_id,
        type: 'assignment_graded',
        title: 'Assignment Graded',
        message: `Your submission for "${submission.assignment.title}" has been graded. Score: ${score}/${submission.assignment.max_score}.`,
        link: `/my-assignments`,
        priority: 'normal',
      }).catch(() => {});

      await ActivityController.logFromRequest(req, 'assignment_grade', 'assignment', submission.assignment_id, {
        student_id: submission.student_id, title: submission.assignment.title, score,
      }).catch(() => {});
      return ApiResponse.success(res, { submission }, 'Submission graded');
    } catch (err) { next(err); }
  }

  // ── Student: view and submit assignments ──────────────────────────────────

  // GET /api/courses/:courseId/assignments
  static async getStudentAssignments(req, res, next) {
    try {
      const { courseId } = req.params;
      const enrollment = await Enrollment.findOne({ where: { student_id: req.user.id, course_id: courseId } });
      if (!enrollment) return ApiResponse.error(res, 'Not enrolled', 403);

      const assignments = await Assignment.findAll({
        where: { course_id: courseId },
        include: [
          { model: ModuleContent, as: 'content', attributes: ['id', 'title'] },
          {
            model: AssignmentSubmission, as: 'submissions',
            where: { student_id: req.user.id },
            required: false,
          },
        ],
        order: [['due_date', 'ASC'], ['created_at', 'DESC']],
      });
      return ApiResponse.success(res, { assignments });
    } catch (err) { next(err); }
  }

  // POST /api/assignments/:id/submit
  static async submitAssignment(req, res, next) {
    try {
      const { id } = req.params;
      const { text_content, file_url, file_name, link_url } = req.body;

      const assignment = await Assignment.findByPk(id);
      if (!assignment) return ApiResponse.error(res, 'Assignment not found', 404);

      // Test-linked assignments aren't submitted through this endpoint —
      // their score is filled by the test-completion hook.
      if (assignment.linked_test_id) {
        return ApiResponse.error(res, 'This assignment is a test. Take the linked test instead.', 400);
      }

      const enrollment = await Enrollment.findOne({ where: { student_id: req.user.id, course_id: assignment.course_id } });
      if (!enrollment) return ApiResponse.error(res, 'Not enrolled in this course', 403);

      const existing = await AssignmentSubmission.findOne({ where: { assignment_id: id, student_id: req.user.id } });
      if (existing) return ApiResponse.error(res, 'Already submitted. Use update endpoint.', 409);

      const linkProvided = !!(link_url && link_url.trim());
      if (linkProvided && !isValidHttpUrl(link_url)) {
        return ApiResponse.error(res, 'link_url must be a valid http(s) URL', 400);
      }
      if (!text_content?.trim() && !file_url && !linkProvided) {
        return ApiResponse.error(res, 'Provide text, file, or link', 400);
      }

      const isLate = assignment.due_date && new Date() > new Date(assignment.due_date);
      const submission = await AssignmentSubmission.create({
        assignment_id: id,
        student_id: req.user.id,
        text_content,
        file_url,
        file_name,
        link_url: linkProvided ? link_url.trim() : null,
        status: isLate ? 'late' : 'submitted',
      });

      // Notify instructor a new submission came in
      NotificationsController.createNotification({
        user_id: assignment.created_by,
        type: 'assignment_submitted',
        title: 'New Assignment Submission',
        message: `${req.user.full_name} submitted "${assignment.title}"${isLate ? ' (late)' : ''}.`,
        link: `/instructor/courses/${assignment.course_id}/assignments`,
        priority: 'normal',
      }).catch(() => {});

      await ActivityController.logFromRequest(req, 'assignment_submit', 'assignment', assignment.id, {
        title: assignment.title, course_id: assignment.course_id, late: isLate,
      }).catch(() => {});
      return ApiResponse.success(res, { submission }, 'Assignment submitted', 201);
    } catch (err) { next(err); }
  }

  // GET /api/student/assignments - all assignments across all enrolled courses
  static async getAllStudentAssignments(req, res, next) {
    try {
      const enrollments = await Enrollment.findAll({
        where: { student_id: req.user.id },
        attributes: ['course_id'],
      });
      const courseIds = enrollments.map((e) => e.course_id);
      if (courseIds.length === 0) return ApiResponse.success(res, { assignments: [] });

      const assignments = await Assignment.findAll({
        where: { course_id: { [Op.in]: courseIds } },
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title'] },
          { model: ModuleContent, as: 'content', attributes: ['id', 'title'] },
          {
            model: AssignmentSubmission, as: 'submissions',
            where: { student_id: req.user.id },
            required: false,
          },
        ],
        order: [['due_date', 'ASC'], ['created_at', 'DESC']],
      });
      return ApiResponse.success(res, { assignments });
    } catch (err) { next(err); }
  }

  // PUT /api/assignments/:id/submit  (update submission before grading)
  static async updateSubmission(req, res, next) {
    try {
      const submission = await AssignmentSubmission.findOne({
        where: { assignment_id: req.params.id, student_id: req.user.id },
      });
      if (!submission) return ApiResponse.error(res, 'No submission found', 404);
      if (submission.status === 'graded') return ApiResponse.error(res, 'Already graded, cannot update', 403);
      if (submission.auto_graded) return ApiResponse.error(res, 'Test-linked submissions are auto-graded and cannot be edited', 403);
      const { text_content, file_url, file_name, link_url } = req.body;
      if (link_url && !isValidHttpUrl(link_url)) {
        return ApiResponse.error(res, 'link_url must be a valid http(s) URL', 400);
      }
      await submission.update({
        text_content,
        file_url,
        file_name,
        link_url: link_url !== undefined ? (link_url ? link_url.trim() : null) : submission.link_url,
      });
      return ApiResponse.success(res, { submission });
    } catch (err) { next(err); }
  }
}

module.exports = AssignmentsController;
