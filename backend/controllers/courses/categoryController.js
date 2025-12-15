const { Category } = require('../../models');
const ApiResponse = require('../../utils/response');

class CategoryController {
  static async getAllCategories(req, res, next) {
    try {
      const categories = await Category.findAll({
        where: { is_active: true },
        include: [{ model: Category, as: 'subcategories', where: { is_active: true }, required: false }],
        order: [['display_order', 'ASC']],
      });

      return ApiResponse.success(res, { categories });
    } catch (error) {
      next(error);
    }
  }

  static async getMainCategories(req, res, next) {
    try {
      const categories = await Category.getMainCategories();
      return ApiResponse.success(res, { categories });
    } catch (error) {
      next(error);
    }
  }

  static async getSubCategories(req, res, next) {
    try {
      const { parentId } = req.params;
      const categories = await Category.getSubCategories(parentId);
      return ApiResponse.success(res, { categories });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CategoryController;
