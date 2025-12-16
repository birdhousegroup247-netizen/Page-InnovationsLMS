const {
  User,
  Course,
  Enrollment,
  Certificate,
  QuestionBank,
  PracticeTestAttempt,
  AssignedTest,
  KnowledgeArticle,
} = require('../../models');
const ApiResponse = require('../../utils/response');
const { sequelize } = require('../../config/database');
const { Op } = require('sequelize');

class StatsController {
  // Get dashboard overview stats
  static async getOverviewStats(req, res, next) {
    try {
      // User stats
      const totalUsers = await User.count();
      const activeUsers = await User.count({ where: { is_active: true } });
      const students = await User.count({ where: { role: 'student' } });
      const instructors = await User.count({ where: { role: 'instructor' } });

      // Course stats
      const totalCourses = await Course.count();
      const publishedCourses = await Course.count({ where: { status: 'published' } });
      const draftCourses = await Course.count({ where: { status: 'draft' } });

      // Enrollment stats
      const totalEnrollments = await Enrollment.count();
      const completedEnrollments = await Enrollment.count({
        where: { completed_at: { [Op.ne]: null } },
      });

      // Certificate stats
      const totalCertificates = await Certificate.count();

      // Question bank stats
      const totalQuestions = await QuestionBank.count();
      const approvedQuestions = await QuestionBank.count({ where: { is_approved: true } });

      // Practice test stats
      const totalPracticeTests = await PracticeTestAttempt.count();
      const completedPracticeTests = await PracticeTestAttempt.count({
        where: { status: 'completed' },
      });

      // Assigned test stats
      const totalAssignedTests = await AssignedTest.count();

      // Knowledge articles stats
      const totalArticles = await KnowledgeArticle.count();
      const publishedArticles = await KnowledgeArticle.count({
        where: { status: 'published' },
      });

      return ApiResponse.success(res, {
        users: {
          total: totalUsers,
          active: activeUsers,
          students,
          instructors,
        },
        courses: {
          total: totalCourses,
          published: publishedCourses,
          draft: draftCourses,
        },
        enrollments: {
          total: totalEnrollments,
          completed: completedEnrollments,
          completionRate: totalEnrollments > 0
            ? ((completedEnrollments / totalEnrollments) * 100).toFixed(2)
            : 0,
        },
        certificates: {
          total: totalCertificates,
        },
        questions: {
          total: totalQuestions,
          approved: approvedQuestions,
        },
        tests: {
          practiceTests: totalPracticeTests,
          completedPracticeTests,
          assignedTests: totalAssignedTests,
        },
        knowledge: {
          total: totalArticles,
          published: publishedArticles,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Get enrollment trends (last 30 days)
  static async getEnrollmentTrends(req, res, next) {
    try {
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const enrollments = await Enrollment.findAll({
        where: {
          enrollment_date: {
            [Op.gte]: startDate,
          },
        },
        attributes: [
          [sequelize.fn('DATE', sequelize.col('enrollment_date')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: [sequelize.fn('DATE', sequelize.col('enrollment_date'))],
        order: [[sequelize.fn('DATE', sequelize.col('enrollment_date')), 'ASC']],
        raw: true,
      });

      return ApiResponse.success(res, { enrollments });
    } catch (error) {
      next(error);
    }
  }

  // Get popular courses
  static async getPopularCourses(req, res, next) {
    try {
      const { limit = 10 } = req.query;

      const courses = await Course.findAll({
        attributes: [
          'id',
          'title',
          'enrollment_count',
          'completion_count',
          'average_rating',
        ],
        where: { status: 'published' },
        order: [['enrollment_count', 'DESC']],
        limit: parseInt(limit),
      });

      return ApiResponse.success(res, { courses });
    } catch (error) {
      next(error);
    }
  }

  // Get recent activities
  static async getRecentActivities(req, res, next) {
    try {
      const { limit = 20 } = req.query;

      // Get recent enrollments
      const recentEnrollments = await Enrollment.findAll({
        limit: parseInt(limit),
        order: [['enrollment_date', 'DESC']],
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email'],
          },
          {
            model: Course,
            as: 'course',
            attributes: ['id', 'title'],
          },
        ],
      });

      // Get recent certificates
      const recentCertificates = await Certificate.findAll({
        limit: parseInt(limit),
        order: [['created_at', 'DESC']],
        attributes: ['id', 'certificate_id', 'student_name', 'course_title', 'issue_date'],
      });

      return ApiResponse.success(res, {
        recentEnrollments,
        recentCertificates,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get system health metrics
  static async getSystemHealth(req, res, next) {
    try {
      // Database connection status
      let dbStatus = 'healthy';
      try {
        await sequelize.authenticate();
      } catch (error) {
        dbStatus = 'unhealthy';
      }

      // Get database size info (MySQL specific)
      const [dbSizeResult] = await sequelize.query(`
        SELECT
          table_schema AS 'database',
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'size_mb'
        FROM information_schema.tables
        WHERE table_schema = '${process.env.DB_NAME}'
        GROUP BY table_schema
      `);

      const dbSize = dbSizeResult[0]?.size_mb || 0;

      // Table counts
      const tables = await sequelize.query(`
        SELECT COUNT(*) AS count
        FROM information_schema.tables
        WHERE table_schema = '${process.env.DB_NAME}'
      `);

      const tableCount = tables[0][0]?.count || 0;

      return ApiResponse.success(res, {
        database: {
          status: dbStatus,
          name: process.env.DB_NAME,
          sizeMs: parseFloat(dbSize),
          tables: tableCount,
        },
        server: {
          environment: process.env.NODE_ENV,
          uptime: process.uptime(),
          memory: {
            used: (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2) + ' MB',
            total: (process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2) + ' MB',
          },
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = StatsController;
