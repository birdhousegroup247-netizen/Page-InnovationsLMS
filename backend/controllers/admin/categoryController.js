const { Category, Course } = require('../../models');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { BadRequestError, NotFoundError } = require('../../utils/errors');
const { Op } = require('sequelize');

/**
 * Admin Category Controller
 * Manages categories (CRUD operations)
 */

class AdminCategoryController {
  /**
   * Get all categories (including inactive)
   * GET /api/admin/categories
   */
  static async getAllCategories(req, res, next) {
    try {
      const { include_inactive } = req.query;

      const where = {};
      if (include_inactive !== 'true') {
        where.is_active = true;
      }

      const categories = await Category.findAll({
        where,
        include: [
          {
            model: Category,
            as: 'subcategories',
            required: false,
          },
          {
            model: Category,
            as: 'parent',
            required: false,
          },
        ],
        order: [
          ['parent_category_id', 'ASC'], // MySQL automatically places NULL values first when sorting ASC
          ['display_order', 'ASC'],
          ['name', 'ASC'],
        ],
      });

      // Count courses per category
      const categoriesWithCounts = await Promise.all(
        categories.map(async (category) => {
          const courseCount = await Course.count({
            where: { category_id: category.id },
          });
          return {
            ...category.toJSON(),
            course_count: courseCount,
          };
        })
      );

      logger.info(`Admin ${req.user.email} fetched ${categories.length} categories`);

      return ApiResponse.success(res, {
        categories: categoriesWithCounts,
        count: categoriesWithCounts.length,
      }, 'Categories retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category by ID
   * GET /api/admin/categories/:id
   */
  static async getCategoryById(req, res, next) {
    try {
      const { id } = req.params;

      const category = await Category.findByPk(id, {
        include: [
          {
            model: Category,
            as: 'subcategories',
          },
          {
            model: Category,
            as: 'parent',
          },
        ],
      });

      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Get course count
      const courseCount = await Course.count({
        where: { category_id: category.id },
      });

      return ApiResponse.success(res, {
        category: {
          ...category.toJSON(),
          course_count: courseCount,
        },
      }, 'Category retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Create new category
   * POST /api/admin/categories
   */
  static async createCategory(req, res, next) {
    try {
      const { name, parent_category_id, icon, color, description, display_order, is_active } = req.body;

      // Validate name
      if (!name || name.trim().length === 0) {
        throw new BadRequestError('Category name is required');
      }

      // Check if category name already exists
      const existingCategory = await Category.findOne({
        where: {
          name: {
            [Op.iLike]: name.trim(),
          },
        },
      });

      if (existingCategory) {
        throw new BadRequestError('Category with this name already exists');
      }

      // If parent_category_id provided, verify it exists
      if (parent_category_id) {
        const parentCategory = await Category.findByPk(parent_category_id);
        if (!parentCategory) {
          throw new NotFoundError('Parent category not found');
        }
      }

      // Create category
      const category = await Category.create({
        name: name.trim(),
        parent_category_id: parent_category_id || null,
        icon: icon || null,
        color: color || null,
        description: description || null,
        display_order: display_order || 0,
        is_active: is_active !== undefined ? is_active : true,
      });

      logger.info(`Admin ${req.user.email} created category: ${category.name} (ID: ${category.id})`);

      return ApiResponse.created(res, {
        category,
      }, 'Category created successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Update category
   * PUT /api/admin/categories/:id
   */
  static async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const { name, parent_category_id, icon, color, description, display_order, is_active } = req.body;

      // Find category
      const category = await Category.findByPk(id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Validate name if provided
      if (name && name.trim().length === 0) {
        throw new BadRequestError('Category name cannot be empty');
      }

      // Check if new name conflicts with existing category
      if (name && name.trim().toLowerCase() !== category.name.toLowerCase()) {
        const existingCategory = await Category.findOne({
          where: {
            name: {
              [Op.iLike]: name.trim(),
            },
            id: {
              [Op.ne]: id,
            },
          },
        });

        if (existingCategory) {
          throw new BadRequestError('Category with this name already exists');
        }
      }

      // Prevent setting parent to itself or creating circular references
      if (parent_category_id) {
        if (parseInt(parent_category_id) === parseInt(id)) {
          throw new BadRequestError('Category cannot be its own parent');
        }

        // Check if parent exists
        const parentCategory = await Category.findByPk(parent_category_id);
        if (!parentCategory) {
          throw new NotFoundError('Parent category not found');
        }

        // Check if parent is a subcategory of this category (would create circular reference)
        if (parentCategory.parent_category_id && parseInt(parentCategory.parent_category_id) === parseInt(id)) {
          throw new BadRequestError('Cannot create circular category reference');
        }
      }

      // Update category
      if (name) category.name = name.trim();
      if (parent_category_id !== undefined) category.parent_category_id = parent_category_id || null;
      if (icon !== undefined) category.icon = icon || null;
      if (color !== undefined) category.color = color || null;
      if (description !== undefined) category.description = description || null;
      if (display_order !== undefined) category.display_order = display_order;
      if (is_active !== undefined) category.is_active = is_active;

      await category.save();

      logger.info(`Admin ${req.user.email} updated category: ${category.name} (ID: ${category.id})`);

      return ApiResponse.success(res, {
        category,
      }, 'Category updated successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete category
   * DELETE /api/admin/categories/:id
   */
  static async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;

      // Find category
      const category = await Category.findByPk(id);
      if (!category) {
        throw new NotFoundError('Category not found');
      }

      // Check if category has courses
      const courseCount = await Course.count({
        where: { category_id: id },
      });

      if (courseCount > 0) {
        throw new BadRequestError(
          `Cannot delete category with ${courseCount} course(s). Please reassign or delete the courses first.`
        );
      }

      // Check if category has subcategories
      const subcategoryCount = await Category.count({
        where: { parent_category_id: id },
      });

      if (subcategoryCount > 0) {
        throw new BadRequestError(
          `Cannot delete category with ${subcategoryCount} subcategory(ies). Please reassign or delete the subcategories first.`
        );
      }

      // Delete category
      await category.destroy();

      logger.warn(`Admin ${req.user.email} deleted category: ${category.name} (ID: ${category.id})`);

      return ApiResponse.success(res, null, 'Category deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get category statistics
   * GET /api/admin/categories/stats
   */
  static async getStats(req, res, next) {
    try {
      const totalCategories = await Category.count();
      const activeCategories = await Category.count({ where: { is_active: true } });
      const mainCategories = await Category.count({ where: { parent_category_id: null } });
      const subCategories = await Category.count({ where: { parent_category_id: { [Op.ne]: null } } });

      const stats = {
        total: totalCategories,
        active: activeCategories,
        inactive: totalCategories - activeCategories,
        main_categories: mainCategories,
        subcategories: subCategories,
      };

      logger.info(`Admin ${req.user.email} fetched category stats`);

      return ApiResponse.success(res, stats, 'Category statistics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AdminCategoryController;
