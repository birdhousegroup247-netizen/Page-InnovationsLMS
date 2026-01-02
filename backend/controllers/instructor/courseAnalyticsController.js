const { Course, Enrollment, User, ContentProgress, ModuleContent, CourseModule, AssignedTest, AssignedTestAttempt, sequelize } = require('../../models');
const ApiResponse = require('../../utils/response');
const { Op } = require('sequelize');
const { NotFoundError, ForbiddenError } = require('../../utils/errors');

/**
 * Course Analytics Controller for Instructors
 * Provides comprehensive course performance analytics
 */
class CourseAnalyticsController {
  /**
   * Get comprehensive analytics for a specific course
   * GET /api/instructor/courses/:courseId/analytics
   */
  static async getCourseAnalytics(req, res, next) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.id;
      const { period = '30' } = req.query; // days: 7, 30, 60, 90

      // Get course with ownership check
      const course = await Course.findByPk(courseId, {
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'full_name', 'email']
          }
        ]
      });

      if (!course) {
        throw new NotFoundError('Course not found');
      }

      // Allow if instructor owns course OR user is admin
      if (course.instructor_id !== instructorId &&
          req.user.role !== 'admin' &&
          req.user.role !== 'super_admin') {
        throw new ForbiddenError('You do not have access to this course');
      }

      // Calculate date range for trends
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      // Run all analytics queries in parallel
      const [
        courseOverview,
        enrollmentTrends,
        progressDistribution,
        contentEngagement,
        testPerformance,
        recentActivity
      ] = await Promise.all([
        this._getCourseOverview(courseId),
        this._getEnrollmentTrends(courseId, startDate),
        this._getProgressDistribution(courseId),
        this._getContentEngagement(courseId),
        this._getTestPerformance(courseId),
        this._getRecentActivity(courseId, 10)
      ]);

      return ApiResponse.success(res, {
        course: {
          id: course.id,
          title: course.title,
          description: course.description,
          instructor: course.instructor?.full_name,
          status: course.status,
          created_at: course.created_at
        },
        overview: courseOverview,
        enrollment_trends: enrollmentTrends,
        progress_distribution: progressDistribution,
        content_engagement: contentEngagement,
        test_performance: testPerformance,
        recent_activity: recentActivity
      }, 'Course analytics retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get enrollment trends over time for a course
   * GET /api/instructor/courses/:courseId/enrollment-trends
   */
  static async getEnrollmentTrends(req, res, next) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.id;
      const { period = '30', interval = 'day' } = req.query; // interval: day, week, month

      // Verify ownership
      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      if (course.instructor_id !== instructorId &&
          req.user.role !== 'admin' &&
          req.user.role !== 'super_admin') {
        throw new ForbiddenError('You do not have access to this course');
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(period));

      const trends = await this._getEnrollmentTrends(courseId, startDate);

      return ApiResponse.success(res, {
        course_id: courseId,
        period: `${period} days`,
        trends
      }, 'Enrollment trends retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get student progress distribution for a course
   * GET /api/instructor/courses/:courseId/progress-distribution
   */
  static async getProgressDistribution(req, res, next) {
    try {
      const { courseId } = req.params;
      const instructorId = req.user.id;

      // Verify ownership
      const course = await Course.findByPk(courseId);
      if (!course) {
        throw new NotFoundError('Course not found');
      }

      if (course.instructor_id !== instructorId &&
          req.user.role !== 'admin' &&
          req.user.role !== 'super_admin') {
        throw new ForbiddenError('You do not have access to this course');
      }

      const distribution = await this._getProgressDistribution(courseId);

      return ApiResponse.success(res, {
        course_id: courseId,
        distribution
      }, 'Progress distribution retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  // ============================================
  // PRIVATE HELPER METHODS
  // ============================================

  /**
   * Get course overview statistics
   */
  static async _getCourseOverview(courseId) {
    const [enrollments, activeStudents, avgProgress, completionRate, totalContent] = await Promise.all([
      Enrollment.count({ where: { course_id: courseId } }),
      Enrollment.count({
        where: {
          course_id: courseId,
          last_accessed: {
            [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
          }
        }
      }),
      Enrollment.findAll({
        where: { course_id: courseId },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('progress_percentage')), 'avg_progress']
        ]
      }),
      Enrollment.count({
        where: {
          course_id: courseId,
          status: 'completed'
        }
      }),
      ModuleContent.count({
        include: [{
          model: CourseModule,
          as: 'module',
          where: { course_id: courseId },
          attributes: []
        }]
      })
    ]);

    const avgProgressValue = avgProgress[0]?.getDataValue('avg_progress') || 0;

    return {
      total_enrollments: enrollments,
      active_students: activeStudents,
      average_progress: parseFloat(avgProgressValue).toFixed(2),
      completion_rate: enrollments > 0 ? ((completionRate / enrollments) * 100).toFixed(2) : 0,
      total_content: totalContent,
      completed_enrollments: completionRate
    };
  }

  /**
   * Get enrollment trends over time
   */
  static async _getEnrollmentTrends(courseId, startDate) {
    const enrollments = await sequelize.query(`
      SELECT
        DATE(enrolled_at) as date,
        COUNT(*) as enrollments
      FROM enrollments
      WHERE course_id = :courseId
        AND enrolled_at >= :startDate
      GROUP BY DATE(enrolled_at)
      ORDER BY date ASC
    `, {
      replacements: { courseId, startDate: startDate.toISOString() },
      type: sequelize.QueryTypes.SELECT
    });

    return enrollments.map(e => ({
      date: e.date,
      enrollments: e.enrollments
    }));
  }

  /**
   * Get progress distribution (percentage ranges)
   */
  static async _getProgressDistribution(courseId) {
    const enrollments = await Enrollment.findAll({
      where: { course_id: courseId },
      attributes: ['progress_percentage']
    });

    const distribution = {
      '0-25%': 0,
      '26-50%': 0,
      '51-75%': 0,
      '76-100%': 0
    };

    enrollments.forEach(e => {
      const progress = e.progress_percentage || 0;
      if (progress <= 25) distribution['0-25%']++;
      else if (progress <= 50) distribution['26-50%']++;
      else if (progress <= 75) distribution['51-75%']++;
      else distribution['76-100%']++;
    });

    return distribution;
  }

  /**
   * Get content engagement metrics
   */
  static async _getContentEngagement(courseId) {
    const engagement = await sequelize.query(`
      SELECT
        mc.id as content_id,
        mc.title,
        mc.content_type,
        mc.duration,
        COUNT(DISTINCT cp.student_id) as views,
        SUM(CASE WHEN cp.status = 'completed' THEN 1 ELSE 0 END) as completions,
        ROUND(AVG(cp.time_spent), 2) as avg_time_spent
      FROM module_contents mc
      JOIN course_modules cm ON mc.module_id = cm.id
      LEFT JOIN content_progress cp ON mc.id = cp.content_id
      WHERE cm.course_id = :courseId
      GROUP BY mc.id, mc.title, mc.content_type, mc.duration
      ORDER BY views DESC
      LIMIT 10
    `, {
      replacements: { courseId },
      type: sequelize.QueryTypes.SELECT
    });

    return engagement.map(e => ({
      content_id: e.content_id,
      title: e.title,
      content_type: e.content_type,
      duration: e.duration,
      views: e.views || 0,
      completions: e.completions || 0,
      avg_time_spent: parseFloat(e.avg_time_spent || 0),
      completion_rate: e.views > 0 ? ((e.completions / e.views) * 100).toFixed(2) : 0
    }));
  }

  /**
   * Get test performance for course tests
   */
  static async _getTestPerformance(courseId) {
    const testStats = await sequelize.query(`
      SELECT
        at.id as test_id,
        at.test_name,
        COUNT(DISTINCT ata.id) as total_attempts,
        ROUND(AVG(ata.percentage), 2) as avg_score,
        SUM(CASE WHEN ata.passed = 1 THEN 1 ELSE 0 END) as passed_count
      FROM assigned_tests at
      LEFT JOIN assigned_test_attempts ata ON at.id = ata.test_id AND ata.completed_at IS NOT NULL
      WHERE at.course_id = :courseId
      GROUP BY at.id, at.test_name
      ORDER BY total_attempts DESC
    `, {
      replacements: { courseId },
      type: sequelize.QueryTypes.SELECT
    });

    return testStats.map(t => ({
      test_id: t.test_id,
      test_name: t.test_name,
      total_attempts: t.total_attempts || 0,
      avg_score: parseFloat(t.avg_score || 0),
      pass_rate: t.total_attempts > 0 ? ((t.passed_count / t.total_attempts) * 100).toFixed(2) : 0
    }));
  }

  /**
   * Get recent activity in the course
   */
  static async _getRecentActivity(courseId, limit = 10) {
    const recentEnrollments = await Enrollment.findAll({
      where: { course_id: courseId },
      include: [
        {
          model: User,
          as: 'student',
          attributes: ['id', 'full_name', 'email']
        }
      ],
      order: [['enrolled_at', 'DESC']],
      limit
    });

    const recentCompletions = await ContentProgress.findAll({
      where: { status: 'completed' },
      include: [
        {
          model: ModuleContent,
          as: 'content',
          include: [
            {
              model: CourseModule,
              as: 'module',
              where: { course_id: courseId },
              attributes: ['course_id']
            }
          ]
        },
        {
          model: User,
          as: 'student',
          attributes: ['id', 'full_name']
        }
      ],
      order: [['completed_at', 'DESC']],
      limit: 5
    });

    const activities = [
      ...recentEnrollments.map(e => ({
        type: 'enrollment',
        student_name: e.student?.full_name,
        student_email: e.student?.email,
        timestamp: e.enrolled_at,
        details: 'Enrolled in course'
      })),
      ...recentCompletions.map(c => ({
        type: 'completion',
        student_name: c.student?.full_name,
        timestamp: c.completed_at,
        details: `Completed: ${c.content?.title}`
      }))
    ];

    // Sort all activities by timestamp
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return activities.slice(0, limit);
  }
}

module.exports = CourseAnalyticsController;
