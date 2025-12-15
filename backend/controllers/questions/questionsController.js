/**
 * Questions Controller
 * Handles lesson Q&A system - questions and replies
 */

const { LessonQuestion, QuestionReply, ModuleContent, User, CourseModule, Course } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const NotificationsController = require('../notifications/notificationsController');

class QuestionsController {
  // ============================================================================
  // LESSON QUESTIONS
  // ============================================================================

  /**
   * Ask a question on a lesson
   * POST /api/lessons/:contentId/questions
   */
  static async askQuestion(req, res, next) {
    try {
      const { contentId } = req.params;
      const { question_text } = req.body;
      const studentId = req.user.id;

      if (!question_text || question_text.trim().length === 0) {
        throw new BadRequestError('Question text is required');
      }

      // Validate content exists
      const content = await ModuleContent.findByPk(contentId, {
        include: [
          {
            model: CourseModule,
            as: 'module',
            include: [{ model: Course, as: 'course' }],
          },
        ],
      });

      if (!content) {
        throw new NotFoundError('Lesson content not found');
      }

      // Create question
      const question = await LessonQuestion.create({
        content_id: contentId,
        student_id: studentId,
        question_text,
        is_answered: false,
        upvotes: 0,
      });

      // Load question with student details
      const questionWithDetails = await LessonQuestion.findByPk(question.id, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'profile_picture'],
          },
          {
            model: ModuleContent,
            as: 'content',
            attributes: ['id', 'title'],
          },
        ],
      });

      // Notify course instructor
      const courseInstructorId = content.module.course.instructor_id;
      if (courseInstructorId) {
        await NotificationsController.createNotification({
          user_id: courseInstructorId,
          type: 'question_reply',
          title: 'New Question on Your Course',
          message: `A student asked: "${question_text.substring(0, 100)}..."`,
          link: `/courses/${content.module.course.id}/lessons/${contentId}#question-${question.id}`,
          priority: 'normal',
        });
      }

      logger.info(`Student ${studentId} asked question on lesson ${contentId}`);

      return ApiResponse.success(res, { question: questionWithDetails }, 'Question posted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all questions for a lesson
   * GET /api/lessons/:contentId/questions
   */
  static async getLessonQuestions(req, res, next) {
    try {
      const { contentId } = req.params;
      const { page = 1, limit = 20, sort = 'recent' } = req.query;
      const offset = (page - 1) * limit;

      // Determine sort order
      let order;
      switch (sort) {
        case 'popular':
          order = [['upvotes', 'DESC']];
          break;
        case 'unanswered':
          order = [['is_answered', 'ASC'], ['created_at', 'DESC']];
          break;
        default: // recent
          order = [['created_at', 'DESC']];
      }

      const { count, rows } = await LessonQuestion.findAndCountAll({
        where: { content_id: contentId },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'profile_picture'],
          },
          {
            model: QuestionReply,
            as: 'replies',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'full_name', 'profile_picture', 'role'],
              },
            ],
            order: [['created_at', 'ASC']],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order,
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

  /**
   * Get a specific question with all replies
   * GET /api/questions/:questionId
   */
  static async getQuestionById(req, res, next) {
    try {
      const { questionId } = req.params;

      const question = await LessonQuestion.findByPk(questionId, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'profile_picture'],
          },
          {
            model: ModuleContent,
            as: 'content',
            attributes: ['id', 'title'],
          },
          {
            model: QuestionReply,
            as: 'replies',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'full_name', 'profile_picture', 'role'],
              },
            ],
            order: [['created_at', 'ASC']],
          },
        ],
      });

      if (!question) {
        throw new NotFoundError('Question not found');
      }

      return ApiResponse.success(res, { question });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a question
   * PUT /api/questions/:questionId
   */
  static async updateQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      const { question_text } = req.body;
      const userId = req.user.id;

      const question = await LessonQuestion.findByPk(questionId);

      if (!question) {
        throw new NotFoundError('Question not found');
      }

      // Verify ownership
      if (question.student_id !== userId) {
        throw new ForbiddenError('You can only update your own questions');
      }

      if (question_text) {
        question.question_text = question_text;
        await question.save();
      }

      logger.info(`User ${userId} updated question ${questionId}`);

      return ApiResponse.success(res, { question }, 'Question updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a question
   * DELETE /api/questions/:questionId
   */
  static async deleteQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      const userId = req.user.id;

      const question = await LessonQuestion.findByPk(questionId);

      if (!question) {
        throw new NotFoundError('Question not found');
      }

      // Only the question owner or admin can delete
      if (question.student_id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only delete your own questions');
      }

      await question.destroy();

      logger.info(`Question ${questionId} deleted by user ${userId}`);

      return ApiResponse.success(res, null, 'Question deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upvote a question
   * POST /api/questions/:questionId/upvote
   */
  static async upvoteQuestion(req, res, next) {
    try {
      const { questionId } = req.params;

      const question = await LessonQuestion.findByPk(questionId);

      if (!question) {
        throw new NotFoundError('Question not found');
      }

      question.upvotes += 1;
      await question.save();

      logger.info(`Question ${questionId} upvoted by user ${req.user.id}`);

      return ApiResponse.success(res, { upvotes: question.upvotes }, 'Question upvoted');
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // QUESTION REPLIES
  // ============================================================================

  /**
   * Reply to a question
   * POST /api/questions/:questionId/replies
   */
  static async replyToQuestion(req, res, next) {
    try {
      const { questionId } = req.params;
      const { reply_text } = req.body;
      const userId = req.user.id;

      if (!reply_text || reply_text.trim().length === 0) {
        throw new BadRequestError('Reply text is required');
      }

      // Validate question exists
      const question = await LessonQuestion.findByPk(questionId, {
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name'],
          },
        ],
      });

      if (!question) {
        throw new NotFoundError('Question not found');
      }

      // Check if user is instructor
      const isInstructor = ['instructor', 'admin', 'super_admin'].includes(req.user.role);

      // Create reply
      const reply = await QuestionReply.create({
        question_id: questionId,
        user_id: userId,
        reply_text,
        is_instructor: isInstructor,
        upvotes: 0,
      });

      // Mark question as answered if reply is from instructor
      if (isInstructor && !question.is_answered) {
        question.is_answered = true;
        await question.save();
      }

      // Load reply with user details
      const replyWithDetails = await QuestionReply.findByPk(reply.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'full_name', 'profile_picture', 'role'],
          },
        ],
      });

      // Notify the question asker
      if (question.student_id !== userId) {
        await NotificationsController.createNotification({
          user_id: question.student_id,
          type: 'question_reply',
          title: 'New Reply to Your Question',
          message: `${req.user.full_name} replied: "${reply_text.substring(0, 100)}..."`,
          link: `/questions/${questionId}`,
          priority: 'normal',
        });
      }

      logger.info(`User ${userId} replied to question ${questionId}`);

      return ApiResponse.success(res, { reply: replyWithDetails }, 'Reply posted successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update a reply
   * PUT /api/replies/:replyId
   */
  static async updateReply(req, res, next) {
    try {
      const { replyId } = req.params;
      const { reply_text } = req.body;
      const userId = req.user.id;

      const reply = await QuestionReply.findByPk(replyId);

      if (!reply) {
        throw new NotFoundError('Reply not found');
      }

      // Verify ownership
      if (reply.user_id !== userId) {
        throw new ForbiddenError('You can only update your own replies');
      }

      if (reply_text) {
        reply.reply_text = reply_text;
        await reply.save();
      }

      logger.info(`User ${userId} updated reply ${replyId}`);

      return ApiResponse.success(res, { reply }, 'Reply updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete a reply
   * DELETE /api/replies/:replyId
   */
  static async deleteReply(req, res, next) {
    try {
      const { replyId } = req.params;
      const userId = req.user.id;

      const reply = await QuestionReply.findByPk(replyId);

      if (!reply) {
        throw new NotFoundError('Reply not found');
      }

      // Only the reply owner or admin can delete
      if (reply.user_id !== userId && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only delete your own replies');
      }

      await reply.destroy();

      logger.info(`Reply ${replyId} deleted by user ${userId}`);

      return ApiResponse.success(res, null, 'Reply deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upvote a reply
   * POST /api/replies/:replyId/upvote
   */
  static async upvoteReply(req, res, next) {
    try {
      const { replyId } = req.params;

      const reply = await QuestionReply.findByPk(replyId);

      if (!reply) {
        throw new NotFoundError('Reply not found');
      }

      reply.upvotes += 1;
      await reply.save();

      logger.info(`Reply ${replyId} upvoted by user ${req.user.id}`);

      return ApiResponse.success(res, { upvotes: reply.upvotes }, 'Reply upvoted');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = QuestionsController;
