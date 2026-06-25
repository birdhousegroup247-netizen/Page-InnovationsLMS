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

/**
 * Broadcast a "new assignment posted" notification to every student
 * enrolled in the course. Used on initial publish (create-with-publish
 * or draft → published transition). Fire-and-forget; logs and
 * swallows failures so nothing here can block the parent request.
 */
async function notifyEnrolledStudentsOfAssignment(assignment) {
  try {
    const [course, enrollments] = await Promise.all([
      Course.findByPk(assignment.course_id, { attributes: ['title'] }),
      Enrollment.findAll({
        where: { course_id: assignment.course_id },
        attributes: ['student_id'],
        raw: true,
      }),
    ]);
    if (enrollments.length === 0) return;
    const courseLabel = course?.title ? `"${course.title}"` : `course #${assignment.course_id}`;
    const dueLine = assignment.due_date
      ? ` Due ${new Date(assignment.due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}.`
      : '';
    const notifications = enrollments.map((e) => ({
      user_id: e.student_id,
      type: 'assignment_new',
      title: 'New Assignment',
      message: `New assignment in ${courseLabel}: "${assignment.title}".${dueLine}`,
      link: '/my-assignments',
      priority: 'normal',
    }));
    await NotificationsController.createBulkNotifications(notifications);
  } catch (notifErr) {
    // eslint-disable-next-line no-console
    console.warn(`[assignment-notify] failed for assignment ${assignment.id}: ${notifErr.message}`);
  }
}

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
        is_published, allow_resubmit,
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
      // New assignments default to DRAFT (is_published=false) so an
      // instructor can prep without notifying students. Caller can
      // override by passing is_published: true to publish on create.
      const willPublish = is_published === true;
      const assignment = await Assignment.create({
        course_id: courseId,
        created_by: req.user.id,
        content_id: content_id || null,
        title: title.trim(),
        description,
        due_date: due_date || null,
        max_score: max_score || 100,
        allow_file_upload: isLinkedTest ? false : allow_file_upload !== false,
        allow_text_submission: isLinkedTest ? false : allow_text_submission !== false,
        allow_link_submission: isLinkedTest ? false : !!allow_link_submission,
        linked_test_id: linked_test_id || null,
        is_published: willPublish,
        allow_resubmit: !!allow_resubmit,
      });
      await ActivityController.logFromRequest(req, 'assignment_create', 'assignment', assignment.id, {
        title: assignment.title, course_id: parseInt(courseId),
      }).catch(() => {});

      // Only broadcast on initial publish — drafts stay quiet.
      if (willPublish) {
        notifyEnrolledStudentsOfAssignment(assignment);
      }

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
        is_published, allow_resubmit,
      } = req.body;

      if (linked_test_id !== undefined && linked_test_id) {
        const test = await AssignedTest.findByPk(linked_test_id);
        if (!test || String(test.course_id) !== String(assignment.course_id)) {
          return ApiResponse.error(res, 'Linked test must belong to this course', 400);
        }
      }

      const isLinkedTest = (linked_test_id !== undefined ? !!linked_test_id : !!assignment.linked_test_id);
      const wasDraft = !assignment.is_published;
      const goingPublic = is_published !== undefined ? !!is_published : assignment.is_published;
      const firstPublish = wasDraft && goingPublic;

      const updates = {
        title,
        description,
        due_date,
        max_score,
        allow_file_upload: isLinkedTest ? false : allow_file_upload,
        allow_text_submission: isLinkedTest ? false : allow_text_submission,
        allow_link_submission: isLinkedTest ? false : allow_link_submission,
        linked_test_id: linked_test_id !== undefined ? (linked_test_id || null) : assignment.linked_test_id,
        is_published: is_published !== undefined ? !!is_published : assignment.is_published,
        allow_resubmit: allow_resubmit !== undefined ? !!allow_resubmit : assignment.allow_resubmit,
      };

      // Pushing the due_date forward shouldn't strand a student with a
      // stale "due tomorrow" reminder. Clear the reminder flags so the
      // cron can re-arm them against the new date.
      if (due_date !== undefined && String(due_date || '') !== String(assignment.due_date || '')) {
        updates.reminder_24h_sent_at = null;
        updates.reminder_1h_sent_at  = null;
      }

      await assignment.update(updates);

      // Draft → published: same notification we send on create-with-publish.
      if (firstPublish) {
        notifyEnrolledStudentsOfAssignment(assignment);
      }
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
      const assignment = await Assignment.findOne({
        where: { id: req.params.id, created_by: req.user.id },
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title'] },
        ],
      });
      if (!assignment) return ApiResponse.error(res, 'Assignment not found', 404);

      const submissions = await AssignmentSubmission.findAll({
        where: { assignment_id: req.params.id },
        include: studentInclude,
        order: [['submitted_at', 'ASC']],
      });

      // Missing students = enrolled in this course but no submission row.
      // Cheap: one Enrollment.findAll + a Set diff against the submissions
      // we already loaded.
      const enrollments = await Enrollment.findAll({
        where: { course_id: assignment.course_id },
        include: [{ model: User, as: 'student', attributes: ['id', 'full_name', 'profile_picture'] }],
      });
      const submittedIds = new Set(submissions.map((s) => s.student_id));
      const missing_students = enrollments
        .filter((e) => !submittedIds.has(e.student_id))
        .map((e) => ({
          id: e.student?.id || e.student_id,
          full_name: e.student?.full_name || null,
          profile_picture: e.student?.profile_picture || null,
        }));

      return ApiResponse.success(res, {
        assignment,
        submissions,
        missing_students,
        enrolled_count: enrollments.length,
      });
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
        where: { course_id: courseId, is_published: true },
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
      // Draft assignments shouldn't accept submissions even if a
      // student somehow finds the URL.
      if (!assignment.is_published) return ApiResponse.error(res, 'Assignment not available', 404);

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
        where: { course_id: { [Op.in]: courseIds }, is_published: true },
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

  // PUT /api/assignments/:id/submit  (update submission before grading,
  // or resubmit after grading when the assignment allows it)
  static async updateSubmission(req, res, next) {
    try {
      const submission = await AssignmentSubmission.findOne({
        where: { assignment_id: req.params.id, student_id: req.user.id },
        include: [{ model: Assignment, as: 'assignment' }],
      });
      if (!submission) return ApiResponse.error(res, 'No submission found', 404);
      // Auto-graded (test-linked) is always locked — the score came
      // from the test, the student can't edit it from here.
      if (submission.auto_graded) return ApiResponse.error(res, 'Test-linked submissions are auto-graded and cannot be edited', 403);
      // Graded: only allowed when the instructor flagged the
      // assignment as allow_resubmit. Updating after grade clears
      // the score and re-queues for grading.
      const isGraded = submission.status === 'graded';
      if (isGraded && !submission.assignment?.allow_resubmit) {
        return ApiResponse.error(res, 'Already graded, cannot update', 403);
      }

      const { text_content, file_url, file_name, link_url } = req.body;
      if (link_url && !isValidHttpUrl(link_url)) {
        return ApiResponse.error(res, 'link_url must be a valid http(s) URL', 400);
      }

      const isLate = submission.assignment?.due_date && new Date() > new Date(submission.assignment.due_date);
      const updates = {
        text_content,
        file_url,
        file_name,
        link_url: link_url !== undefined ? (link_url ? link_url.trim() : null) : submission.link_url,
      };
      // Resubmission path: reset score/feedback/status so the
      // gradebook shows the row as needing a fresh look.
      if (isGraded) {
        updates.status = isLate ? 'late' : 'submitted';
        updates.score = null;
        updates.feedback = null;
        updates.graded_at = null;
        updates.submitted_at = new Date();

        // Tell the instructor the student took another swing at it.
        NotificationsController.createNotification({
          user_id: submission.assignment.created_by,
          type: 'assignment_resubmitted',
          title: 'Resubmission',
          message: `${req.user.full_name} resubmitted "${submission.assignment.title}".`,
          link: `/instructor/courses/${submission.assignment.course_id}/assignments-grading`,
          priority: 'normal',
        }).catch(() => {});
      }

      await submission.update(updates);
      return ApiResponse.success(res, { submission });
    } catch (err) { next(err); }
  }
}

module.exports = AssignmentsController;
