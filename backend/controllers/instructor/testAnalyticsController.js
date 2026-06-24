const { AssignedTest, AssignedTestAttempt, AssignedTestAnswer, TestAssignment, QuestionBank, User, Course, sequelize } = require('../../models');
const ApiResponse = require('../../utils/response');
const { Op } = require('sequelize');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

/**
 * Test Analytics Controller for Instructors
 * Provides comprehensive test performance analytics
 */
class TestAnalyticsController {
  /**
   * Get comprehensive analytics for a specific test
   * GET /api/instructor/tests/:testId/analytics
   */
  static async getTestAnalytics(req, res, next) {
    try {
      const { testId } = req.params;
      const instructorId = req.user.id;

      // Get test with ownership check
      const test = await AssignedTest.findByPk(testId, {
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title'] },
          { model: User, as: 'instructor', attributes: ['id', 'full_name'] }
        ]
      });

      if (!test) {
        throw new NotFoundError('Test not found');
      }

      // Allow if instructor owns test OR user is admin
      if (test.instructor_id !== instructorId &&
          req.user.role !== 'admin' &&
          req.user.role !== 'super_admin') {
        throw new ForbiddenError('You do not have access to this test');
      }

      // Get all assignments for this test
      const assignments = await TestAssignment.findAll({
        where: { test_id: testId },
        attributes: ['id', 'student_id', 'status']
      });

      // Get all attempts for this test
      const attempts = await AssignedTestAttempt.findAll({
        where: { test_id: testId },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email']
          }
        ],
        order: [['completed_at', 'DESC']]
      });

      // Calculate statistics
      const totalAssignments = assignments.length;
      const completedAttempts = attempts.filter(a => a.completed_at).length;
      const passedAttempts = attempts.filter(a => a.passed).length;
      const averageScore = completedAttempts > 0
        ? attempts.reduce((sum, a) => sum + parseFloat(a.percentage || 0), 0) / completedAttempts
        : 0;
      const averageTimeSpent = completedAttempts > 0
        ? attempts.reduce((sum, a) => sum + (a.time_taken_seconds || 0), 0) / completedAttempts
        : 0;

      // Get question-level analytics
      const questionAnalytics = await this._getQuestionAnalytics(testId);

      // Get score distribution
      const scoreDistribution = this._calculateScoreDistribution(attempts);

      // Get student performance details
      const studentPerformance = attempts.map(attempt => ({
        attempt_id: attempt.id,
        student_id: attempt.student_id,
        student_name: attempt.student?.full_name,
        student_email: attempt.student?.email,
        attempt_number: attempt.attempt_number,
        score: attempt.score,
        total_marks: attempt.total_marks,
        percentage: parseFloat(attempt.percentage || 0),
        passed: attempt.passed,
        time_spent: attempt.time_taken_seconds,
        completed_at: attempt.completed_at
      }));

      return ApiResponse.success(res, {
        test: {
          id: test.id,
          title: test.test_name,
          code: test.test_code,
          course: test.course?.title,
          total_questions: test.total_questions,
          total_marks: test.total_marks,
          passing_score: test.passing_score,
          time_limit: test.time_limit_minutes
        },
        overview: {
          total_assignments: totalAssignments,
          total_attempts: completedAttempts,
          completion_rate: totalAssignments > 0 ? (completedAttempts / totalAssignments * 100).toFixed(2) : 0,
          pass_rate: completedAttempts > 0 ? (passedAttempts / completedAttempts * 100).toFixed(2) : 0,
          average_score: averageScore.toFixed(2),
          average_time_spent_seconds: Math.round(averageTimeSpent)
        },
        score_distribution: scoreDistribution,
        question_analytics: questionAnalytics,
        student_performance: studentPerformance
      }, 'Test analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all test results for a specific test (all student attempts)
   * GET /api/instructor/tests/:testId/results
   */
  static async getTestResults(req, res, next) {
    try {
      const { testId } = req.params;
      const instructorId = req.user.id;
      const { page = 1, limit = 20 } = req.query;

      // Get test with ownership check
      const test = await AssignedTest.findByPk(testId);

      if (!test) {
        throw new NotFoundError('Test not found');
      }

      // Allow if instructor owns test OR user is admin
      if (test.instructor_id !== instructorId &&
          req.user.role !== 'admin' &&
          req.user.role !== 'super_admin') {
        throw new ForbiddenError('You do not have access to this test');
      }

      // Get attempts with pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: attempts } = await AssignedTestAttempt.findAndCountAll({
        where: {
          test_id: testId,
          completed_at: { [Op.not]: null }
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email', 'profile_picture']
          },
          {
            model: AssignedTestAnswer,
            as: 'answers',
            attributes: ['question_id', 'is_correct', 'marks_awarded']
          }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [['completed_at', 'DESC']]
      });

      const results = attempts.map(attempt => ({
        attempt_id: attempt.id,
        student: {
          id: attempt.student?.id,
          name: attempt.student?.full_name,
          email: attempt.student?.email,
          avatar: attempt.student?.profile_picture
        },
        attempt_number: attempt.attempt_number,
        score: attempt.score,
        total_marks: attempt.total_marks,
        percentage: parseFloat(attempt.percentage || 0),
        passed: attempt.passed,
        correct_answers: attempt.answers?.filter(a => a.is_correct).length || 0,
        total_questions: test.total_questions,
        time_spent_seconds: attempt.time_taken_seconds,
        completed_at: attempt.completed_at
      }));

      return ApiResponse.success(res, {
        test_id: testId,
        test_title: test.test_name,
        results,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }, 'Test results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed results for a specific student attempt
   * GET /api/instructor/attempts/:attemptId/details
   */
  static async getAttemptDetails(req, res, next) {
    try {
      const { attemptId } = req.params;
      const instructorId = req.user.id;

      const attempt = await AssignedTestAttempt.findByPk(attemptId, {
        include: [
          {
            model: AssignedTest,
            as: 'test'
          },
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email', 'profile_picture']
          },
          {
            model: AssignedTestAnswer,
            as: 'answers',
            include: [
              {
                model: QuestionBank,
                as: 'question'
              }
            ]
          }
        ]
      });

      if (!attempt) {
        throw new NotFoundError('Test attempt not found');
      }

      // Check ownership
      if (attempt.test.instructor_id !== instructorId &&
          req.user.role !== 'admin' &&
          req.user.role !== 'super_admin') {
        throw new ForbiddenError('You do not have access to this attempt');
      }

      const questionsWithAnswers = attempt.answers.map(answer => ({
        question_id: answer.question.id,
        question_text: answer.question.question_text,
        question_type: answer.question.question_type,
        options: answer.question.options,
        correct_answer: answer.question.correct_answer,
        student_answer: answer.student_answer,
        is_correct: answer.is_correct,
        marks_awarded: answer.marks_awarded,
        marks_possible: answer.question.marks,
        explanation: answer.question.explanation
      }));

      return ApiResponse.success(res, {
        attempt: {
          id: attempt.id,
          attempt_number: attempt.attempt_number,
          started_at: attempt.started_at,
          completed_at: attempt.completed_at,
          time_spent_seconds: attempt.time_taken_seconds
        },
        student: {
          id: attempt.student.id,
          name: attempt.student.full_name,
          email: attempt.student.email,
          avatar: attempt.student.profile_picture
        },
        test: {
          id: attempt.test.id,
          title: attempt.test.test_name,
          total_marks: attempt.test.total_marks,
          passing_score: attempt.test.passing_score
        },
        results: {
          score: attempt.score,
          total_marks: attempt.total_marks,
          percentage: parseFloat(attempt.percentage),
          passed: attempt.passed
        },
        questions: questionsWithAnswers
      }, 'Attempt details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Private helper: Calculate question-level analytics
   */
  static async _getQuestionAnalytics(testId) {
    const analytics = await sequelize.query(`
      SELECT
        q.id as question_id,
        q.question_text,
        q.question_type,
        COUNT(ata.id) as total_attempts,
        SUM(CASE WHEN ata.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
        ROUND(AVG(CASE WHEN ata.is_correct = 1 THEN 100 ELSE 0 END), 2) as success_rate
      FROM assigned_test_questions atq
      JOIN question_bank q ON atq.question_id = q.id
      LEFT JOIN assigned_test_answers ata ON q.id = ata.question_id
      LEFT JOIN assigned_test_attempts att ON ata.attempt_id = att.id AND att.test_id = :testId
      WHERE atq.test_id = :testId
      GROUP BY q.id, q.question_text, q.question_type
      ORDER BY atq.order_index
    `, {
      replacements: { testId },
      type: sequelize.QueryTypes.SELECT
    });

    return analytics.map(q => ({
      question_id: q.question_id,
      question_text: q.question_text.substring(0, 100) + '...',
      question_type: q.question_type,
      total_attempts: q.total_attempts || 0,
      correct_count: q.correct_count || 0,
      success_rate: parseFloat(q.success_rate || 0),
      difficulty: this._calculateDifficulty(parseFloat(q.success_rate || 0))
    }));
  }

  /**
   * Private helper: Calculate score distribution
   */
  static _calculateScoreDistribution(attempts) {
    const distribution = {
      '0-20': 0,
      '21-40': 0,
      '41-60': 0,
      '61-80': 0,
      '81-100': 0
    };

    attempts.forEach(attempt => {
      const percentage = parseFloat(attempt.percentage || 0);
      if (percentage <= 20) distribution['0-20']++;
      else if (percentage <= 40) distribution['21-40']++;
      else if (percentage <= 60) distribution['41-60']++;
      else if (percentage <= 80) distribution['61-80']++;
      else distribution['81-100']++;
    });

    return distribution;
  }

  /**
   * Private helper: Calculate question difficulty based on success rate
   */
  static _calculateDifficulty(successRate) {
    if (successRate >= 80) return 'Easy';
    if (successRate >= 60) return 'Medium';
    if (successRate >= 40) return 'Hard';
    return 'Very Hard';
  }
}

module.exports = TestAnalyticsController;
