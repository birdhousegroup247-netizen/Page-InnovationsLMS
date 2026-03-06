const {
  User,
  Course,
  Category,
  Enrollment,
  PracticeTestAttempt,
  AssignedTestAttempt,
  QuestionBank,
} = require('../../models');
const ApiResponse = require('../../utils/response');
const { sequelize } = require('../../config/database');
const { Op } = require('sequelize');

// Helper: returns true when connected to PostgreSQL
const isPg = () => sequelize.getDialect() === 'postgres';

// Cast a column/expression to DATE (works on both MySQL and PostgreSQL)
const toDate = (col) => sequelize.cast(col, 'DATE');

class AnalyticsController {
  // Get student performance analytics
  static async getStudentPerformance(req, res, next) {
    try {
      // Average practice test scores
      const practiceTestAvg = await PracticeTestAttempt.findAll({
        where: { status: 'completed' },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('percentage')), 'avg_score'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_attempts'],
        ],
        raw: true,
      });

      // Average assigned test scores — dialect-aware boolean sum
      const passedSum = isPg()
        ? sequelize.literal('SUM(CASE WHEN "passed" THEN 1 ELSE 0 END)')
        : sequelize.literal('SUM(CAST(passed AS SIGNED))');

      const assignedTestAvg = await AssignedTestAttempt.findAll({
        where: { completed_at: { [Op.ne]: null } },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('percentage')), 'avg_score'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_attempts'],
          [passedSum, 'passed_count'],
        ],
        raw: true,
      });

      // Course completion rates
      const totalEnrollments = await Enrollment.count();
      const completedEnrollments = await Enrollment.count({
        where: { completed_at: { [Op.ne]: null } },
      });

      const completionRate = totalEnrollments > 0
        ? ((completedEnrollments / totalEnrollments) * 100).toFixed(2)
        : 0;

      // Top performing students — aggregate first, then fetch user data separately
      // (avoids GROUP BY + JOIN strictness issue in PostgreSQL)
      const rawTopStudents = await PracticeTestAttempt.findAll({
        where: { status: 'completed' },
        attributes: [
          'student_id',
          [sequelize.fn('AVG', sequelize.col('percentage')), 'avg_score'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'attempts'],
        ],
        group: ['student_id'],
        order: [[sequelize.fn('AVG', sequelize.col('percentage')), 'DESC']],
        limit: 10,
        raw: true,
      });

      const studentIds = rawTopStudents.map((r) => r.student_id);
      const studentUsers = studentIds.length
        ? await User.findAll({ where: { id: studentIds }, attributes: ['id', 'full_name', 'email'] })
        : [];
      const studentMap = Object.fromEntries(studentUsers.map((u) => [u.id, u.toJSON()]));
      const topStudents = rawTopStudents.map((r) => ({ ...r, student: studentMap[r.student_id] || null }));

      return ApiResponse.success(res, {
        practiceTests: {
          avgScore: parseFloat(practiceTestAvg[0]?.avg_score || 0).toFixed(2),
          totalAttempts: practiceTestAvg[0]?.total_attempts || 0,
        },
        assignedTests: {
          avgScore: parseFloat(assignedTestAvg[0]?.avg_score || 0).toFixed(2),
          totalAttempts: assignedTestAvg[0]?.total_attempts || 0,
          passedCount: assignedTestAvg[0]?.passed_count || 0,
          passRate:
            assignedTestAvg[0]?.total_attempts > 0
              ? ((assignedTestAvg[0]?.passed_count / assignedTestAvg[0]?.total_attempts) * 100).toFixed(2)
              : 0,
        },
        courseCompletion: {
          totalEnrollments,
          completedEnrollments,
          completionRate: parseFloat(completionRate),
        },
        topStudents,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get course analytics
  static async getCourseAnalytics(req, res, next) {
    try {
      // Courses by category — aggregate without JOIN, then attach category data separately
      const rawByCategory = await Course.findAll({
        attributes: [
          'category_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'course_count'],
          [sequelize.fn('SUM', sequelize.col('enrollment_count')), 'total_enrollments'],
        ],
        group: ['category_id'],
        raw: true,
      });

      const catIds = rawByCategory.map((r) => r.category_id).filter(Boolean);
      const categories = catIds.length
        ? await Category.findAll({ where: { id: catIds }, attributes: ['id', 'name', 'icon'] })
        : [];
      const catMap = Object.fromEntries(categories.map((c) => [c.id, c.toJSON()]));
      const coursesByCategory = rawByCategory.map((r) => ({ ...r, category: catMap[r.category_id] || null }));

      // Courses by level
      const coursesByLevel = await Course.findAll({
        attributes: [
          'level',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['level'],
        raw: true,
      });
      // Rename 'level' key to 'difficulty' to match frontend expectations
      const coursesByDifficulty = coursesByLevel.map((r) => ({ difficulty: r.level, count: r.count }));

      // Most enrolled courses
      const topCourses = await Course.findAll({
        attributes: ['id', 'title', 'enrollment_count', 'completion_count', 'average_rating'],
        order: [['enrollment_count', 'DESC']],
        limit: 10,
        raw: true,
      });

      // Course creation trends (last 12 months) — dialect-aware month formatting
      const twelveMonthsAgo = isPg()
        ? sequelize.literal("NOW() - INTERVAL '12 months'")
        : sequelize.literal('DATE_SUB(NOW(), INTERVAL 12 MONTH)');

      let courseCreationTrends = [];
      if (isPg()) {
        courseCreationTrends = await sequelize.query(
          `SELECT TO_CHAR(created_at, 'YYYY-MM') AS month, COUNT(id)::int AS count
           FROM courses
           WHERE created_at >= NOW() - INTERVAL '12 months'
           GROUP BY TO_CHAR(created_at, 'YYYY-MM')
           ORDER BY month ASC`,
          { type: sequelize.QueryTypes.SELECT }
        );
      } else {
        courseCreationTrends = await Course.findAll({
          attributes: [
            [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
            [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
          ],
          where: { created_at: { [Op.gte]: twelveMonthsAgo } },
          group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
          order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'ASC']],
          raw: true,
        });
      }

      return ApiResponse.success(res, {
        coursesByCategory,
        coursesByDifficulty,
        topCourses,
        courseCreationTrends,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get question bank analytics
  static async getQuestionAnalytics(req, res, next) {
    try {
      // Questions by category — aggregate without JOIN, then attach category data
      const rawByCategory = await QuestionBank.findAll({
        attributes: [
          'category_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'question_count'],
        ],
        group: ['category_id'],
        raw: true,
      });

      const catIds = rawByCategory.map((r) => r.category_id).filter(Boolean);
      const categories = catIds.length
        ? await Category.findAll({ where: { id: catIds }, attributes: ['id', 'name'] })
        : [];
      const catMap = Object.fromEntries(categories.map((c) => [c.id, c.toJSON()]));
      const questionsByCategory = rawByCategory.map((r) => ({ ...r, category: catMap[r.category_id] || null }));

      // Questions by difficulty
      const questionsByDifficulty = await QuestionBank.findAll({
        attributes: [
          'difficulty',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['difficulty'],
        raw: true,
      });

      // Questions by type
      const questionsByType = await QuestionBank.findAll({
        attributes: [
          'question_type',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['question_type'],
        raw: true,
      });

      // Most used questions
      const mostUsedQuestions = await QuestionBank.findAll({
        attributes: ['id', 'question_text', 'times_used', 'times_correct', 'times_incorrect'],
        order: [['times_used', 'DESC']],
        limit: 10,
      });

      // Question accuracy
      const totalAttempts = await QuestionBank.sum('times_used');
      const totalCorrect = await QuestionBank.sum('times_correct');
      const overallAccuracy = totalAttempts > 0 ? ((totalCorrect / totalAttempts) * 100).toFixed(2) : 0;

      return ApiResponse.success(res, {
        questionsByCategory,
        questionsByDifficulty,
        questionsByType,
        mostUsedQuestions,
        overallAccuracy: parseFloat(overallAccuracy),
        totalAttempts,
        totalCorrect,
      });
    } catch (error) {
      next(error);
    }
  }

  // Get instructor analytics
  static async getInstructorAnalytics(req, res, next) {
    try {
      // Aggregate without JOIN, then fetch user data separately
      const rawTop = await Course.findAll({
        attributes: [
          'instructor_id',
          [sequelize.fn('COUNT', sequelize.col('id')), 'courses_count'],
          [sequelize.fn('SUM', sequelize.col('enrollment_count')), 'total_enrollments'],
          [sequelize.fn('AVG', sequelize.col('average_rating')), 'avg_rating'],
        ],
        group: ['instructor_id'],
        order: [[sequelize.fn('COUNT', sequelize.col('id')), 'DESC']],
        limit: 10,
        raw: true,
      });

      const instructorIds = rawTop.map((r) => r.instructor_id).filter(Boolean);
      const instructorUsers = instructorIds.length
        ? await User.findAll({ where: { id: instructorIds }, attributes: ['id', 'full_name', 'email'] })
        : [];
      const instrMap = Object.fromEntries(instructorUsers.map((u) => [u.id, u.toJSON()]));
      const topInstructors = rawTop.map((r) => ({ ...r, instructor: instrMap[r.instructor_id] || null }));

      return ApiResponse.success(res, { topInstructors });
    } catch (error) {
      next(error);
    }
  }

  // Get enrollment analytics
  static async getEnrollmentAnalytics(req, res, next) {
    try {
      const { days = 30 } = req.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Use CAST(col AS DATE) instead of DATE(col) — compatible with both MySQL and PostgreSQL
      const enrollmentsByDay = await Enrollment.findAll({
        where: { enrollment_date: { [Op.gte]: startDate } },
        attributes: [
          [toDate(sequelize.col('enrollment_date')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: [toDate(sequelize.col('enrollment_date'))],
        order: [[toDate(sequelize.col('enrollment_date')), 'ASC']],
        raw: true,
      });

      const completionsByDay = await Enrollment.findAll({
        where: {
          completed_at: { [Op.gte]: startDate, [Op.ne]: null },
        },
        attributes: [
          [toDate(sequelize.col('completed_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: [toDate(sequelize.col('completed_at'))],
        order: [[toDate(sequelize.col('completed_at')), 'ASC']],
        raw: true,
      });

      return ApiResponse.success(res, { enrollmentsByDay, completionsByDay });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AnalyticsController;
