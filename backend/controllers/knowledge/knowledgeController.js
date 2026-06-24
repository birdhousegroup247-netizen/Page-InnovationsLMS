const { KnowledgeArticle, Category, User } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const { Op } = require('sequelize');

class KnowledgeController {
  // Get all articles (with filters)
  static async getAllArticles(req, res, next) {
    try {
      const { category, search, tags, page = 1, limit = 12 } = req.query;

      const where = { status: 'published' };

      if (category) where.category_id = category;
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { content: { [Op.iLike]: `%${search}%` } },
        ];
      }
      if (tags) {
        where.tags = { [Op.iLike]: `%${tags}%` };
      }

      const offset = (page - 1) * limit;

      const { count, rows } = await KnowledgeArticle.findAndCountAll({
        where,
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name', 'icon'] },
          { model: User, as: 'author', attributes: ['id', 'full_name', 'profile_picture'] },
        ],
        attributes: { exclude: ['content'] }, // Don't include full content in list
        limit: parseInt(limit),
        offset: parseInt(offset),
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        articles: rows,
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

  // Get article by ID or slug
  static async getArticleBySlug(req, res, next) {
    try {
      const { slug } = req.params;

      const article = await KnowledgeArticle.findOne({
        where: { slug },
        include: [
          { model: Category, as: 'category' },
          { model: User, as: 'author', attributes: ['id', 'full_name', 'profile_picture', 'bio'] },
        ],
      });

      if (!article) {
        throw new NotFoundError('Article not found');
      }

      // Increment views
      await article.increment('views');

      return ApiResponse.success(res, { article });
    } catch (error) {
      next(error);
    }
  }

  // Create article (instructor/admin)
  static async createArticle(req, res, next) {
    try {
      const {
        title,
        slug,
        content,
        category_id,
        tags,
        reading_time_minutes,
        status,
      } = req.body;

      const article = await KnowledgeArticle.create({
        title,
        slug,
        content,
        category_id,
        author_id: req.user.id,
        tags,
        reading_time_minutes,
        status: status || 'draft',
      });

      logger.info(`Article created: ${title} by ${req.user.email}`);

      return ApiResponse.created(res, { article }, 'Article created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Update article
  static async updateArticle(req, res, next) {
    try {
      const { id } = req.params;
      const updates = req.body;

      const article = await KnowledgeArticle.findByPk(id);

      if (!article) {
        throw new NotFoundError('Article not found');
      }

      // Check ownership or admin
      if (article.author_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only update your own articles');
      }

      await article.update(updates);

      logger.info(`Article updated: ${article.title}`);

      return ApiResponse.success(res, { article }, 'Article updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete article
  static async deleteArticle(req, res, next) {
    try {
      const { id } = req.params;

      const article = await KnowledgeArticle.findByPk(id);

      if (!article) {
        throw new NotFoundError('Article not found');
      }

      // Check ownership or admin
      if (article.author_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only delete your own articles');
      }

      await article.destroy();

      logger.info(`Article deleted: ${article.title}`);

      return ApiResponse.success(res, null, 'Article deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  // Get related articles
  static async getRelatedArticles(req, res, next) {
    try {
      const { id } = req.params;
      const { limit = 5 } = req.query;

      const article = await KnowledgeArticle.findByPk(id);

      if (!article) {
        throw new NotFoundError('Article not found');
      }

      // Find articles in same category, excluding current article
      const relatedArticles = await KnowledgeArticle.findAll({
        where: {
          category_id: article.category_id,
          id: { [Op.ne]: id },
          status: 'published',
        },
        attributes: ['id', 'title', 'slug', 'reading_time_minutes', 'views', 'created_at'],
        limit: parseInt(limit),
        order: [['views', 'DESC']],
      });

      return ApiResponse.success(res, { articles: relatedArticles });
    } catch (error) {
      next(error);
    }
  }

  // Get popular articles
  static async getPopularArticles(req, res, next) {
    try {
      const { limit = 10 } = req.query;

      const articles = await KnowledgeArticle.findAll({
        where: { status: 'published' },
        attributes: ['id', 'title', 'slug', 'reading_time_minutes', 'views', 'created_at'],
        include: [
          { model: Category, as: 'category', attributes: ['id', 'name'] },
        ],
        limit: parseInt(limit),
        order: [['views', 'DESC']],
      });

      return ApiResponse.success(res, { articles });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = KnowledgeController;
