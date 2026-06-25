const { ContentProgress, ModuleContent, Enrollment, CourseModule, Certificate, Course, User } = require('../../models');
const ApiResponse = require('../../utils/response');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const ActivityController = require('../activity/activityController');
const NotificationsController = require('../notifications/notificationsController');
const CertificateService = require('../../services/certificate/certificateService');
const emailService = require('../../services/email/emailService');
const BadgesController = require('../badges/badgesController');

class ProgressController {
  // Mark content as complete
  static async markContentComplete(req, res, next) {
    try {
      const { contentId } = req.params;
      const { watch_time_seconds, last_position_seconds } = req.body || {};

      const content = await ModuleContent.findByPk(contentId, {
        include: [{ model: CourseModule, as: 'module', attributes: ['course_id'] }],
      });
      if (!content) throw new NotFoundError('Content not found');

      // Enforce drip lock server-side
      if (content.unlock_after_days || content.unlock_date) {
        const enrollment = await Enrollment.findOne({
          where: { student_id: req.user.id, course_id: content.module?.course_id },
          attributes: ['enrollment_date'],
        });
        if (enrollment) {
          const enrolledAt = new Date(enrollment.enrollment_date);
          if (content.unlock_date && new Date() < new Date(content.unlock_date)) {
            throw new ForbiddenError('This lesson is not available yet');
          }
          if (content.unlock_after_days) {
            const unlockAt = new Date(enrolledAt);
            unlockAt.setDate(unlockAt.getDate() + content.unlock_after_days);
            if (new Date() < unlockAt) {
              throw new ForbiddenError('This lesson is not available yet');
            }
          }
        }
      }

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

      // Update course progress (non-critical)
      try {
        await ProgressController.updateCourseProgress(req.user.id, content.module_id);
      } catch (progressError) {
        console.error('Failed to update course progress:', progressError.message, progressError.stack);
      }

      // Log lesson_complete for streak tracking (only when newly completed)
      if (created || !progress.completed) {
        ActivityController.logFromRequest(req, 'lesson_complete', 'content', parseInt(contentId)).catch(() => {});
      }

      return ApiResponse.success(res, { progress }, 'Content marked as complete');
    } catch (error) {
      console.error('markContentComplete error:', error.message, error.stack);
      next(error);
    }
  }

  // Update video progress
  static async updateProgress(req, res, next) {
    try {
      const { contentId } = req.params;
      const { watch_time_seconds, last_position_seconds } = req.body || {};

      await ContentProgress.upsert({
        student_id: req.user.id,
        content_id: contentId,
        watch_time_seconds,
        last_position_seconds,
        last_accessed: new Date(),
      });

      // Log activity so streak tracking picks this up
      ActivityController.logFromRequest(req, 'content_view', 'content', parseInt(contentId)).catch(() => {});

      return ApiResponse.success(res, null, 'Progress saved');
    } catch (error) {
      next(error);
    }
  }

  // Get course progress for all lessons
  static async getCourseProgress(req, res, next) {
    try {
      const { courseId } = req.params;

      // Get all module content IDs for this course
      const modules = await CourseModule.findAll({
        where: { course_id: courseId },
        include: [{ model: ModuleContent, as: 'contents', attributes: ['id'] }],
      });

      const allContentIds = modules.flatMap(m => m.contents.map(c => c.id));

      // Get progress for all content
      const progressRecords = await ContentProgress.findAll({
        where: {
          student_id: req.user.id,
          content_id: allContentIds,
        },
      });

      // Convert to object indexed by content ID
      const progress = {};
      progressRecords.forEach(record => {
        progress[record.content_id] = {
          completed: record.completed,
          completed_at: record.completed_at,
          watch_time_seconds: record.watch_time_seconds,
          last_position_seconds: record.last_position_seconds,
          last_accessed: record.last_accessed,
        };
      });

      return ApiResponse.success(res, { progress });
    } catch (error) {
      next(error);
    }
  }

