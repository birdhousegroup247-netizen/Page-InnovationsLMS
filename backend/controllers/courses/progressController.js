const { ContentProgress, ModuleContent, Enrollment, CourseModule } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');

class ProgressController {
  // Mark content as complete
  static async markContentComplete(req, res, next) {
    try {
      const { contentId } = req.params;
      const { watch_time_seconds, last_position_seconds } = req.body;

      const content = await ModuleContent.findByPk(contentId);
      if (!content) throw new NotFoundError('Content not found');

      const [progress, created] = await ContentProgress.findOrCreate({
        where: { student_id: req.user.id, content_id: contentId },
        defaults: {
          completed: true,
          watch_time_seconds: watch_time_seconds || 0,
          last_position_seconds: last_position_seconds || 0,
          completed_at: new Date(),
        },
      });

      if (!created && !progress.completed) {
        await progress.update({
          completed: true,
          watch_time_seconds: watch_time_seconds || progress.watch_time_seconds,
          completed_at: new Date(),
        });
      }

      // Update course progress
      await this.updateCourseProgress(req.user.id, content.module_id);

      return ApiResponse.success(res, { progress }, 'Content marked as complete');
    } catch (error) {
      next(error);
    }
  }

  // Update video progress
  static async updateProgress(req, res, next) {
    try {
      const { contentId } = req.params;
      const { watch_time_seconds, last_position_seconds } = req.body;

      await ContentProgress.upsert({
        student_id: req.user.id,
        content_id: contentId,
        watch_time_seconds,
        last_position_seconds,
        last_accessed: new Date(),
      });

      return ApiResponse.success(res, null, 'Progress saved');
    } catch (error) {
      next(error);
    }
  }

  // Helper to update course progress percentage
  static async updateCourseProgress(studentId, moduleId) {
    const module = await CourseModule.findByPk(moduleId);
    if (!module) return;

    // Get all content IDs for this course
    const allModules = await CourseModule.findAll({
      where: { course_id: module.course_id },
      include: [{ model: ModuleContent, as: 'contents', attributes: ['id'] }],
    });

    const allContentIds = allModules.flatMap(m => m.contents.map(c => c.id));
    const totalContent = allContentIds.length;

    if (totalContent === 0) return;

    // Count completed content
    const completedCount = await ContentProgress.count({
      where: {
        student_id: studentId,
        content_id: allContentIds,
        completed: true,
      },
    });

    const progressPercentage = (completedCount / totalContent) * 100;

    // Update enrollment
    const enrollment = await Enrollment.findOne({
      where: { student_id: studentId, course_id: module.course_id },
    });

    if (enrollment) {
      await enrollment.update({
        progress_percentage: progressPercentage.toFixed(2),
        last_accessed: new Date(),
        completed_at: progressPercentage === 100 ? new Date() : null,
      });
    }
  }
}

module.exports = ProgressController;
