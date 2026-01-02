const { QuestionBank, User, Category, Course } = require('../../models');
const ApiResponse = require('../../utils/response');
const { Op } = require('sequelize');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

/**
 * Question Status Controller for Instructors
 * Allows instructors to track approval status of their submitted questions
 */
class QuestionStatusController {
  /**
   * Get all questions submitted by the instructor
   * GET /api/instructor/questions/my
   * Query params: ?status=pending|approved|rejected
   */
  static async getMyQuestions(req, res, next) {
    try {
      const instructorId = req.user.id;
      const { status, page = 1, limit = 20, category_id, difficulty } = req.query;

      // Build where clause
      const whereClause = { created_by: instructorId };

      if (status && status !== 'all') {
        whereClause.approval_status = status;
      }

      if (category_id) {
        whereClause.category_id = category_id;
      }

      if (difficulty) {
        whereClause.difficulty = difficulty;
      }

      // Get questions with pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: questions } = await QuestionBank.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'full_name', 'email'],
            required: false
          }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [['created_at', 'DESC']]
      });

      // Format questions
      const formattedQuestions = questions.map(q => ({
        id: q.id,
        question_text: q.question_text,
        question_type: q.question_type,
        difficulty: q.difficulty,
        category: q.category?.name,
        course: q.course?.title,
        marks: q.marks,
        approval_status: q.approval_status || 'pending',
        is_approved: q.is_approved,
        rejection_reason: q.rejection_reason,
        reviewed_by: q.reviewer?.full_name,
        reviewed_at: q.reviewed_at,
        times_used: q.times_used,
        created_at: q.created_at
      }));

      // Calculate statistics
      const stats = {
        total: count,
        pending: questions.filter(q => q.approval_status === 'pending').length,
        approved: questions.filter(q => q.approval_status === 'approved').length,
        rejected: questions.filter(q => q.approval_status === 'rejected').length
      };

      return ApiResponse.success(res, {
        questions: formattedQuestions,
        stats,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }, 'Questions retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed approval status for a specific question
   * GET /api/instructor/questions/:questionId/status
   */
  static async getQuestionStatus(req, res, next) {
    try {
      const { questionId } = req.params;
      const instructorId = req.user.id;

      const question = await QuestionBank.findByPk(questionId, {
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name']
          },
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title']
          },
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'full_name', 'email'],
            required: false
          },
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'full_name', 'email']
          }
        ]
      });

      if (!question) {
        throw new NotFoundError('Question not found');
      }

      // Check ownership (or allow admin)
      if (question.created_by !== instructorId &&
          req.user.role !== 'admin' &&
          req.user.role !== 'super_admin') {
        throw new ForbiddenError('You can only view status of your own questions');
      }

      return ApiResponse.success(res, {
        question: {
          id: question.id,
          question_text: question.question_text,
          question_type: question.question_type,
          options: question.options,
          correct_answer: question.correct_answer,
          explanation: question.explanation,
          difficulty: question.difficulty,
          category: question.category?.name,
          course: question.course?.title,
          marks: question.marks,
          tags: question.tags
        },
        approval: {
          status: question.approval_status || 'pending',
          is_approved: question.is_approved,
          rejection_reason: question.rejection_reason,
          reviewed_by: question.reviewer ? {
            id: question.reviewer.id,
            name: question.reviewer.full_name,
            email: question.reviewer.email
          } : null,
          reviewed_at: question.reviewed_at
        },
        usage_stats: {
          times_used: question.times_used,
          times_correct: question.times_correct,
          times_incorrect: question.times_incorrect,
          success_rate: question.times_used > 0
            ? ((question.times_correct / question.times_used) * 100).toFixed(2)
            : 0
        },
        created_by: {
          id: question.creator.id,
          name: question.creator.full_name,
          email: question.creator.email
        },
        created_at: question.created_at,
        updated_at: question.updated_at
      }, 'Question status retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get question approval statistics for the instructor
   * GET /api/instructor/questions/stats
   */
  static async getQuestionStats(req, res, next) {
    try {
      const instructorId = req.user.id;

      const [totalQuestions, pendingQuestions, approvedQuestions, rejectedQuestions] = await Promise.all([
        QuestionBank.count({ where: { created_by: instructorId } }),
        QuestionBank.count({ where: { created_by: instructorId, approval_status: 'pending' } }),
        QuestionBank.count({ where: { created_by: instructorId, approval_status: 'approved' } }),
        QuestionBank.count({ where: { created_by: instructorId, approval_status: 'rejected' } })
      ]);

      // Get questions by difficulty
      const questionsByDifficulty = await QuestionBank.findAll({
        where: { created_by: instructorId },
        attributes: [
          'difficulty',
          [QuestionBank.sequelize.fn('COUNT', QuestionBank.sequelize.col('id')), 'count']
        ],
        group: ['difficulty']
      });

      // Get questions by category
      const questionsByCategory = await QuestionBank.findAll({
        where: { created_by: instructorId },
        attributes: [
          'category_id',
          [QuestionBank.sequelize.fn('COUNT', QuestionBank.sequelize.col('id')), 'count']
        ],
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['name']
          }
        ],
        group: ['category_id', 'category.id', 'category.name']
      });

      // Get recently reviewed questions
      const recentlyReviewed = await QuestionBank.findAll({
        where: {
          created_by: instructorId,
          reviewed_at: { [Op.not]: null }
        },
        include: [
          {
            model: User,
            as: 'reviewer',
            attributes: ['id', 'full_name']
          }
        ],
        order: [['reviewed_at', 'DESC']],
        limit: 5
      });

      return ApiResponse.success(res, {
        overview: {
          total_questions: totalQuestions,
          pending: pendingQuestions,
          approved: approvedQuestions,
          rejected: rejectedQuestions,
          approval_rate: totalQuestions > 0
            ? ((approvedQuestions / totalQuestions) * 100).toFixed(2)
            : 0
        },
        by_difficulty: questionsByDifficulty.map(q => ({
          difficulty: q.difficulty,
          count: parseInt(q.getDataValue('count'))
        })),
        by_category: questionsByCategory.map(q => ({
          category: q.category?.name || 'Uncategorized',
          count: parseInt(q.getDataValue('count'))
        })),
        recently_reviewed: recentlyReviewed.map(q => ({
          id: q.id,
          question_text: q.question_text.substring(0, 100) + '...',
          status: q.approval_status,
          reviewed_by: q.reviewer?.full_name,
          reviewed_at: q.reviewed_at
        }))
      }, 'Question statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = QuestionStatusController;
