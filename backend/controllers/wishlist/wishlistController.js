const { Wishlist, Course, User, Category } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, BadRequestError } = require('../../utils/errors');

class WishlistController {
  // GET /api/wishlist — get current user's wishlist
  static async getMyWishlist(req, res, next) {
    try {
      const studentId = req.user.id;

      const items = await Wishlist.findAll({
        where: { student_id: studentId },
        include: [
          {
            model: Course,
            as: 'course',
            attributes: [
              'id', 'title', 'description', 'thumbnail_url',
              'difficulty', 'duration', 'price', 'average_rating',
              'enrolled_count', 'status',
            ],
            include: [
              {
                model: User,
                as: 'instructor',
                attributes: ['id', 'full_name', 'avatar_url'],
              },
              {
                model: Category,
                as: 'category',
                attributes: ['id', 'name'],
              },
            ],
          },
        ],
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, {
        wishlist: items.map((item) => ({
          wishlist_id: item.id,
          added_at: item.created_at,
          course: item.course,
        })),
        total: items.length,
      });
    } catch (error) {
      next(error);
    }
  }

  // POST /api/wishlist/:courseId — add course to wishlist
  static async addToWishlist(req, res, next) {
    try {
      const studentId = req.user.id;
      const courseId = parseInt(req.params.courseId);

      const course = await Course.findByPk(courseId);
      if (!course) throw new NotFoundError('Course not found');

      const [item, created] = await Wishlist.findOrCreate({
        where: { student_id: studentId, course_id: courseId },
      });

      if (!created) {
        return ApiResponse.success(res, { wishlisted: true }, 'Already in wishlist');
      }

      return ApiResponse.created(res, { wishlisted: true, wishlist_id: item.id }, 'Added to wishlist');
    } catch (error) {
      next(error);
    }
  }

  // DELETE /api/wishlist/:courseId — remove course from wishlist
  static async removeFromWishlist(req, res, next) {
    try {
      const studentId = req.user.id;
      const courseId = parseInt(req.params.courseId);

      const deleted = await Wishlist.destroy({
        where: { student_id: studentId, course_id: courseId },
      });

      if (!deleted) throw new NotFoundError('Course not in wishlist');

      return ApiResponse.success(res, { wishlisted: false }, 'Removed from wishlist');
    } catch (error) {
      next(error);
    }
  }

  // GET /api/wishlist/:courseId/check — is this course wishlisted?
  static async checkWishlist(req, res, next) {
    try {
      const studentId = req.user.id;
      const courseId = parseInt(req.params.courseId);

      const item = await Wishlist.findOne({
        where: { student_id: studentId, course_id: courseId },
      });

      return ApiResponse.success(res, { wishlisted: !!item });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WishlistController;
