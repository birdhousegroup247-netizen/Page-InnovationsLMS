const { CourseModule, Course, ModuleContent } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

class ModuleController {
  // Get all modules for a course
  static async getCourseModules(req, res, next) {
    try {
      const { courseId } = req.params;

      const modules = await CourseModule.findAll({
        where: { course_id: courseId },
        include: [{ model: ModuleContent, as: 'contents' }],
        order: [['order_index', 'ASC']],
      });

      return ApiResponse.success(res, { modules });
    } catch (error) {
      next(error);
    }
  }

  // Create module
  static async createModule(req, res, next) {
    try {
      const { courseId } = req.params;
      const { title, description, order_index } = req.body;

      const course = await Course.findByPk(courseId);
      if (!course) throw new NotFoundError('Course not found');

      // Check ownership
      if (course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only add modules to your own courses');
      }

      const module = await CourseModule.create({
        course_id: courseId,
        title,
        description,
        order_index,
      });

      return ApiResponse.created(res, { module }, 'Module created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Update module
  static async updateModule(req, res, next) {
    try {
      const { moduleId } = req.params;
      const updates = req.body;

      const module = await CourseModule.findByPk(moduleId, {
        include: [{ model: Course, as: 'course' }],
      });

      if (!module) throw new NotFoundError('Module not found');

      // Check ownership
      if (module.course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only update your own course modules');
      }

      await module.update(updates);

      return ApiResponse.success(res, { module }, 'Module updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete module
  static async deleteModule(req, res, next) {
    try {
      const { moduleId } = req.params;

      const module = await CourseModule.findByPk(moduleId, {
        include: [{ model: Course, as: 'course' }],
      });

      if (!module) throw new NotFoundError('Module not found');

      // Check ownership
      if (module.course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only delete your own course modules');
      }

      await module.destroy();

      return ApiResponse.success(res, null, 'Module deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ModuleController;
