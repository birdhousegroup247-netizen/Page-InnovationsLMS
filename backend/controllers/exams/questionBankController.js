const { QuestionBank, Category, User, Course } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const { Op } = require('sequelize');

class QuestionBankController {
  // Get all questions (with filters)
  static async getAllQuestions(req, res, next) {
    try {
      const { course_id, courses, category, difficulty, type, search, page = 1, limit = 20, is_approved } = req.query;

      const where = {};

      // Support both single course and multiple courses
      if (course_id) {
        where.course_id = course_id;
      } else if (courses) {
        // courses can be comma-separated IDs like "1,2,3"
        const courseIds = courses.split(',').map(id => parseInt(id));
        where.course_id = { [Op.in]: courseIds };
      }

      if (category) where.category_id = category;
      if (difficulty) where.difficulty = difficulty;
      if (type) where.question_type = type;
      if (is_approved !== undefined) where.is_approved = is_approved === 'true';
      if (search) {
        where[Op.or] = [
          { question_text: { [Op.like]: `%${search}%` } },
          { tags: { [Op.like]: `%${search}%` } },
        ];
      }

      // Non-admins can only see approved questions
      if (!['admin', 'super_admin'].includes(req.user.role)) {
        where.is_approved = true;
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await QuestionBank.findAndCountAll({
        where,
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title'] },
          { model: Category, as: 'category', attributes: ['id', 'name'] },
          { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        questions: rows,
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

  // Get question by ID
  static async getQuestionById(req, res, next) {
    try {
      const { id } = req.params;

      const question = await QuestionBank.findByPk(id, {
        include: [
          { model: Course, as: 'course', attributes: ['id', 'title'] },
          { model: Category, as: 'category' },
          { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        ],
      });

      if (!question) throw new NotFoundError('Question not found');

      return ApiResponse.success(res, { question });
    } catch (error) {
      next(error);
    }
  }

  // Create question
  static async createQuestion(req, res, next) {
    try {
      const {
        course_id,
        category_id,
        question_text,
        question_type,
        options,
        correct_answer,
        explanation,
        difficulty,
        tags,
        points,
      } = req.body;

      const question = await QuestionBank.create({
        course_id,
        category_id,
        question_text,
        question_type,
        options,
        correct_answer,
        explanation,
        difficulty,
        tags,
        points: points || 1,
        created_by: req.user.id,
        is_approved: ['admin', 'super_admin'].includes(req.user.role),
      });

      return ApiResponse.created(res, { question }, 'Question created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Bulk create questions
  static async bulkCreateQuestions(req, res, next) {
    try {
      const { questions } = req.body;

      if (!Array.isArray(questions) || questions.length === 0) {
        return ApiResponse.error(res, 'Questions array is required', 400);
      }

      // Add created_by and approval status to each question
      const questionsToCreate = questions.map((q) => ({
        ...q,
        created_by: req.user.id,
        is_approved: ['admin', 'super_admin'].includes(req.user.role),
      }));

      const createdQuestions = await QuestionBank.bulkCreate(questionsToCreate);

      return ApiResponse.created(res, { questions: createdQuestions, count: createdQuestions.length }, `${createdQuestions.length} questions created successfully`);
    } catch (error) {
      next(error);
    }
  }

  // Update question
  static async updateQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const question = await QuestionBank.findByPk(id);
      if (!question) throw new NotFoundError('Question not found');

      // Check ownership or admin
      if (question.created_by !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only update your own questions');
      }

      await question.update(updates);

      return ApiResponse.success(res, { question }, 'Question updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete question
  static async deleteQuestion(req, res, next) {
    try {
      const { id } = req.params;

      const question = await QuestionBank.findByPk(id);
      if (!question) throw new NotFoundError('Question not found');

      // Check ownership or admin
      if (question.created_by !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only delete your own questions');
      }

      await question.destroy();

      return ApiResponse.success(res, null, 'Question deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Approve question (admin only)
  static async approveQuestion(req, res, next) {
    try {
      const { id } = req.params;

      const question = await QuestionBank.findByPk(id);
      if (!question) throw new NotFoundError('Question not found');

      await question.update({ is_approved: true });

      return ApiResponse.success(res, { question }, 'Question approved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get question stats by course
  static async getCourseStats(req, res, next) {
    try {
      const { sequelize } = require('../../config/database');

      // Get question count per course
      const stats = await QuestionBank.findAll({
        attributes: [
          'course_id',
          [sequelize.fn('COUNT', sequelize.col('QuestionBank.id')), 'total_questions'],
          [sequelize.fn('SUM', sequelize.literal('CASE WHEN is_approved = true THEN 1 ELSE 0 END')), 'approved_questions'],
          [sequelize.fn('SUM', sequelize.literal('CASE WHEN is_approved = false THEN 1 ELSE 0 END')), 'pending_questions'],
        ],
        include: [
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title', 'thumbnail'],
            required: false // Include courses with 0 questions
          },
        ],
        group: ['course_id', 'course.id'],
        raw: false,
      });

      return ApiResponse.success(res, { stats });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = QuestionBankController;
