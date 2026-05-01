const { ModuleContent, CourseModule, Course, Enrollment } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

// Returns true if the user can access non-preview content for the given course
async function _hasAccess(user, courseId) {
  if (!user) return false;
  if (['admin', 'super_admin', 'instructor'].includes(user.role)) return true;
  const enrollment = await Enrollment.findOne({ where: { student_id: user.id, course_id: courseId } });
  return !!enrollment;
}

class ContentController {
  // Get module contents
  static async getModuleContents(req, res, next) {
    try {
      const { moduleId } = req.params;

      const module = await CourseModule.findByPk(moduleId, {
        include: [{ model: Course, as: 'course', attributes: ['id', 'instructor_id'] }],
      });
      if (!module) throw new NotFoundError('Module not found');

      const contents = await ModuleContent.findAll({
        where: { module_id: moduleId },
        order: [['order_index', 'ASC']],
      });

      const canAccess = await _hasAccess(req.user, module.course_id);
      if (!canAccess) {
        // Return only preview-flagged lessons for unauthenticated / non-enrolled users
        return ApiResponse.success(res, { contents: contents.filter((c) => c.is_preview) });
      }

      return ApiResponse.success(res, { contents });
    } catch (error) {
      next(error);
    }
  }

  // Get content by ID
  static async getContentById(req, res, next) {
    try {
      const { contentId } = req.params;

      const content = await ModuleContent.findByPk(contentId, {
        include: [{ model: CourseModule, as: 'module', attributes: ['course_id'] }],
      });
      if (!content) throw new NotFoundError('Content not found');

      // Non-preview content requires enrollment (or instructor/admin role)
      if (!content.is_preview) {
        const canAccess = await _hasAccess(req.user, content.module.course_id);
        if (!canAccess) throw new ForbiddenError('Enroll in this course to access the content');
      }

      return ApiResponse.success(res, { content });
    } catch (error) {
      next(error);
    }
  }

  // Create content
  static async createContent(req, res, next) {
    try {
      const { moduleId } = req.params;
      const {
        title,
        description,
        content_type,
        youtube_url,
        youtube_video_id,
        youtube_duration_seconds,
        duration_minutes,
        document_url,
        document_file_size,
        article_content,
        order_index,
        is_preview,
      } = req.body;

      const module = await CourseModule.findByPk(moduleId, {
        include: [{ model: Course, as: 'course' }],
      });

      if (!module) throw new NotFoundError('Module not found');

      // Check ownership
      if (module.course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only add content to your own courses');
      }

      const content = await ModuleContent.create({
        module_id: moduleId,
        title,
        description,
        content_type,
        youtube_url,
        youtube_video_id,
        youtube_duration_seconds,
        duration_minutes,
        document_url,
        document_file_size,
        article_content,
        order_index,
        is_preview: is_preview || false,
      });

      return ApiResponse.created(res, { content }, 'Content created successfully');
    } catch (error) {
      next(error);
    }
  }

  // Update content
  static async updateContent(req, res, next) {
    try {
      const { contentId } = req.params;
      const updates = req.body;

      const content = await ModuleContent.findByPk(contentId, {
        include: [{ model: CourseModule, as: 'module', include: [{ model: Course, as: 'course' }] }],
      });

      if (!content) throw new NotFoundError('Content not found');

      // Check ownership
      if (content.module.course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only update your own course content');
      }

      await content.update(updates);

      return ApiResponse.success(res, { content }, 'Content updated successfully');
    } catch (error) {
      next(error);
    }
  }

  // Delete content
  static async deleteContent(req, res, next) {
    try {
      const { contentId } = req.params;

      const content = await ModuleContent.findByPk(contentId, {
        include: [{ model: CourseModule, as: 'module', include: [{ model: Course, as: 'course' }] }],
      });

      if (!content) throw new NotFoundError('Content not found');

      // Check ownership
      if (content.module.course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('You can only delete your own course content');
      }

      await content.destroy();

      return ApiResponse.success(res, null, 'Content deleted successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = ContentController;
