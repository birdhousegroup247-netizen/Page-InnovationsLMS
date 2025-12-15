/**
 * Bookmarks Controller
 * Handles lesson and article bookmarks
 */

const { LessonBookmark, ArticleBookmark, ModuleContent, KnowledgeArticle, CourseModule, Course } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');

class BookmarksController {
  // ============================================================================
  // LESSON BOOKMARKS
  // ============================================================================

  /**
   * Create a lesson bookmark
   * POST /api/bookmarks/lessons
   */
  static async createLessonBookmark(req, res, next) {
    try {
      const { content_id, note, timestamp } = req.body;
      const studentId = req.user.id;

      // Validate content exists
      const content = await ModuleContent.findByPk(content_id);
      if (!content) {
        throw new NotFoundError('Lesson content not found');
      }

      // Check if already bookmarked
      const existing = await LessonBookmark.findOne({
        where: { student_id: studentId, content_id },
      });

      if (existing) {
        throw new BadRequestError('You have already bookmarked this lesson');
      }

      // Create bookmark
      const bookmark = await LessonBookmark.create({
        student_id: studentId,
        content_id,
        note: note || null,
        timestamp: timestamp || null,
      });

      // Load bookmark with content details
      const bookmarkWithDetails = await LessonBookmark.findByPk(bookmark.id, {
        include: [
          {
            model: ModuleContent,
            as: 'content',
            include: [
              {
                model: CourseModule,
                as: 'module',
                include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
              },
            ],
          },
        ],
      });

      logger.info(`Student ${studentId} bookmarked lesson ${content_id}`);

      return ApiResponse.success(res, { bookmark: bookmarkWithDetails }, 'Lesson bookmarked successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all lesson bookmarks for authenticated user
   * GET /api/bookmarks/lessons
   */
  static async getLessonBookmarks(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      const studentId = req.user.id;

      const { count, rows } = await LessonBookmark.findAndCountAll({
        where: { student_id: studentId },
        include: [
          {
            model: ModuleContent,
            as: 'content',
            include: [
              {
                model: CourseModule,
                as: 'module',
                include: [{ model: Course, as: 'course', attributes: ['id', 'title', 'thumbnail'] }],
              },
            ],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        bookmarks: rows,
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
   * Check if a lesson is bookmarked
   * GET /api/bookmarks/lessons/:contentId
   */
  static async checkLessonBookmark(req, res, next) {
    try {
      const { contentId } = req.params;
      const studentId = req.user.id;

      const bookmark = await LessonBookmark.findOne({
        where: { student_id: studentId, content_id: contentId },
      });

      return ApiResponse.success(res, {
        is_bookmarked: !!bookmark,
        bookmark: bookmark || null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update lesson bookmark notes
   * PUT /api/bookmarks/lessons/:bookmarkId
   */
  static async updateLessonBookmark(req, res, next) {
    try {
      const { bookmarkId } = req.params;
      const { note, timestamp } = req.body;
      const studentId = req.user.id;

      const bookmark = await LessonBookmark.findByPk(bookmarkId);

      if (!bookmark) {
        throw new NotFoundError('Bookmark not found');
      }

      // Verify ownership
      if (bookmark.student_id !== studentId) {
        throw new ForbiddenError('You can only update your own bookmarks');
      }

      // Update bookmark
      if (note !== undefined) bookmark.note = note;
      if (timestamp !== undefined) bookmark.timestamp = timestamp;
      await bookmark.save();

      logger.info(`Student ${studentId} updated bookmark ${bookmarkId}`);

      return ApiResponse.success(res, { bookmark }, 'Bookmark updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete lesson bookmark
   * DELETE /api/bookmarks/lessons/:bookmarkId
   */
  static async deleteLessonBookmark(req, res, next) {
    try {
      const { bookmarkId } = req.params;
      const studentId = req.user.id;

      const bookmark = await LessonBookmark.findByPk(bookmarkId);

      if (!bookmark) {
        throw new NotFoundError('Bookmark not found');
      }

      // Verify ownership
      if (bookmark.student_id !== studentId) {
        throw new ForbiddenError('You can only delete your own bookmarks');
      }

      await bookmark.destroy();

      logger.info(`Student ${studentId} deleted bookmark ${bookmarkId}`);

      return ApiResponse.success(res, null, 'Bookmark removed successfully');
    } catch (error) {
      next(error);
    }
  }

  // ============================================================================
  // ARTICLE BOOKMARKS
  // ============================================================================

  /**
   * Create an article bookmark
   * POST /api/bookmarks/articles
   */
  static async createArticleBookmark(req, res, next) {
    try {
      const { article_id, note } = req.body;
      const studentId = req.user.id;

      // Validate article exists
      const article = await KnowledgeArticle.findByPk(article_id);
      if (!article) {
        throw new NotFoundError('Article not found');
      }

      // Check if already bookmarked
      const existing = await ArticleBookmark.findOne({
        where: { student_id: studentId, article_id },
      });

      if (existing) {
        throw new BadRequestError('You have already bookmarked this article');
      }

      // Create bookmark
      const bookmark = await ArticleBookmark.create({
        student_id: studentId,
        article_id,
        note: note || null,
      });

      // Load bookmark with article details
      const bookmarkWithDetails = await ArticleBookmark.findByPk(bookmark.id, {
        include: [
          {
            model: KnowledgeArticle,
            as: 'article',
            attributes: ['id', 'title', 'excerpt', 'thumbnail'],
          },
        ],
      });

      logger.info(`Student ${studentId} bookmarked article ${article_id}`);

      return ApiResponse.success(res, { bookmark: bookmarkWithDetails }, 'Article bookmarked successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all article bookmarks for authenticated user
   * GET /api/bookmarks/articles
   */
  static async getArticleBookmarks(req, res, next) {
    try {
      const { page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;
      const studentId = req.user.id;

      const { count, rows } = await ArticleBookmark.findAndCountAll({
        where: { student_id: studentId },
        include: [
          {
            model: KnowledgeArticle,
            as: 'article',
            attributes: ['id', 'title', 'excerpt', 'thumbnail', 'category_id'],
          },
        ],
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        bookmarks: rows,
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
   * Check if an article is bookmarked
   * GET /api/bookmarks/articles/:articleId/check
   */
  static async checkArticleBookmark(req, res, next) {
    try {
      const { articleId } = req.params;
      const studentId = req.user.id;

      const bookmark = await ArticleBookmark.findOne({
        where: { student_id: studentId, article_id: articleId },
      });

      return ApiResponse.success(res, {
        is_bookmarked: !!bookmark,
        bookmark: bookmark || null,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete article bookmark
   * DELETE /api/bookmarks/articles/:bookmarkId
   */
  static async deleteArticleBookmark(req, res, next) {
    try {
      const { bookmarkId } = req.params;
      const studentId = req.user.id;

      const bookmark = await ArticleBookmark.findByPk(bookmarkId);

      if (!bookmark) {
        throw new NotFoundError('Bookmark not found');
      }

      // Verify ownership
      if (bookmark.student_id !== studentId) {
        throw new ForbiddenError('You can only delete your own bookmarks');
      }

      await bookmark.destroy();

      logger.info(`Student ${studentId} deleted article bookmark ${bookmarkId}`);

      return ApiResponse.success(res, null, 'Article bookmark removed successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BookmarksController;
