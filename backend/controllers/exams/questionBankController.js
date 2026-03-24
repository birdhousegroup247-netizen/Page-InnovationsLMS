const { QuestionBank, Category, User, Course } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const { Op, literal } = require('sequelize');

class QuestionBankController {
  // Get all questions (with filters)
  static async getAllQuestions(req, res, next) {
    try {
      const { course_id, courses, category, no_category, difficulty, type, search, page = 1, limit = 20, is_approved } = req.query;

      const where = {};

      // Support both single course and multiple courses
      if (course_id) {
        where.course_id = course_id;
      } else if (courses) {
        // courses can be comma-separated IDs like "1,2,3"
        const courseIds = courses.split(',').map(id => parseInt(id));
        where.course_id = { [Op.in]: courseIds };
      }

      if (no_category === 'true') {
        where.category_id = null;
      } else if (category) {
        where.category_id = category;
      }
      if (difficulty) where.difficulty = difficulty;
      if (type) where.question_type = type;
      if (is_approved !== undefined) where.is_approved = is_approved === 'true';
      if (search) {
        where.question_text = { [Op.iLike]: `%${search}%` };
      }

      // Non-admins can only see approved questions
      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      if (!isAdmin) {
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

      // Compute overall stats (unfiltered, for summary cards)
      const statsWhere = isAdmin ? {} : { is_approved: true };
      const [totalCount, approvedCount, pendingCount, mcqCount, tfCount, fbCount] = await Promise.all([
        QuestionBank.count({ where: statsWhere }),
        QuestionBank.count({ where: { ...statsWhere, is_approved: true } }),
        QuestionBank.count({ where: { is_approved: false } }),
        QuestionBank.count({ where: { ...statsWhere, question_type: 'multiple_choice' } }),
        QuestionBank.count({ where: { ...statsWhere, question_type: 'true_false' } }),
        QuestionBank.count({ where: { ...statsWhere, question_type: 'fill_blank' } }),
      ]);

      const totalPages = Math.ceil(count / limit);

      return ApiResponse.success(res, {
        questions: rows,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalItems: count,
          itemsPerPage: parseInt(limit),
          // aliases expected by frontend
          total: count,
          pages: totalPages,
        },
        stats: {
          total: totalCount,
          approved: approvedCount,
          pending: pendingCount,
          multiple_choice: mcqCount,
          true_false: tfCount,
          fill_blank: fbCount,
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
        marks,
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
        marks: marks || points || 1,
        points: points || marks || 1,
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

  // Get overall stats (for summary cards)
  static async getStats(req, res, next) {
    try {
      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const baseWhere = isAdmin ? {} : { is_approved: true };

      const [total, approved, pending, mcq, tf, fb] = await Promise.all([
        QuestionBank.count({ where: baseWhere }),
        QuestionBank.count({ where: { ...baseWhere, is_approved: true } }),
        QuestionBank.count({ where: { is_approved: false } }),
        QuestionBank.count({ where: { ...baseWhere, question_type: 'multiple_choice' } }),
        QuestionBank.count({ where: { ...baseWhere, question_type: 'true_false' } }),
        QuestionBank.count({ where: { ...baseWhere, question_type: 'fill_blank' } }),
      ]);

      return ApiResponse.success(res, { stats: { total, approved, pending, multiple_choice: mcq, true_false: tf, fill_blank: fb } });
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

      await question.update({ is_approved: true, approval_status: 'approved', reviewed_by: req.user.id, reviewed_at: new Date() });

      return ApiResponse.success(res, { question }, 'Question approved successfully');
    } catch (error) {
      next(error);
    }
  }

  // Reject question (admin only)
  static async rejectQuestion(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const question = await QuestionBank.findByPk(id);
      if (!question) throw new NotFoundError('Question not found');

      await question.update({
        is_approved: false,
        approval_status: 'rejected',
        rejection_reason: reason || null,
        reviewed_by: req.user.id,
        reviewed_at: new Date(),
      });

      return ApiResponse.success(res, { question }, 'Question rejected');
    } catch (error) {
      next(error);
    }
  }

  // Bulk approve (admin only)
  static async bulkApprove(req, res, next) {
    try {
      const { question_ids } = req.body;
      if (!Array.isArray(question_ids) || question_ids.length === 0) {
        return ApiResponse.error(res, 'question_ids array is required', 400);
      }

      const { Op } = require('sequelize');
      const [updated] = await QuestionBank.update(
        { is_approved: true, approval_status: 'approved', reviewed_by: req.user.id, reviewed_at: new Date() },
        { where: { id: { [Op.in]: question_ids } } }
      );

      return ApiResponse.success(res, { updatedCount: updated }, `${updated} question(s) approved`);
    } catch (error) {
      next(error);
    }
  }

  // Bulk delete (admin only)
  static async bulkDeleteQuestions(req, res, next) {
    try {
      const { question_ids } = req.body;
      if (!Array.isArray(question_ids) || question_ids.length === 0) {
        return ApiResponse.error(res, 'question_ids array is required', 400);
      }

      const { Op } = require('sequelize');
      const deleted = await QuestionBank.destroy({ where: { id: { [Op.in]: question_ids } } });

      return ApiResponse.success(res, { deletedCount: deleted }, `${deleted} question(s) deleted`);
    } catch (error) {
      next(error);
    }
  }

  // Get question counts per category
  static async getCategoryBreakdown(req, res, next) {
    try {
      const { sequelize } = require('../../config/database');
      const isAdmin = ['admin', 'super_admin'].includes(req.user.role);
      const baseWhere = isAdmin ? {} : { is_approved: true };

      const counts = await QuestionBank.findAll({
        attributes: [
          'category_id',
          [sequelize.fn('COUNT', sequelize.col('QuestionBank.id')), 'question_count'],
        ],
        where: baseWhere,
        group: ['category_id'],
        raw: true,
      });

      const categorized = counts
        .filter(c => c.category_id !== null)
        .map(c => ({ category_id: c.category_id, question_count: parseInt(c.question_count) }));

      const uncatItem = counts.find(c => c.category_id === null);
      const uncategorized_count = uncatItem ? parseInt(uncatItem.question_count) : 0;

      return ApiResponse.success(res, { category_counts: categorized, uncategorized_count });
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
          [sequelize.literal('SUM(CASE WHEN "QuestionBank"."is_approved" THEN 1 ELSE 0 END)'), 'approved_questions'],
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
