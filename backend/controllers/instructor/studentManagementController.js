const { Course, Enrollment, User, ContentProgress, ModuleContent, AssignedTestAttempt, AssignedTest, sequelize, Notification } = require('../../models');
const ApiResponse = require('../../utils/response');
const { Op } = require('sequelize');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');
const emailService = require('../../services/email/emailService');
const logger = require('../../utils/logger');

/**
 * Student Management Controller for Instructors
 * Provides student tracking and progress monitoring
 */
class StudentManagementController {
  /**
   * Get all students enrolled in a specific course
   * GET /api/instructor/courses/:courseId/students
   */
  static async getCourseStudents(req, res, next) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.id;
      const { status, search, page = 1, limit = 20 } = req.query;

      // Verify instructor owns this course
      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Allow if instructor owns course OR user is admin
      if (course.instructor_id !== instructorId &&
        req.user.role !== 'admin' &&
        req.user.role !== 'super_admin') {
        throw new ForbiddenError('You do not have access to this course');
      }

      // Build where clause
      const whereClause = { course_id: courseId };

      // Filter by status (calculated from completed_at and progress_percentage)
      if (status === 'completed') {
        whereClause.completed_at = { [Op.ne]: null };
      } else if (status === 'in_progress') {
        whereClause.completed_at = null;
        whereClause.progress_percentage = { [Op.gt]: 0 };
      } else if (status === 'not_started') {
        whereClause.progress_percentage = 0;
      }

