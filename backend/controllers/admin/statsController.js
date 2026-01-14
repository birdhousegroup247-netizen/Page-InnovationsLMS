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
const logger = require('../../utils/logger');
const { sequelize } = require('../../config/database');
const { Op } = require('sequelize');

class StatsController {
  // Get dashboard overview stats
  static async getOverviewStats(req, res, next) {
    try {
      logger.info('Fetching admin dashboard overview stats');

      // User stats
      let totalUsers = 0, activeUsers = 0, students = 0, instructors = 0;
      try {
        totalUsers = await User.count();
        activeUsers = await User.count({ where: { is_active: true } });
        students = await User.count({ where: { role: 'student' } });
        instructors = await User.count({ where: { role: 'instructor' } });
        logger.info(`User stats - Total: ${totalUsers}, Active: ${activeUsers}, Students: ${students}, Instructors: ${instructors}`);
      } catch (error) {
        logger.error('Error fetching user stats:', error.message);
        throw new Error(`Failed to fetch user stats: ${error.message}`);
      }

      // Course stats
      let totalCourses = 0, publishedCourses = 0, draftCourses = 0;
      try {
        totalCourses = await Course.count();
        publishedCourses = await Course.count({ where: { status: 'published' } });
        draftCourses = await Course.count({ where: { status: 'draft' } });
        logger.info(`Course stats - Total: ${totalCourses}, Published: ${publishedCourses}, Draft: ${draftCourses}`);
      } catch (error) {
        logger.error('Error fetching course stats:', error.message);
        throw new Error(`Failed to fetch course stats: ${error.message}`);
      }

      // Enrollment stats
      let totalEnrollments = 0, completedEnrollments = 0;
      try {
        totalEnrollments = await Enrollment.count();
        completedEnrollments = await Enrollment.count({
          where: { completed_at: { [Op.ne]: null } },
        });
        logger.info(`Enrollment stats - Total: ${totalEnrollments}, Completed: ${completedEnrollments}`);
      } catch (error) {
        logger.error('Error fetching enrollment stats:', error.message);
        throw new Error(`Failed to fetch enrollment stats: ${error.message}`);
      }

      // Certificate stats
      let totalCertificates = 0;
      try {
        totalCertificates = await Certificate.count();
        logger.info(`Certificate stats - Total: ${totalCertificates}`);
      } catch (error) {
        logger.error('Error fetching certificate stats:', error.message);
        throw new Error(`Failed to fetch certificate stats: ${error.message}`);
      }

      // Question bank stats
      let totalQuestions = 0, approvedQuestions = 0;
      try {
        totalQuestions = await QuestionBank.count();
        approvedQuestions = await QuestionBank.count({ where: { is_approved: true } });
        logger.info(`Question bank stats - Total: ${totalQuestions}, Approved: ${approvedQuestions}`);
      } catch (error) {
        logger.error('Error fetching question bank stats:', error.message);
        // Don't throw, continue with 0 values
      }

      // Practice test stats
      let totalPracticeTests = 0, completedPracticeTests = 0;
      try {
        totalPracticeTests = await PracticeTestAttempt.count();
        completedPracticeTests = await PracticeTestAttempt.count({
          where: { status: 'completed' },
        });
        logger.info(`Practice test stats - Total: ${totalPracticeTests}, Completed: ${completedPracticeTests}`);
      } catch (error) {
        logger.error('Error fetching practice test stats:', error.message);
        // Don't throw, continue with 0 values
      }

      // Assigned test stats
      let totalAssignedTests = 0;
      try {
        totalAssignedTests = await AssignedTest.count();
        logger.info(`Assigned test stats - Total: ${totalAssignedTests}`);
      } catch (error) {
        logger.error('Error fetching assigned test stats:', error.message);
        // Don't throw, continue with 0 values
      }

      // Knowledge articles stats
      let totalArticles = 0, publishedArticles = 0;
      try {
        totalArticles = await KnowledgeArticle.count();
        publishedArticles = await KnowledgeArticle.count({
          where: { status: 'published' },
        });
        logger.info(`Knowledge article stats - Total: ${totalArticles}, Published: ${publishedArticles}`);
      } catch (error) {
        logger.error('Error fetching knowledge article stats:', error.message);
        // Don't throw, continue with 0 values
      }

      logger.info('Successfully fetched all admin dashboard stats');

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
      logger.error('Error in admin getOverviewStats:', {
        message: error.message,
        stack: error.stack
      });
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
      const [dbSizeResult] = await sequelize.query(
        `SELECT
          table_schema AS 'database',
          ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) AS 'size_mb'
        FROM information_schema.tables
        WHERE table_schema = :dbName
        GROUP BY table_schema`,
        {
          replacements: { dbName: process.env.DB_NAME },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const dbSize = dbSizeResult[0]?.size_mb || 0;

      // Table counts
      const [tables] = await sequelize.query(
        `SELECT COUNT(*) AS count
        FROM information_schema.tables
        WHERE table_schema = :dbName`,
        {
          replacements: { dbName: process.env.DB_NAME },
          type: sequelize.QueryTypes.SELECT
        }
      );

      const tableCount = tables[0]?.count || 0;

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