  // Helper to update course progress percentage.
  //
  // Two LMS-correctness rules this enforces:
  //
  //  1) Drip-locked content shouldn't be in the denominator. A student
  //     on day 3 of a drip schedule who has watched everything they
  //     can reach should see ~100%, not "3/10 = 30%". Otherwise the
  //     bar effectively penalises them for keeping up with the
  //     instructor's drip plan.
  //
  //  2) completed_at is one-way. Once a student finishes a course we
  //     never un-finish it, even if the instructor later adds new
  //     content and their % drops back below 100. Their certificate
  //     was already issued; flipping completed_at to null would
  //     wrongly move the course out of "Completed" filters and
  //     reset the celebration UI.
  static async updateCourseProgress(studentId, moduleId) {
    const module = await CourseModule.findByPk(moduleId);
    if (!module) return;

    // Pull every content in the course with the fields we need to
    // tell whether it's currently accessible to this student.
    const allModules = await CourseModule.findAll({
      where: { course_id: module.course_id },
      include: [{
        model: ModuleContent,
        as: 'contents',
        attributes: ['id', 'unlock_date', 'unlock_after_days'],
      }],
    });
    const allContents = allModules.flatMap(m => m.contents || []);
    if (allContents.length === 0) return;

    // Enrollment row — also gives us the enrolled-at timestamp for
    // unlock_after_days math.
    const enrollment = await Enrollment.findOne({
      where: { student_id: studentId, course_id: module.course_id },
    });
    if (!enrollment) return;

    const now = new Date();
    const enrolledAt = enrollment.enrollment_date ? new Date(enrollment.enrollment_date) : null;
    const isAccessible = (c) => {
      if (c.unlock_date) {
        return new Date(c.unlock_date) <= now;
      }
      if (c.unlock_after_days && enrolledAt) {
        const unlockAt = new Date(enrolledAt);
        unlockAt.setDate(unlockAt.getDate() + c.unlock_after_days);
        return unlockAt <= now;
      }
      return true;
    };

    // Pool of content the student can actually reach right now. If
    // every lesson is drip-locked we fall back to the full set so we
    // don't end up dividing by zero on day-1 of a heavy drip course.
    const accessible = allContents.filter(isAccessible);
    const denomIds = (accessible.length > 0 ? accessible : allContents).map(c => c.id);
    const totalContent = denomIds.length;

    const completedCount = await ContentProgress.count({
      where: {
        student_id: studentId,
        content_id: denomIds,
        completed: true,
      },
    });

    const progressPercentage = (completedCount / totalContent) * 100;
    // Defensive — strict === 100 on a float can drift; treat
    // anything within rounding tolerance as fully complete.
    const isComplete = progressPercentage >= 99.999;

    const wasCompleted = !!enrollment.completed_at;
    await enrollment.update({
      progress_percentage: progressPercentage.toFixed(2),
      last_accessed: now,
      // Set once, never unset. If the student was ever 100% complete
      // we keep that timestamp so their certificate + the Completed
      // filter on My Courses stay truthful even if the instructor
      // later adds new lessons.
      completed_at: isComplete ? (enrollment.completed_at || now) : enrollment.completed_at,
    });

    // Auto-issue certificate when course first reaches 100%
    if (isComplete && !wasCompleted) {
        try {
          const existing = await Certificate.findOne({ where: { student_id: studentId, course_id: module.course_id } });
          if (!existing) {
            const courseData = await Course.findByPk(module.course_id, {
              include: [{ model: User, as: 'instructor', attributes: ['full_name'] }],
            });
            const studentData = await User.findByPk(studentId, { attributes: ['full_name'] });
            if (courseData && studentData) {
              const certificateId = CertificateService.generateCertificateId(enrollment.id, studentId);
              await Certificate.create({
                certificate_id: certificateId,
                student_id: studentId,
                course_id: module.course_id,
                student_name: studentData.full_name,
                course_title: courseData.title,
                issue_date: new Date(),
              });
              await NotificationsController.createNotification({
                user_id: studentId,
                type: 'certificate_issued',
                title: 'Certificate Earned!',
                message: `Congratulations! You have completed "${courseData.title}" and your certificate is ready.`,
                link: `/certificates`,
                priority: 'high',
              });

              // Check and award badges for course completion (fire-and-forget)
              BadgesController.checkAndAward(studentId, 'course_complete').catch(() => {});

              // Send completion email (fire-and-forget)
              const studentEmail = await User.findByPk(studentId, { attributes: ['email', 'full_name'] });
              if (studentEmail) {
                emailService.sendCourseCompletionEmail(
                  studentEmail.email,
                  studentEmail.full_name,
                  courseData,
                  `${process.env.FRONTEND_URL || 'http://localhost:5173'}/certificates`
                ).catch((e) => console.error('Completion email failed:', e.message));
              }
            }
          }
        } catch (certErr) {
          console.error('Auto-certificate failed (non-critical):', certErr.message);
        }
      }
  }
}

module.exports = ProgressController;
