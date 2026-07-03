const {
  PracticeTestAttempt,
  PracticeTestQuestion,
  PracticeTestAnswer,
  QuestionBank,
  Category,
  User,
  Course,
  Enrollment,
  CourseInstructor,
} = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, BadRequestError, ForbiddenError } = require('../../utils/errors');
const { Op } = require('sequelize');
const { sequelize } = require('../../config/database');
const BadgesController = require('../badges/badgesController');

class PracticeTestController {
  // Generate a new practice test
  static async generatePracticeTest(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const {
        categories = [],
        courses = [],
        difficulty,
        question_count = 50,
        time_limit_minutes,
      } = req.body;

      // Questions are course content, gated like lessons: students draw
      // only from courses they're enrolled in; instructors from courses
      // they teach (lead or roster). A category filter narrows WITHIN
      // that set — it never widens access. Server-side because client
      // checks are cosmetic.
      let allowedCourseIds;
      if (req.user.role === 'instructor') {
        const [owned, roster] = await Promise.all([
          Course.findAll({ where: { instructor_id: req.user.id }, attributes: ['id'], raw: true }),
          CourseInstructor.findAll({ where: { user_id: req.user.id }, attributes: ['course_id'], raw: true }),
        ]);
        allowedCourseIds = [...new Set([...owned.map((c) => c.id), ...roster.map((r) => r.course_id)])];
      } else {
        const enrollments = await Enrollment.findAll({
          where: { student_id: req.user.id },
          attributes: ['course_id'],
          raw: true,
        });
        allowedCourseIds = [...new Set(enrollments.map((e) => e.course_id))];
      }
      if (allowedCourseIds.length === 0) {
        throw new ForbiddenError('Enroll in a course to generate practice tests from its question bank');
      }

      // No explicit selection = every enrolled course. Selections outside
      // the allowed set are dropped; picking ONLY forbidden courses errors.
      const requestedCourseIds = courses.length > 0
        ? courses.map(Number).filter((id) => allowedCourseIds.includes(id))
        : allowedCourseIds;
      if (courses.length > 0 && requestedCourseIds.length === 0) {
        throw new ForbiddenError('You can only practice questions from courses you are enrolled in');
      }

      const where = { is_approved: true, course_id: { [Op.in]: requestedCourseIds } };
      if (categories.length > 0) where.category_id = { [Op.in]: categories };

      if (difficulty && difficulty !== 'mixed') {
        where.difficulty = difficulty;
      }

      // Get random questions
      const questions = await QuestionBank.findAll({
        where,
        order: sequelize.random(),
        limit: parseInt(question_count),
      });

      if (questions.length === 0) {
        throw new NotFoundError('No questions found matching criteria');
      }

      // Calculate total marks
      const total_marks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);

      // Create test attempt
      const attempt = await PracticeTestAttempt.create(
        {
          student_id: req.user.id,
          question_count: questions.length,
          time_limit_minutes,
          difficulty,
          categories: JSON.stringify(categories),
          total_marks,
          status: 'in_progress',
        },
        { transaction: t }
      );

      // Save questions for this attempt
      const testQuestions = questions.map((q, index) => ({
        attempt_id: attempt.id,
        question_id: q.id,
        order_index: index + 1,
      }));

      await PracticeTestQuestion.bulkCreate(testQuestions, { transaction: t });

      await t.commit();

