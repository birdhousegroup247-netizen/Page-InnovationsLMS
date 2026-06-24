const { Course, ModuleContent, KnowledgeArticle, User, CourseModule } = require('../../models');
const ApiResponse = require('../../utils/response');
const { Op } = require('sequelize');

class SearchController {
  static async search(req, res, next) {
    try {
      const { q, type = 'all', limit: limitParam = 5 } = req.query;
      const limit = Math.min(parseInt(limitParam) || 5, 50);

      if (!q || q.trim().length < 2) {
        return ApiResponse.success(res, { results: { courses: [], lessons: [], articles: [] }, query: q });
      }

      const keyword = q.trim();
      const likePattern = { [Op.iLike]: `%${keyword}%` };

      const searches = {};

      if (type === 'all' || type === 'courses') {
        searches.courses = Course.findAll({
          where: { title: likePattern, status: 'published' },
          attributes: ['id', 'title', 'slug', 'thumbnail', 'difficulty', 'enrollment_count'],
          include: [{ model: User, as: 'instructor', attributes: ['id', 'full_name'] }],
          limit,
        });
      }

      if (type === 'all' || type === 'lessons') {
        searches.lessons = ModuleContent.findAll({
          where: { title: likePattern },
          attributes: ['id', 'title', 'content_type', 'duration_minutes'],
          include: [{
            model: CourseModule,
            as: 'module',
            attributes: ['id', 'title'],
            include: [{ model: Course, as: 'course', where: { status: 'published' }, attributes: ['id', 'title', 'slug'] }],
          }],
          limit,
        });
      }

      if (type === 'all' || type === 'articles') {
        searches.articles = KnowledgeArticle.findAll({
          where: { title: likePattern },
          attributes: ['id', 'title', 'slug'],
          limit,
        });
      }

      const resolved = await Promise.all(
        Object.entries(searches).map(async ([key, promise]) => [key, await promise])
      );

      const results = { courses: [], lessons: [], articles: [] };
      for (const [key, data] of resolved) {
        results[key] = data;
      }

      return ApiResponse.success(res, { results, query: keyword });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = SearchController;
