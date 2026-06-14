const {
  AssignedTest,
  AssignedTestQuestion,
  TestAssignment,
  AssignedTestAttempt,
  AssignedTestAnswer,
  QuestionBank,
  User,
  Course,
  Category,
  Enrollment,
} = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const NotificationsController = require('../notifications/notificationsController');
const ActivityController = require('../activity/activityController');
const BadgesController = require('../badges/badgesController');

class AssignedTestController {
  // Create assigned test (instructor/admin)
  static async createAssignedTest(req, res, next) {
    try {
      const {
        test_name,
        test_code,
        description,
        course_id,
        total_questions,
        time_limit_minutes,
        passing_score,
        start_date,
        end_date,
        show_results_immediately,
        show_correct_answers,
        show_explanations,
        allow_retake,
        max_attempts,
        randomize_questions,
        randomize_options,
        status,
      } = req.body;

      // Check if test code already exists
      const existingTest = await AssignedTest.findOne({ where: { test_code } });
      if (existingTest) {
        throw new BadRequestError('Test code already exists');
      }

      const test = await AssignedTest.create({
        test_name,
        test_code,
        description,
        instructor_id: req.user.id,
        course_id,
        // Default to 0 — the real count is written by addQuestionsToTest in
        // the next call. Without this default the NOT NULL constraint on
        // total_questions blows up as a generic "Validation failed" toast
        // when the admin clicks Publish on a freshly-built test.
        total_questions: total_questions ?? 0,
        total_marks: 0, // Will be calculated when questions are added
        time_limit_minutes,
        passing_score: passing_score || 70,
        start_date,
        end_date,
        show_results_immediately: show_results_immediately !== false,
        show_correct_answers: show_correct_answers !== false,
        show_explanations: show_explanations !== false,
        allow_retake: allow_retake || false,
        max_attempts: max_attempts || 1,
        randomize_questions: randomize_questions !== false,
        randomize_options: randomize_options !== false,
        status: status || 'draft',
      });

      logger.info(`Assigned test created: ${test_name} by ${req.user.email}`);

      return ApiResponse.created(res, { test }, 'Test created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Add questions to assigned test
  static async addQuestionsToTest(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { testId } = req.params;
      const { question_ids } = req.body;

      if (!Array.isArray(question_ids) || question_ids.length === 0) {
        throw new BadRequestError('Question IDs array is required');
      }

      const test = await AssignedTest.findByPk(testId);
      if (!test) {
        throw new NotFoundError('Test not found');
      }

      // Check ownership
      if (test.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only add questions to your own tests');
      }

      // Get questions
      const questions = await QuestionBank.findAll({
        where: { id: { [Op.in]: question_ids } },
      });

      if (questions.length !== question_ids.length) {
        throw new NotFoundError('Some questions not found');
      }

      // Calculate total marks
      const total_marks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

      // Delete existing questions for this test
      await AssignedTestQuestion.destroy({ where: { test_id: testId }, transaction: t });

      // Add new questions
      const testQuestions = question_ids.map((qid, index) => ({
        test_id: testId,
        question_id: qid,
        order_index: index + 1,
      }));

      await AssignedTestQuestion.bulkCreate(testQuestions, { transaction: t });

      // Update test
      await test.update(
        {
          total_questions: questions.length,
          total_marks,
        },
        { transaction: t }
      );

      await t.commit();

      logger.info(`Questions added to test ${testId}: ${questions.length} questions`);

      return ApiResponse.success(res, { test }, `${questions.length} questions added successfully`);
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  // Assign test to students
  static async assignTestToStudents(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { testId } = req.params;
      const { student_ids, assign_to, course_id, due_date } = req.body;

      const test = await AssignedTest.findByPk(testId);
      if (!test) {
        throw new NotFoundError('Test not found');
      }

      // Check ownership
      if (test.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only assign your own tests');
      }

      if (test.status !== 'published') {
        throw new BadRequestError('Only published tests can be assigned');
      }

      let studentsToAssign = [];

      if (assign_to === 'all_course_students' && course_id) {
        // Get all students enrolled in the course
        const { Enrollment } = require('../../models');
        const enrollments = await Enrollment.findAll({
          where: { course_id },
          attributes: ['student_id'],
        });
        studentsToAssign = enrollments.map((e) => e.student_id);
      } else if (student_ids && Array.isArray(student_ids)) {
        studentsToAssign = student_ids;
      } else {
        throw new BadRequestError('Either student_ids or assign_to with course_id is required');
      }

      if (studentsToAssign.length === 0) {
        throw new BadRequestError('No students to assign');
      }

      // Create assignments
      const assignments = studentsToAssign.map((student_id) => ({
        test_id: testId,
        student_id,
        due_date,
        status: 'pending',
      }));

      // Use upsert logic to prevent duplicates
      const createdAssignments = [];
      for (const assignment of assignments) {
        const [created, wasCreated] = await TestAssignment.findOrCreate({
          where: {
            test_id: assignment.test_id,
            student_id: assignment.student_id,
          },
          defaults: assignment,
          transaction: t,
        });
        if (wasCreated) createdAssignments.push(created);
      }

      await t.commit();

      // Create notifications for assigned students
      if (createdAssignments.length > 0) {
        const notifications = createdAssignments.map((assignment) => ({
          user_id: assignment.student_id,
          type: 'test_assignment',
          title: 'New Test Assigned',
          message: `You have been assigned a new test: "${test.test_name}"`,
          link: `/tests/${test.id}`,
          priority: 'normal',
        }));

        await NotificationsController.createBulkNotifications(notifications);
      }

      logger.info(`Test ${testId} assigned to ${createdAssignments.length} students`);

      return ApiResponse.success(
        res,
        {
          assignedCount: createdAssignments.length,
          assignments: createdAssignments,
        },
        `Test assigned to ${createdAssignments.length} students`
      );
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  // Get my assigned tests (student) — legacy route
  static async getMyAssignments(req, res, next) {
    return AssignedTestController.getStudentTests(req, res, next);
  }

  // Get all tests assigned to the logged-in student (test-centric view)
  static async getStudentTests(req, res, next) {
    try {
      const assignments = await TestAssignment.findAll({
        where: { student_id: req.user.id },
        include: [
          {
            model: AssignedTest,
            as: 'test',
            where: { status: 'published' },
            include: [
              { model: User, as: 'instructor', attributes: ['id', 'full_name'] },
              { model: Course, as: 'course', attributes: ['id', 'title'] },
            ],
          },
          {
            model: AssignedTestAttempt,
            as: 'attempts',
            separate: true,
            order: [['started_at', 'DESC']],
          },
        ],
        order: [['assigned_date', 'DESC']],
      });

      // Shape response as test-centric for the frontend
      const tests = assignments.map((a) => ({
        id: a.test.id,
        assignment_id: a.id,
        test_name: a.test.test_name,
        description: a.test.description,
        course: a.test.course,
        instructor: a.test.instructor,
        time_limit_minutes: a.test.time_limit_minutes,
        passing_score: a.test.passing_score,
        max_attempts: a.test.max_attempts,
        allow_retake: a.test.allow_retake,
        start_date: a.test.start_date,
        end_date: a.test.end_date,
        due_date: a.due_date,
        status: a.status,
        assigned_date: a.assigned_date,
        attempts: a.attempts || [],
      }));

      return ApiResponse.success(res, { tests });
    } catch (error) {
      next(error);
    }
  }

  // Get a single test (student view)
  static async getStudentTest(req, res, next) {
    try {
      const { testId } = req.params;

      const assignment = await TestAssignment.findOne({
        where: { student_id: req.user.id, test_id: testId },
        include: [
          {
            model: AssignedTest,
            as: 'test',
            include: [
              { model: User, as: 'instructor', attributes: ['id', 'full_name'] },
              { model: Course, as: 'course', attributes: ['id', 'title'] },
            ],
          },
          {
            model: AssignedTestAttempt,
            as: 'attempts',
            separate: true,
            order: [['started_at', 'DESC']],
          },
        ],
      });

      if (!assignment) throw new NotFoundError('Test not found or not assigned to you');

      return ApiResponse.success(res, {
        test: {
          ...assignment.test.toJSON(),
          assignment_id: assignment.id,
          due_date: assignment.due_date,
          assignment_status: assignment.status,
          attempts: assignment.attempts,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get student attempt details
  static async getStudentAttempt(req, res, next) {
    try {
      const { attemptId } = req.params;

      const attempt = await AssignedTestAttempt.findByPk(attemptId, {
        include: [{ model: AssignedTest, as: 'test' }],
      });

      if (!attempt) throw new NotFoundError('Attempt not found');
      if (attempt.student_id !== req.user.id) throw new ForbiddenError('Unauthorized');

      return ApiResponse.success(res, { attempt });
    } catch (error) {
      next(error);
    }
  }

  // Start a test by testId (student) — finds assignment automatically
  static async startTestByTestId(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const { testId } = req.params;

      const assignment = await TestAssignment.findOne({
        where: { student_id: req.user.id, test_id: testId },
        include: [
          {
            model: AssignedTest,
            as: 'test',
            include: [
              {
                model: AssignedTestQuestion,
                as: 'test_questions',
                include: [{ model: QuestionBank, as: 'question' }],
                separate: true,
                order: [['order_index', 'ASC']],
              },
            ],
          },
          { model: AssignedTestAttempt, as: 'attempts', separate: true },
        ],
      });

      if (!assignment) throw new NotFoundError('Test not assigned to you');

      const test = assignment.test;

      if (test.start_date && new Date() < new Date(test.start_date))
        throw new BadRequestError('Test has not started yet');
      if (test.end_date && new Date() > new Date(test.end_date))
        throw new BadRequestError('Test has ended');

      const attemptCount = assignment.attempts.length;
      if (!test.allow_retake && attemptCount > 0)
        throw new BadRequestError('You have already attempted this test');
      if (attemptCount >= test.max_attempts)
        throw new BadRequestError(`Maximum attempts (${test.max_attempts}) reached`);

      const attempt = await AssignedTestAttempt.create(
        {
          assignment_id: assignment.id,
          student_id: req.user.id,
          test_id: test.id,
          attempt_number: attemptCount + 1,
          total_marks: test.total_marks,
        },
        { transaction: t }
      );

      await assignment.update({ status: 'in_progress' }, { transaction: t });
      await t.commit();

      let questions = test.test_questions.map((tq) => tq.question);
      if (test.randomize_questions) questions = questions.sort(() => Math.random() - 0.5);

      const questionsForTest = questions.map((q) => {
        let options = q.options;
        if (test.randomize_options && options) options = [...options].sort(() => Math.random() - 0.5);
        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options,
          marks: q.marks || 1,
        };
      });

      return ApiResponse.success(res, {
        attempt: { id: attempt.id, assignment_id: assignment.id, test_id: test.id, attempt_number: attempt.attempt_number, started_at: attempt.started_at },
        test: { test_name: test.test_name, description: test.description, total_questions: test.total_questions, total_marks: test.total_marks, time_limit_minutes: test.time_limit_minutes, passing_score: test.passing_score },
        questions: questionsForTest,
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  // Start assigned test (student)
  static async startAssignedTest(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { assignmentId } = req.params;

      const assignment = await TestAssignment.findByPk(assignmentId, {
        include: [
          {
            model: AssignedTest,
            as: 'test',
            include: [
              {
                model: AssignedTestQuestion,
                as: 'test_questions',
                include: [{ model: QuestionBank, as: 'question' }],
              },
            ],
          },
          {
            model: AssignedTestAttempt,
            as: 'attempts',
          },
        ],
      });

      if (!assignment) {
        throw new NotFoundError('Assignment not found');
      }

      if (assignment.student_id !== req.user.id) {
        throw new ForbiddenError('Unauthorized access to this assignment');
      }

      const test = assignment.test;

      // Check if test has started
      if (test.start_date && new Date() < new Date(test.start_date)) {
        throw new BadRequestError('Test has not started yet');
      }

      // Check if test has ended
      if (test.end_date && new Date() > new Date(test.end_date)) {
        throw new BadRequestError('Test has ended');
      }

      // Check attempt limit
      const attemptCount = assignment.attempts.length;
      if (!test.allow_retake && attemptCount > 0) {
        throw new BadRequestError('You have already attempted this test');
      }

      if (attemptCount >= test.max_attempts) {
        throw new BadRequestError(`Maximum attempts (${test.max_attempts}) reached`);
      }

      // Create new attempt
      const attempt = await AssignedTestAttempt.create(
        {
          assignment_id: assignmentId,
          student_id: req.user.id,
          test_id: test.id,
          attempt_number: attemptCount + 1,
          total_marks: test.total_marks,
        },
        { transaction: t }
      );

      // Update assignment status
      await assignment.update({ status: 'in_progress' }, { transaction: t });

      await t.commit();

      // Get questions (randomize if needed)
      let questions = test.test_questions.map((tq) => tq.question);

      if (test.randomize_questions) {
        questions = questions.sort(() => Math.random() - 0.5);
      }

      // Randomize options if needed
      const questionsForTest = questions.map((q) => {
        let options = q.options;
        if (test.randomize_options && options) {
          options = [...options].sort(() => Math.random() - 0.5);
        }

        return {
          id: q.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options,
          marks: q.marks || 1,
        };
      });

      logger.info(`Student ${req.user.id} started test ${test.id} - Attempt ${attempt.attempt_number}`);

      return ApiResponse.success(res, {
        attempt: {
          id: attempt.id,
          assignment_id: assignmentId,
          test_id: test.id,
          attempt_number: attempt.attempt_number,
          started_at: attempt.started_at,
        },
        test: {
          test_name: test.test_name,
          description: test.description,
          total_questions: test.total_questions,
          total_marks: test.total_marks,
          time_limit_minutes: test.time_limit_minutes,
          passing_score: test.passing_score,
        },
        questions: questionsForTest,
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  // Submit assigned test (student)
  static async submitAssignedTest(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { attemptId } = req.params;
      const { answers, time_taken_seconds } = req.body;

      const attempt = await AssignedTestAttempt.findByPk(attemptId, {
        include: [
          {
            model: AssignedTest,
            as: 'test',
            include: [
              {
                model: AssignedTestQuestion,
                as: 'test_questions',
                include: [{ model: QuestionBank, as: 'question' }],
              },
            ],
          },
          {
            model: TestAssignment,
            as: 'assignment',
          },
        ],
      });

      if (!attempt) {
        throw new NotFoundError('Test attempt not found');
      }

      if (attempt.student_id !== req.user.id) {
        throw new ForbiddenError('Unauthorized access to this test');
      }

      if (attempt.completed_at) {
        throw new BadRequestError('Test already submitted');
      }

      const test = attempt.test;
      let totalScore = 0;

      // Grade each answer
      const gradedAnswers = [];

      for (const tq of test.test_questions) {
        const question = tq.question;
        const studentAnswer = answers.find((a) => a.question_id === question.id);

        const isCorrect = studentAnswer && studentAnswer.answer === question.correct_answer;
        const marksAwarded = isCorrect ? question.marks : 0;

        totalScore += marksAwarded;

        gradedAnswers.push({
          attempt_id: attemptId,
          question_id: question.id,
          student_answer: studentAnswer?.answer || null,
          is_correct: isCorrect,
          marks_awarded: marksAwarded,
        });

        // Update question statistics
        await question.increment('times_used', { transaction: t });
        if (isCorrect) {
          await question.increment('times_correct', { transaction: t });
        } else {
          await question.increment('times_incorrect', { transaction: t });
        }
      }

      // Save answers
      await AssignedTestAnswer.bulkCreate(gradedAnswers, { transaction: t });

      // Calculate percentage and pass status
      const percentage = (totalScore / test.total_marks) * 100;
      const passed = percentage >= test.passing_score;

      // Update attempt
      await attempt.update(
        {
          score: totalScore,
          percentage: percentage.toFixed(2),
          passed,
          time_taken_seconds,
          completed_at: new Date(),
        },
        { transaction: t }
      );

      // Update assignment status
      await attempt.assignment.update({ status: 'completed' }, { transaction: t });

      await t.commit();

      logger.info(`Test ${test.id} submitted by student ${req.user.id} - Score: ${totalScore}/${test.total_marks}`);

      // Check and award badges (fire-and-forget)
      if (passed) {
        BadgesController.checkAndAward(req.user.id, 'test_pass').catch(() => {});
        if (parseFloat(percentage.toFixed(2)) === 100) {
          BadgesController.checkAndAward(req.user.id, 'score_perfect', { score: 100 }).catch(() => {});
        }
      }

      // Notify student of their result
      NotificationsController.createNotification({
        user_id: req.user.id,
        type: 'test_result',
        title: passed ? 'Test Passed!' : 'Test Submitted',
        message: passed
          ? `You passed "${test.test_name}" with ${parseFloat(percentage.toFixed(1))}%. Well done!`
          : `You scored ${parseFloat(percentage.toFixed(1))}% on "${test.test_name}". The passing score is ${test.passing_score}%.`,
        link: `/tests/${test.id}/results`,
        priority: 'normal',
      }).catch(() => {});

      return ApiResponse.success(res, {
        results: {
          attempt_id: attemptId,
          score: totalScore,
          total_marks: test.total_marks,
          percentage: parseFloat(percentage.toFixed(2)),
          passed,
          passing_score: test.passing_score,
          time_taken_seconds,
          completed_at: attempt.completed_at,
        },
      });
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  // Get assigned test results
  static async getAssignedTestResults(req, res, next) {
    try {
      const { attemptId } = req.params;

      const attempt = await AssignedTestAttempt.findByPk(attemptId, {
        include: [
          {
            model: AssignedTest,
            as: 'test',
          },
          {
            model: AssignedTestAnswer,
            as: 'answers',
            include: [
              {
                model: QuestionBank,
                as: 'question',
              },
            ],
          },
        ],
      });

      if (!attempt) {
        throw new NotFoundError('Test attempt not found');
      }

      // Check if student can view results
      if (attempt.student_id !== req.user.id && !['instructor', 'admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Unauthorized access to these results');
      }

      if (!attempt.completed_at) {
        throw new BadRequestError('Test not yet completed');
      }

      const test = attempt.test;

      // Check if results should be shown immediately
      if (!test.show_results_immediately && attempt.student_id === req.user.id) {
        return ApiResponse.success(res, {
          message: 'Test submitted successfully. Results will be available later.',
          results: {
            score: attempt.score,
            total_marks: attempt.total_marks,
            percentage: parseFloat(attempt.percentage),
            passed: attempt.passed,
          },
        });
      }

      // Format results with questions and answers
      const isAdmin = ['instructor', 'admin', 'super_admin'].includes(req.user.role);
      const questionsWithAnswers = attempt.answers.map((answer) => ({
        id: answer.question.id,
        question_text: answer.question.question_text,
        question_type: answer.question.question_type,
        options: answer.question.options,
        correct_answer: (isAdmin || test.show_correct_answers) ? answer.question.correct_answer : undefined,
        explanation: (isAdmin || test.show_explanations) ? answer.question.explanation : undefined,
        student_answer: answer.student_answer,
        is_correct: answer.is_correct,
        marks_awarded: answer.marks_awarded,
      }));

      return ApiResponse.success(res, {
        results: {
          attempt_id: attempt.id,
          test_name: test.test_name,
          score: attempt.score,
          total_marks: attempt.total_marks,
          percentage: parseFloat(attempt.percentage),
          passed: attempt.passed,
          passing_score: test.passing_score,
          time_taken_seconds: attempt.time_taken_seconds,
          completed_at: attempt.completed_at,
        },
        questions: questionsWithAnswers,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get all tests created by instructor
  static async getInstructorTests(req, res, next) {
    try {
      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const where = isAdmin ? {} : { instructor_id: req.user.id };

      const { status, course_id, search } = req.query;
      if (status && status !== 'all') where.status = status;
      if (course_id) where.course_id = course_id;
      if (search) where.test_name = { [Op.iLike]: `%${search}%` };

      const rows = await AssignedTest.findAll({
        where,
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title'] },
          { model: User, as: 'instructor', attributes: ['id', 'full_name'] },
        ],
        order: [['created_at', 'DESC']],
      });

      // Attach question + student counts so the list view doesn't show 0 for
      // every test (Questions / Students columns on /tests). Also return the
      // course's enrollment count — a published test with assign_to:'all'
      // can be taken by every enrolled student, so showing only the
      // TestAssignment rows undersells the real reach.
      const tests = await Promise.all(
        rows.map(async (t) => {
          const plain = t.toJSON();
          const [questionCount, assignedCount, enrolledCount] = await Promise.all([
            AssignedTestQuestion.count({ where: { test_id: t.id } }),
            TestAssignment.count({ where: { test_id: t.id } }),
            t.course_id
              ? Enrollment.count({ where: { course_id: t.course_id } }).catch(() => 0)
              : Promise.resolve(0),
          ]);
          plain.question_count = questionCount;
          plain.assigned_students_count = assignedCount;
          plain.enrolled_students_count = enrolledCount;
          // Frontend list reads `test.title` and `test.due_date` — alias the
          // model's actual column names so the table doesn't render blank.
          plain.title = plain.test_name;
          plain.due_date = plain.end_date;
          return plain;
        })
      );

      return ApiResponse.success(res, { tests });
    } catch (error) {
      next(error);
    }
  }

  // Get test by ID (with stats for instructor)
  static async getTestById(req, res, next) {
    try {
      const { testId } = req.params;

      const test = await AssignedTest.findByPk(testId, {
        include: [
          { model: User, as: 'instructor', attributes: ['id', 'full_name'] },
          { model: Course, as: 'course', attributes: ['id', 'title'] },
          {
            model: AssignedTestQuestion,
            as: 'test_questions',
            include: [{ model: QuestionBank, as: 'question' }],
          },
        ],
      });

      if (!test) {
        throw new NotFoundError('Test not found');
      }

      return ApiResponse.success(res, { test });
    } catch (error) {
      next(error);
    }
  }

  // Publish test + assign to students
  static async publishTest(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const { testId } = req.params;
      const { assign_to, student_ids, due_date } = req.body; // assign_to: 'all' | 'selected'

      const test = await AssignedTest.findByPk(testId);
      if (!test) throw new NotFoundError('Test not found');

      if (test.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role))
        throw new ForbiddenError('You can only publish your own tests');

      if (test.status === 'published') throw new BadRequestError('Test is already published');

      await test.update({ status: 'published' }, { transaction: t });

      let studentsToAssign = [];

      if (assign_to === 'all' && test.course_id) {
        const { Enrollment } = require('../../models');
        const enrollments = await Enrollment.findAll({
          where: { course_id: test.course_id },
          attributes: ['student_id'],
        });
        studentsToAssign = enrollments.map((e) => e.student_id);
      } else if (assign_to === 'selected' && Array.isArray(student_ids)) {
        studentsToAssign = student_ids;
      }

      const newAssignments = [];
      for (const student_id of studentsToAssign) {
        const [assignment, created] = await TestAssignment.findOrCreate({
          where: { test_id: test.id, student_id },
          defaults: { test_id: test.id, student_id, due_date: due_date || null, status: 'pending' },
          transaction: t,
        });
        if (created) newAssignments.push(assignment);
      }

      await t.commit();

      if (newAssignments.length > 0) {
        const notifications = newAssignments.map((a) => ({
          user_id: a.student_id,
          type: 'test_assignment',
          title: 'New Test Assigned',
          message: `You have been assigned a new test: "${test.test_name}"`,
          link: `/my-assigned-tests`,
          priority: 'normal',
        }));
        await NotificationsController.createBulkNotifications(notifications);
      }

      logger.info(`Test ${testId} published and assigned to ${newAssignments.length} students`);

      return ApiResponse.success(res, { test, assignedCount: newAssignments.length }, `Test published and assigned to ${newAssignments.length} students`);
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  // Archive test
  static async archiveTest(req, res, next) {
    try {
      const { testId } = req.params;

      const test = await AssignedTest.findByPk(testId);
      if (!test) throw new NotFoundError('Test not found');

      if (test.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role))
        throw new ForbiddenError('You can only archive your own tests');

      await test.update({ status: 'archived' });
      return ApiResponse.success(res, { test }, 'Test archived successfully');
    } catch (error) {
      next(error);
    }
  }

  // Update test
  static async updateTest(req, res, next) {
    try {
      const { testId } = req.params;
      const updates = req.body;

      const test = await AssignedTest.findByPk(testId);

      if (!test) {
        throw new NotFoundError('Test not found');
      }

      // Check ownership
      if (test.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only update your own tests');
      }

      await test.update(updates);

      logger.info(`Test updated: ${test.test_name}`);

      return ApiResponse.success(res, { test }, 'Test updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete test
  static async deleteTest(req, res, next) {
    try {
      const { testId } = req.params;

      const test = await AssignedTest.findByPk(testId);

      if (!test) {
        throw new NotFoundError('Test not found');
      }

      // Check ownership
      if (test.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only delete your own tests');
      }

      // Soft delete - archive instead
      await test.update({ status: 'archived' });

      logger.info(`Test archived: ${test.test_name}`);

      return ApiResponse.success(res, null, 'Test deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AssignedTestController;
