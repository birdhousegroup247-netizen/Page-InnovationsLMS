const { Bundle, BundleCourse, Course, User, Category, Enrollment } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const { Op } = require('sequelize');
const ActivityController = require('../activity/activityController');

// Real Course columns. thumbnail_url, difficulty, enrolled_count
// are VIRTUAL getters and can't be selected directly — they ride
// along on toJSON() once the underlying columns are loaded.
const COURSE_ATTRS = [
  'id', 'title', 'description', 'thumbnail',
  'level', 'duration_hours', 'price', 'average_rating', 'enrollment_count',
];

class BundlesController {
  // GET /api/bundles — public list of active bundles
  static async getAll(req, res, next) {
    try {
      const bundles = await Bundle.findAll({
        where: { is_active: true },
        include: [
          {
            model: Course,
            as: 'courses',
            attributes: COURSE_ATTRS,
            through: { attributes: [] },
            include: [{ model: User, as: 'instructor', attributes: ['id', 'full_name'] }],
          },
          { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        ],
        order: [['created_at', 'DESC']],
      });

      // Attach total_value (sum of individual course prices) and savings
      const enriched = bundles.map((b) => {
        const data = b.toJSON();
        const totalValue = data.courses.reduce((sum, c) => sum + Number(c.price || 0), 0);
        data.total_value = totalValue;
        data.savings = Math.max(0, totalValue - Number(data.price));
        return data;
      });

      return ApiResponse.success(res, { bundles: enriched, total: enriched.length });
    } catch (error) {
      next(error);
    }
  }

  // GET /api/bundles/:id
  static async getById(req, res, next) {
    try {
      const bundle = await Bundle.findOne({
        where: { id: req.params.id, is_active: true },
        include: [
          {
            model: Course,
            as: 'courses',
            attributes: COURSE_ATTRS,
            through: { attributes: [] },
            include: [
              { model: User, as: 'instructor', attributes: ['id', 'full_name'] },
              { model: Category, as: 'category', attributes: ['id', 'name'] },
            ],
          },
          { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        ],
      });

      if (!bundle) throw new NotFoundError('Bundle not found');

      const data = bundle.toJSON();
      const totalValue = data.courses.reduce((sum, c) => sum + Number(c.price || 0), 0);
      data.total_value = totalValue;
      data.savings = Math.max(0, totalValue - Number(data.price));

      return ApiResponse.success(res, { bundle: data });
    } catch (error) {
      next(error);
    }
  }
}

// ============================================================================
// ADMIN CONTROLLER
// ============================================================================

class AdminBundlesController {
  static async getAll(req, res, next) {
    try {
      const bundles = await Bundle.findAll({
        include: [
          {
            model: Course,
            as: 'courses',
            attributes: COURSE_ATTRS,
            through: { attributes: [] },
          },
          { model: User, as: 'creator', attributes: ['id', 'full_name'] },
        ],
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, { bundles, total: bundles.length });
    } catch (error) {
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const { title, description, thumbnail_url, price, course_ids } = req.body;

      if (!title) throw new BadRequestError('Title is required');
      if (!price && price !== 0) throw new BadRequestError('Price is required');
      if (!Array.isArray(course_ids) || course_ids.length < 2) {
        throw new BadRequestError('A bundle must contain at least 2 courses');
      }

      const bundle = await Bundle.create({
        title,
        description,
        thumbnail_url,
        price,
        created_by: req.user.id,
        is_active: true,
      });

      await BundleCourse.bulkCreate(
        course_ids.map((cid) => ({ bundle_id: bundle.id, course_id: cid }))
      );

      const full = await Bundle.findByPk(bundle.id, {
        include: [{ model: Course, as: 'courses', attributes: COURSE_ATTRS, through: { attributes: [] } }],
      });

      await ActivityController.logFromRequest(req, 'bundle_create', 'bundle', bundle.id, { title: bundle.title, course_count: course_ids.length, price: bundle.price }).catch(() => {});
      return ApiResponse.created(res, { bundle: full }, 'Bundle created');
    } catch (error) {
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const bundle = await Bundle.findByPk(req.params.id);
      if (!bundle) throw new NotFoundError('Bundle not found');

      const { title, description, thumbnail_url, price, is_active, course_ids } = req.body;

      await bundle.update({ title, description, thumbnail_url, price, is_active });

      if (Array.isArray(course_ids)) {
        if (course_ids.length < 2) throw new BadRequestError('A bundle must contain at least 2 courses');
        await BundleCourse.destroy({ where: { bundle_id: bundle.id } });
        await BundleCourse.bulkCreate(
          course_ids.map((cid) => ({ bundle_id: bundle.id, course_id: cid }))
        );
      }

      const full = await Bundle.findByPk(bundle.id, {
        include: [{ model: Course, as: 'courses', attributes: COURSE_ATTRS, through: { attributes: [] } }],
      });

      await ActivityController.logFromRequest(req, 'bundle_update', 'bundle', bundle.id, { title: bundle.title }).catch(() => {});
      return ApiResponse.success(res, { bundle: full }, 'Bundle updated');
    } catch (error) {
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const bundle = await Bundle.findByPk(req.params.id);
      if (!bundle) throw new NotFoundError('Bundle not found');

      await bundle.update({ is_active: false });
      await ActivityController.logFromRequest(req, 'bundle_delete', 'bundle', bundle.id, { title: bundle.title }).catch(() => {});
      return ApiResponse.success(res, null, 'Bundle deactivated');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { BundlesController, AdminBundlesController };