      // Return questions without correct answers
      const questionsForTest = questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options,
        marks: q.marks || 1,
      }));

      logger.info(`Practice test generated: ${attempt.id} by student ${req.user.id}`);

      return ApiResponse.created(
        res,
        {
          attempt: {
            id: attempt.id,
            question_count: attempt.question_count,
            time_limit_minutes: attempt.time_limit_minutes,
            total_marks: attempt.total_marks,
            started_at: attempt.started_at,
          },
          questions: questionsForTest,
        },
        'Practice test generated successfully'
      );
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  // Submit practice test
  static async submitPracticeTest(req, res, next) {
    const t = await sequelize.transaction();

    try {
      const { attemptId } = req.params;
      const { answers, time_taken_seconds } = req.body;

      const attempt = await PracticeTestAttempt.findByPk(attemptId);

      if (!attempt) {
        throw new NotFoundError('Test attempt not found');
      }

      if (attempt.student_id !== req.user.id) {
        throw new BadRequestError('Unauthorized access to this test');
      }

      if (attempt.status !== 'in_progress') {
        throw new BadRequestError('Test already submitted');
      }

      // Get all questions for this attempt
      const testQuestions = await PracticeTestQuestion.findAll({
        where: { attempt_id: attemptId },
        include: [
          {
            model: QuestionBank,
            as: 'question',
          },
        ],
      });

      let totalScore = 0;
      let correctCount = 0;
      let incorrectCount = 0;

      // Grade each answer
      const gradedAnswers = [];

      for (const tq of testQuestions) {
        const studentAnswer = answers.find((a) => a.question_id === tq.question_id);
        const question = tq.question;

        // Frontend sends selected_answer; older clients sent answer. Accept both
        // — reading only .answer graded every submission 0.
        const givenAnswer = studentAnswer?.answer ?? studentAnswer?.selected_answer;
        const isCorrect = givenAnswer != null && givenAnswer === question.correct_answer;
        const marksAwarded = isCorrect ? question.marks : 0;

        if (isCorrect) correctCount++;
        else incorrectCount++;

        totalScore += marksAwarded;

        gradedAnswers.push({
          attempt_id: attemptId,
          question_id: tq.question_id,
          student_answer: givenAnswer ?? null,
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

      // Save all answers
      await PracticeTestAnswer.bulkCreate(gradedAnswers, { transaction: t });

      // Calculate percentage
      const percentage = (totalScore / attempt.total_marks) * 100;

      // Update attempt
      await attempt.update(
        {
          score: totalScore,
          percentage: percentage.toFixed(2),
          time_taken_seconds,
          status: 'completed',
          completed_at: new Date(),
        },
        { transaction: t }
      );

      await t.commit();

      logger.info(`Practice test submitted: ${attemptId} - Score: ${totalScore}/${attempt.total_marks}`);

      // Badge checks (fire-and-forget)
      const passed = percentage >= 50; // practice tests use 50% as pass threshold
      if (passed) {
        BadgesController.checkAndAward(req.user.id, 'test_pass').catch(() => {});
        if (parseFloat(percentage.toFixed(2)) === 100) {
          BadgesController.checkAndAward(req.user.id, 'score_perfect', { score: 100 }).catch(() => {});
        }
      }

      return ApiResponse.success(
        res,
        {
          results: {
            attempt_id: attemptId,
            score: totalScore,
            total_marks: attempt.total_marks,
            percentage: parseFloat(percentage.toFixed(2)),
            correct_count: correctCount,
            incorrect_count: incorrectCount,
            time_taken_seconds,
            completed_at: attempt.completed_at,
          },
        },
        'Test submitted successfully'
      );
    } catch (error) {
      await t.rollback();
      next(error);
    }
  }

  // Get test results
  static async getTestResults(req, res, next) {
    try {
      const { attemptId } = req.params;

      const attempt = await PracticeTestAttempt.findByPk(attemptId, {
        include: [
          {
            model: PracticeTestAnswer,
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

      if (attempt.student_id !== req.user.id) {
        throw new BadRequestError('Unauthorized access to these results');
      }

      if (attempt.status !== 'completed') {
        throw new BadRequestError('Test not yet completed');
      }

      // Format results with questions and answers
      const questionsWithAnswers = attempt.answers.map((answer) => ({
        id: answer.question.id,
        question_text: answer.question.question_text,
        question_type: answer.question.question_type,
        options: answer.question.options,
        correct_answer: answer.question.correct_answer,
        explanation: answer.question.explanation,
        student_answer: answer.student_answer,
        is_correct: answer.is_correct,
        marks_awarded: answer.marks_awarded,
      }));

      return ApiResponse.success(res, {
        results: {
          attempt_id: attempt.id,
          score: attempt.score,
          total_marks: attempt.total_marks,
          percentage: parseFloat(attempt.percentage),
          time_taken_seconds: attempt.time_taken_seconds,
          completed_at: attempt.completed_at,
        },
        questions: questionsWithAnswers,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get test history
  static async getTestHistory(req, res, next) {
    try {
      const { page = 1, limit = 10 } = req.query;
      const offset = (page - 1) * limit;

      const { count, rows } = await PracticeTestAttempt.findAndCountAll({
        where: {
          student_id: req.user.id,
          status: 'completed',
        },
        attributes: [
          'id',
          'question_count',
          'difficulty',
          'categories',
          'score',
          'total_marks',
          'percentage',
          'time_taken_seconds',
          'completed_at',
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['completed_at', 'DESC']],
      });

      // Calculate stats
      const stats = {
        totalAttempts: count,
        averageScore: 0,
        bestScore: 0,
        totalQuestionsAnswered: 0,
      };

      if (rows.length > 0) {
        stats.averageScore = rows.reduce((sum, r) => sum + parseFloat(r.percentage), 0) / rows.length;
        stats.bestScore = Math.max(...rows.map((r) => parseFloat(r.percentage)));
        stats.totalQuestionsAnswered = rows.reduce((sum, r) => sum + r.question_count, 0);
      }

      return ApiResponse.success(res, {
        attempts: rows,
        stats,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: parseInt(limit),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get ongoing test
  static async getOngoingTest(req, res, next) {
    try {
      const { attemptId } = req.params;

      const attempt = await PracticeTestAttempt.findByPk(attemptId, {
        include: [
          {
            model: PracticeTestQuestion,
            as: 'test_questions',
            include: [
              {
                model: QuestionBank,
                as: 'question',
                attributes: ['id', 'question_text', 'question_type', 'options', 'marks'],
              },
            ],
          },
        ],
      });

      if (!attempt) {
        throw new NotFoundError('Test attempt not found');
      }

      if (attempt.student_id !== req.user.id) {
        throw new BadRequestError('Unauthorized access to this test');
      }

      if (attempt.status !== 'in_progress') {
        throw new BadRequestError('Test is not in progress');
      }

      const questions = attempt.test_questions.map((tq) => ({
        id: tq.question.id,
        question_text: tq.question.question_text,
        question_type: tq.question.question_type,
        options: tq.question.options,
        marks: tq.question.marks,
      }));

      return ApiResponse.success(res, {
        attempt: {
          id: attempt.id,
          question_count: attempt.question_count,
          time_limit_minutes: attempt.time_limit_minutes,
          total_marks: attempt.total_marks,
          started_at: attempt.started_at,
        },
        questions,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = PracticeTestController;
