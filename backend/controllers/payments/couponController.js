/**
 * Coupon Controller
 * Validates and applies coupon codes during checkout.
 */

const { CouponCode, CouponCodeCourse, CouponRedemption, Course } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { Op } = require('sequelize');

class CouponController {
  /**
   * POST /api/coupons/validate
   * Validates a coupon code for a given course + user.
   * Returns the discount details if valid.
   */
  static async validateCoupon(req, res, next) {
    try {
      const { code, course_id } = req.body;
      const userId = req.user.id;

      if (!code || !course_id) {
        return ApiResponse.badRequest(res, 'Coupon code and course ID are required');
      }

      const coupon = await CouponCode.findOne({
        where: {
          code: code.toUpperCase().trim(),
          is_active: true,
        },
        include: [
          { model: CouponCodeCourse, as: 'applicable_courses' },
        ],
      });

      if (!coupon) {
        return ApiResponse.badRequest(res, 'Invalid or inactive coupon code');
      }

      // Check expiry
      if (coupon.expires_at && new Date() > new Date(coupon.expires_at)) {
        return ApiResponse.badRequest(res, 'This coupon has expired');
      }

      // Check total uses
      if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
        return ApiResponse.badRequest(res, 'This coupon has reached its usage limit');
      }

      // Check per-user limit
      const userRedemptions = await CouponRedemption.count({
        where: { coupon_code_id: coupon.id, user_id: userId },
      });
      if (userRedemptions >= coupon.per_user_limit) {
        return ApiResponse.badRequest(res, 'You have already used this coupon');
      }

      // Check if coupon applies to this course
      if (coupon.applies_to === 'specific') {
        const appliesToCourse = coupon.applicable_courses.some(
          (c) => c.course_id === parseInt(course_id)
        );
        if (!appliesToCourse) {
          return ApiResponse.badRequest(res, 'This coupon is not valid for this course');
        }
      }

      // Get course price to validate minimum purchase
      const course = await Course.findByPk(course_id, { attributes: ['id', 'title', 'price'] });
      if (!course) {
        return ApiResponse.badRequest(res, 'Course not found');
      }

      const coursePrice = parseFloat(course.price);

      if (coupon.min_purchase_amount > 0 && coursePrice < parseFloat(coupon.min_purchase_amount)) {
        return ApiResponse.badRequest(
          res,
          `This coupon requires a minimum purchase of $${coupon.min_purchase_amount}`
        );
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === 'percentage') {
        discountAmount = (coursePrice * parseFloat(coupon.discount_value)) / 100;
      } else {
        discountAmount = Math.min(parseFloat(coupon.discount_value), coursePrice);
      }
      discountAmount = parseFloat(discountAmount.toFixed(2));
      const finalPrice = parseFloat((coursePrice - discountAmount).toFixed(2));

      logger.info(`Coupon ${code} validated for user ${userId}, course ${course_id}: -$${discountAmount}`);

      return ApiResponse.success(res, {
        valid: true,
        coupon_code_id: coupon.id,
        code: coupon.code,
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        original_price: coursePrice,
        discount_amount: discountAmount,
        final_price: finalPrice,
      }, 'Coupon applied successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CouponController;