      // Build student search
      const studentWhere = {};
      if (search) {
        studentWhere[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      // Get enrollments with pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: enrollments } = await Enrollment.findAndCountAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email', 'profile_picture', 'phone'],
            where: studentWhere
          }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [['enrollment_date', 'DESC']],
        distinct: true
      });

      // Get progress details for each student
      const studentsWithProgress = await Promise.all(
        enrollments.map(async (enrollment) => {
          // Get completed content count using CourseModule association
          const { CourseModule } = require('../../models');
          const completedContent = await ContentProgress.count({
            where: {
              student_id: enrollment.student_id,
              completed: true  // Fixed: use completed boolean instead of status
            },
            include: [{
              model: ModuleContent,
              as: 'content',
              required: true,
              include: [{
                model: CourseModule,
                as: 'module',
                required: true,
                where: { course_id: courseId },
                attributes: []
              }]
            }]
          });

          // Get total content count using CourseModule association
          const totalContent = await ModuleContent.count({
            include: [{
              model: CourseModule,
              as: 'module',
              required: true,
              where: { course_id: courseId },
              attributes: []
            }]
          });

          // Calculate status based on progress and completion
          let enrollmentStatus = 'not_started';
          if (enrollment.completed_at) {
            enrollmentStatus = 'completed';
          } else if (enrollment.progress_percentage > 0) {
            enrollmentStatus = 'in_progress';
          }

          return {
            enrollment_id: enrollment.id,
            student_id: enrollment.student_id,
            course_id: courseId,
            // Add nested objects for frontend compatibility
            student: {
              id: enrollment.student_id,
              full_name: enrollment.student?.full_name,
              email: enrollment.student?.email,
              profile_picture: enrollment.student?.profile_picture,
              phone: enrollment.student?.phone
            },
            course: {
              id: courseId,
              title: course.title
            },
            // Keep flat properties for backward compatibility
            student_name: enrollment.student?.full_name,
            student_email: enrollment.student?.email,
            student_avatar: enrollment.student?.profile_picture,
            student_phone: enrollment.student?.phone,
            enrollment_date: enrollment.enrollment_date,
            progress_percentage: parseFloat(enrollment.progress_percentage) || 0,
            status: enrollmentStatus,
            completed_content: completedContent,
            total_content: totalContent,
            last_accessed: enrollment.last_accessed,
            completed_at: enrollment.completed_at
          };
        })
      );

      return ApiResponse.success(res, {
        students: studentsWithProgress,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }, 'Course students retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get detailed progress for a specific student in a course
   * GET /api/instructor/students/:studentId/progress/:courseId
   */
  static async getStudentProgress(req, res, next) {
    try {
      const { studentId, courseId } = req.params;
      const instructorId = req.user.id;

      // Verify instructor owns this course
      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      if (course.instructor_id !== instructorId &&
        req.user.role !== 'admin' &&
        req.user.role !== 'super_admin') {
        throw new ForbiddenError('You do not have access to this course');
      }

      // Get enrollment
      const enrollment = await Enrollment.findOne({
        where: {
          student_id: studentId,
          course_id: courseId
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email', 'profile_picture']
          }
        ]
      });

      if (!enrollment) {
        throw new NotFoundError('Student not enrolled in this course');
      }

      // Get all content with progress. Column names had drifted from the
      // actual schema: module_contents uses duration_minutes (not duration);
      // content_progress uses `completed` (boolean) and watch_time_seconds
      // (not `status`/`time_spent`). The wrong names made the whole query
      // 500 with "column X does not exist".
      const modules = await sequelize.query(`
        SELECT
          m.id as module_id,
          m.title as module_title,
          m.order_index as module_order,
          mc.id as content_id,
          mc.title as content_title,
          mc.content_type,
          mc.duration_minutes as duration,
          mc.order_index as content_order,
          cp.completed as progress_completed,
          cp.completed_at,
          cp.watch_time_seconds as time_spent
        FROM course_modules m
        LEFT JOIN module_contents mc ON m.id = mc.module_id
        LEFT JOIN content_progress cp ON mc.id = cp.content_id AND cp.student_id = :studentId
        WHERE m.course_id = :courseId
        ORDER BY m.order_index, mc.order_index
      `, {
        replacements: { studentId, courseId },
        type: sequelize.QueryTypes.SELECT
      });

      // Group by modules
      const moduleMap = {};
      modules.forEach(row => {
        if (!moduleMap[row.module_id]) {
          moduleMap[row.module_id] = {
            module_id: row.module_id,
            module_title: row.module_title,
            module_order: row.module_order,
            contents: []
          };
        }

        if (row.content_id) {
          // ContentProgress stores a boolean `completed` flag (not the
          // not_started/in_progress/completed string the FE expects), so
          // map it: row missing → not_started; completed=true → completed;
          // present-but-incomplete → in_progress.
          let status = 'not_started';
          if (row.progress_completed === true) status = 'completed';
          else if (row.progress_completed === false) status = 'in_progress';

          moduleMap[row.module_id].contents.push({
            content_id: row.content_id,
            content_title: row.content_title,
            content_type: row.content_type,
            duration: row.duration,
            content_order: row.content_order,
            status,
            completed_at: row.completed_at,
            time_spent: row.time_spent
          });
        }
      });

      const progressByModule = Object.values(moduleMap);

      // Calculate status based on progress and completion
      let enrollmentStatus = 'not_started';
      if (enrollment.completed_at) {
        enrollmentStatus = 'completed';
      } else if (enrollment.progress_percentage > 0) {
        enrollmentStatus = 'in_progress';
      }

      return ApiResponse.success(res, {
        student: {
          id: enrollment.student.id,
          name: enrollment.student.full_name,
          email: enrollment.student.email,
          avatar: enrollment.student.profile_picture
        },
        enrollment: {
          enrollment_date: enrollment.enrollment_date,
          status: enrollmentStatus,
          progress_percentage: parseFloat(enrollment.progress_percentage) || 0,
          last_accessed: enrollment.last_accessed,
          completed_at: enrollment.completed_at
        },
        progress_by_module: progressByModule
      }, 'Student progress retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get test results for a specific student
   * GET /api/instructor/students/:studentId/test-results
   */
  static async getStudentTestResults(req, res, next) {
    try {
      const { studentId } = req.params;
      const instructorId = req.user.id;
      const { courseId } = req.query;

      // Build where clause for tests
      const testWhere = { created_by: instructorId };

      // Get all tests created by instructor
      const tests = await AssignedTest.findAll({
        where: testWhere,
        attributes: ['id']
      });

      const testIds = tests.map(t => t.id);

      if (testIds.length === 0) {
        return ApiResponse.success(res, {
          test_results: []
        }, 'No test results found');
      }

      // Get all attempts by this student for instructor's tests
      const attempts = await AssignedTestAttempt.findAll({
        where: {
          student_id: studentId,
          test_id: { [Op.in]: testIds }
        },
        include: [
          {
            model: AssignedTest,
            as: 'test',
            attributes: ['id', 'title', 'total_marks', 'passing_score'],
            include: courseId ? [{
              model: Course,
              as: 'course',
              where: { id: courseId },
              attributes: ['id', 'title']
            }] : []
          }
        ],
        order: [['completed_at', 'DESC']]
      });

      const testResults = attempts.map(attempt => ({
        attempt_id: attempt.id,
        test_id: attempt.test_id,
        test_title: attempt.test?.title,
        course_title: attempt.test?.course?.title,
        score: attempt.score,
        total_marks: attempt.test?.total_marks,
        percentage: attempt.percentage,
        passing_score: attempt.test?.passing_score,
        passed: attempt.percentage >= attempt.test?.passing_score,
        time_spent: attempt.time_spent,
        completed_at: attempt.completed_at,
        attempt_number: attempt.attempt_number
      }));

      return ApiResponse.success(res, {
        student_id: studentId,
        test_results: testResults,
        total_attempts: testResults.length,
        average_score: testResults.length > 0
          ? testResults.reduce((sum, t) => sum + t.percentage, 0) / testResults.length
          : 0
      }, 'Student test results retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get enrollment details for a course
   * GET /api/instructor/courses/:courseId/enrollments
   */
  static async getCourseEnrollments(req, res, next) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.id;
      const { startDate, endDate, status } = req.query;

      // Verify instructor owns this course
      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      if (course.instructor_id !== instructorId &&
        req.user.role !== 'admin' &&
        req.user.role !== 'super_admin') {
        throw new ForbiddenError('You do not have access to this course');
      }

      // Build where clause
      const whereClause = { course_id: courseId };

      // Filter by status (calculated from completed_at and progress_percentage)
      if (status === 'completed') {
        whereClause.completed_at = { [Op.ne]: null };
      } else if (status === 'in_progress') {
        whereClause.completed_at = null;
        whereClause.progress_percentage = { [Op.gt]: 0 };
      } else if (status === 'not_started') {
        whereClause.progress_percentage = 0;
      }

      if (startDate || endDate) {
        whereClause.enrollment_date = {};
        if (startDate) {
          whereClause.enrollment_date[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          whereClause.enrollment_date[Op.lte] = new Date(endDate);
        }
      }

      const enrollments = await Enrollment.findAll({
        where: whereClause,
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email', 'profile_picture']
          }
        ],
        order: [['enrollment_date', 'DESC']]
      });

      // Calculate statistics
      const stats = {
        total: enrollments.length,
        in_progress: enrollments.filter(e => !e.completed_at && e.progress_percentage > 0).length,
        completed: enrollments.filter(e => e.completed_at !== null).length,
        not_started: enrollments.filter(e => e.progress_percentage === 0).length,
        avg_progress: enrollments.length > 0
          ? enrollments.reduce((sum, e) => sum + (parseFloat(e.progress_percentage) || 0), 0) / enrollments.length
          : 0
      };

      return ApiResponse.success(res, {
        enrollments: enrollments.map(e => {
          // Calculate status
          let enrollmentStatus = 'not_started';
          if (e.completed_at) {
            enrollmentStatus = 'completed';
          } else if (e.progress_percentage > 0) {
            enrollmentStatus = 'in_progress';
          }

          return {
            id: e.id,
            student_id: e.student_id,
            student_name: e.student?.full_name,
            student_email: e.student?.email,
            student_avatar: e.student?.profile_picture,
            enrollment_date: e.enrollment_date,
            progress_percentage: parseFloat(e.progress_percentage) || 0,
            status: enrollmentStatus,
            last_accessed: e.last_accessed,
            completed_at: e.completed_at
          };
        }),
        stats
      }, 'Course enrollments retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all students enrolled in any of the instructor's courses
   * GET /api/instructor/students
   */
  static async getAllStudents(req, res, next) {
    try {
      const instructorId = req.user.id;
      const { search, page = 1, limit = 20 } = req.query;

      // Get all courses by this instructor
      const courses = await Course.findAll({
        where: { instructor_id: instructorId },
        attributes: ['id', 'title']
      });

      const courseIds = courses.map(c => c.id);

      if (courseIds.length === 0) {
        return ApiResponse.success(res, {
          students: [],
          pagination: {
            total: 0,
            page: 1,
            limit: parseInt(limit),
            totalPages: 0
          }
        }, 'No students found');
      }

      // Build student search
      const studentWhere = {};
      if (search) {
        studentWhere[Op.or] = [
          { full_name: { [Op.like]: `%${search}%` } },
          { email: { [Op.like]: `%${search}%` } }
        ];
      }

      // Get unique students across all courses
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: enrollments } = await Enrollment.findAndCountAll({
        where: {
          course_id: { [Op.in]: courseIds }
        },
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email', 'profile_picture', 'phone'],
            where: studentWhere
          },
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title']
          }
        ],
        limit: parseInt(limit),
        offset: offset,
        order: [['enrollment_date', 'DESC']],
        distinct: true,
        col: 'student_id'
      });

      // Format student data
      const students = enrollments.map(enrollment => ({
        enrollment_id: enrollment.id,
        student_id: enrollment.student_id,
        student_name: enrollment.student?.full_name,
        student_email: enrollment.student?.email,
        student_avatar: enrollment.student?.profile_picture,
        student_phone: enrollment.student?.phone,
        course_id: enrollment.course_id,
        course_title: enrollment.course?.title,
        enrollment_date: enrollment.enrollment_date,
        progress_percentage: parseFloat(enrollment.progress_percentage) || 0,
        last_accessed: enrollment.last_accessed,
        completed_at: enrollment.completed_at
      }));

      return ApiResponse.success(res, {
        students,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      }, 'All students retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
  /**
   * Bulk enroll students by email list
   * POST /api/instructor/courses/:courseId/bulk-enroll
   * Body: { emails: ['a@b.com', ...] }
   */
  static async bulkEnroll(req, res, next) {
    try {
      const { courseId } = req.params;
      const { emails } = req.body;

      if (!Array.isArray(emails) || emails.length === 0) {
        return ApiResponse.error(res, 'Provide an array of emails', 400);
      }
      if (emails.length > 200) {
        return ApiResponse.error(res, 'Maximum 200 emails per request', 400);
      }

      const course = await Course.findByPk(courseId);
      if (!course) throw new NotFoundError('Course not found');
      if (course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Not authorized');
      }

      const normalised = [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
      const users = await User.findAll({ where: { email: normalised, role: 'student' }, attributes: ['id', 'full_name', 'email'] });

      const results = { enrolled: [], already_enrolled: [], not_found: [] };

      const notFoundEmails = normalised.filter((e) => !users.find((u) => u.email === e));
      results.not_found = notFoundEmails;

      for (const user of users) {
        const [, created] = await Enrollment.findOrCreate({
          where: { student_id: user.id, course_id: courseId },
          defaults: { student_id: user.id, course_id: courseId, status: 'active' },
        });
        if (created) {
          results.enrolled.push(user.email);
          // Notify the student
          await Notification.create({
            user_id: user.id,
            type: 'enrollment',
            title: 'Enrolled in a course',
            message: `You have been enrolled in "${course.title}" by your instructor.`,
            link: `/courses/${courseId}`,
          }).catch(() => {});
          // Send enrollment confirmation email (fire-and-forget)
          emailService.sendEnrollmentConfirmation(user.email, user.full_name || user.email, course).catch(() => {});
        } else {
          results.already_enrolled.push(user.email);
        }
      }

      return ApiResponse.success(res, { results }, `Enrolled ${results.enrolled.length} student(s)`);
    } catch (err) { next(err); }
  }

  /**
   * Remove a student from a course
   * DELETE /api/instructor/courses/:courseId/students/:studentId
   */
  static async removeStudent(req, res, next) {
    try {
      const { courseId, studentId } = req.params;

      const course = await Course.findByPk(courseId);
      if (!course) throw new NotFoundError('Course not found');
      if (course.instructor_id !== req.user.id && !['admin', 'super_admin'].includes(req.user.role)) {
        throw new ForbiddenError('Not authorized');
      }

      const enrollment = await Enrollment.findOne({ where: { student_id: studentId, course_id: courseId } });
      if (!enrollment) throw new NotFoundError('Enrollment not found');

      await enrollment.destroy();

      // Decrement course enrollment_count
      const { literal } = require('sequelize');
      await Course.update(
        { enrollment_count: literal('GREATEST(enrollment_count - 1, 0)') },
        { where: { id: courseId } }
      );

      // Discord: remove course access (non-blocking)
      try {
        const discordCtrl = require('../discord/discordController');
        discordCtrl.onUnenroll(parseInt(studentId), parseInt(courseId)).catch(() => {});
      } catch (discordErr) {
        logger.warn(`Discord unenroll hook skipped: ${discordErr.message}`);
      }

      // Notify the student
      await Notification.create({
        user_id: parseInt(studentId),
        type: 'enrollment',
        title: 'Removed from course',
        message: `You have been removed from "${course.title}".`,
        link: '/my-courses',
      }).catch(() => {});

      logger.info(`Instructor ${req.user.email} removed student ${studentId} from course ${courseId}`);
      return ApiResponse.success(res, null, 'Student removed from course');
    } catch (err) { next(err); }
  }
}

module.exports = StudentManagementController;
