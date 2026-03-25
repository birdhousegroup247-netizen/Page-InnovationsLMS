/**
 * Admin Coupons Controller
 * CRUD management for CouponCode model.
 */

const { Op } = require('sequelize');
const { CouponCode, CouponCodeCourse, CouponRedemption, Course, User } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');

class CouponsController {
  /**
   * GET /api/admin/coupons
   * List all coupons with optional search/filter.
   */
  static async getAll(req, res, next) {
    try {
      const { search, is_active, page = 1, limit = 20 } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const where = {};
      if (search) {
        where[Op.or] = [
          { code: { [Op.like]: `%${search.toUpperCase()}%` } },
          { description: { [Op.like]: `%${search}%` } },
        ];
      }
      if (is_active !== undefined) {
        where.is_active = is_active === 'true';
      }

      const { rows: coupons, count: total } = await CouponCode.findAndCountAll({
        where,
        include: [
          { model: User, as: 'creator', attributes: ['id', 'full_name', 'email'] },
        ],
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset,
      });

      return ApiResponse.success(res, {
        coupons,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/coupons/:id
   * Get single coupon with redemption history.
   */
  static async getById(req, res, next) {
    try {
      const coupon = await CouponCode.findByPk(req.params.id, {
        include: [
          { model: User, as: 'creator', attributes: ['id', 'full_name'] },
          { model: CouponCodeCourse, as: 'applicable_courses', include: [{ model: Course, as: 'course', attributes: ['id', 'title'] }] },
        ],
      });

      if (!coupon) return ApiResponse.notFound(res, 'Coupon not found');

      const redemptionCount = await CouponRedemption.count({ where: { coupon_id: coupon.id } });

      return ApiResponse.success(res, { coupon, redemptionCount });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/admin/coupons
   * Create a new coupon code.
   */
  static async create(req, res, next) {
    try {
      const {
        code, description, discount_type, discount_value,
        min_purchase_amount, max_uses, per_user_limit,
        applies_to, expires_at, course_ids,
      } = req.body;

      if (!code || !discount_type || discount_value === undefined) {
        return ApiResponse.badRequest(res, 'code, discount_type, and discount_value are required');
      }

      // Check duplicate code
      const existing = await CouponCode.findOne({ where: { code: code.toUpperCase().trim() } });
      if (existing) return ApiResponse.badRequest(res, 'Coupon code already exists');

      const coupon = await CouponCode.create({
        code,
        description,
        discount_type,
        discount_value,
        min_purchase_amount: min_purchase_amount || 0,
        max_uses: max_uses || null,
        per_user_limit: per_user_limit || 1,
        applies_to: applies_to || 'all',
        expires_at: expires_at || null,
        is_active: true,
        created_by: req.user.id,
      });

      // If applies_to = 'specific', create CouponCodeCourse join rows
      if (applies_to === 'specific' && Array.isArray(course_ids) && course_ids.length > 0) {
        await CouponCodeCourse.bulkCreate(
          course_ids.map((course_id) => ({ coupon_id: coupon.id, course_id }))
        );
      }

      logger.info(`[Coupons] Created coupon '${coupon.code}' by admin ${req.user.id}`);
      return ApiResponse.created(res, { coupon });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/admin/coupons/:id
   * Update coupon fields.
   */
  static async update(req, res, next) {
    try {
      const coupon = await CouponCode.findByPk(req.params.id);
      if (!coupon) return ApiResponse.notFound(res, 'Coupon not found');

      const {
        description, discount_type, discount_value,
        min_purchase_amount, max_uses, per_user_limit,
        applies_to, expires_at, is_active, course_ids,
      } = req.body;

      await coupon.update({
        ...(description !== undefined && { description }),
        ...(discount_type && { discount_type }),
        ...(discount_value !== undefined && { discount_value }),
        ...(min_purchase_amount !== undefined && { min_purchase_amount }),
        ...(max_uses !== undefined && { max_uses }),
        ...(per_user_limit !== undefined && { per_user_limit }),
        ...(applies_to && { applies_to }),
        ...(expires_at !== undefined && { expires_at }),
        ...(is_active !== undefined && { is_active }),
      });

      // Update specific courses if provided
      if (applies_to === 'specific' && Array.isArray(course_ids)) {
        await CouponCodeCourse.destroy({ where: { coupon_id: coupon.id } });
        if (course_ids.length > 0) {
          await CouponCodeCourse.bulkCreate(
            course_ids.map((course_id) => ({ coupon_id: coupon.id, course_id }))
          );
        }
      }

      logger.info(`[Coupons] Updated coupon ${coupon.id} by admin ${req.user.id}`);
      return ApiResponse.success(res, { coupon });
    } catch (error) {
      next(error);
    }
  }

  /**
   * DELETE /api/admin/coupons/:id
   * Deactivate (soft delete) a coupon.
   */
  static async delete(req, res, next) {
    try {
      const coupon = await CouponCode.findByPk(req.params.id);
      if (!coupon) return ApiResponse.notFound(res, 'Coupon not found');

      await coupon.update({ is_active: false });
      logger.info(`[Coupons] Deactivated coupon ${coupon.id} by admin ${req.user.id}`);
      return ApiResponse.success(res, { message: 'Coupon deactivated' });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/admin/coupons/stats
   * Summary stats for the coupons dashboard.
   */
  static async getStats(req, res, next) {
    try {
      const [total, active, expired] = await Promise.all([
        CouponCode.count(),
        CouponCode.count({ where: { is_active: true } }),
        CouponCode.count({ where: { expires_at: { [Op.lt]: new Date() } } }),
      ]);
      const totalRedemptions = await CouponRedemption.count();
      return ApiResponse.success(res, { total, active, expired, totalRedemptions });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CouponsController;
