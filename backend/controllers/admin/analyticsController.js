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

      // Average assigned test scores
      const assignedTestAvg = await AssignedTestAttempt.findAll({
        where: { completed_at: { [Op.ne]: null } },
        attributes: [
          [sequelize.fn('AVG', sequelize.col('percentage')), 'avg_score'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'total_attempts'],
          [sequelize.fn('SUM', sequelize.cast(sequelize.col('passed'), 'INTEGER')), 'passed_count'],
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

      // Top performing students (based on practice test average)
      const topStudents = await PracticeTestAttempt.findAll({
        where: { status: 'completed' },
        attributes: [
          'student_id',
          [sequelize.fn('AVG', sequelize.col('percentage')), 'avg_score'],
          [sequelize.fn('COUNT', sequelize.col('PracticeTestAttempt.id')), 'attempts'],
        ],
        group: ['student_id'],
        order: [[sequelize.fn('AVG', sequelize.col('percentage')), 'DESC']],
        limit: 10,
        include: [
          {
            model: User,
            as: 'student',
            attributes: ['id', 'full_name', 'email'],
          },
        ],
      });

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
      // Courses by category
      const coursesByCategory = await Course.findAll({
        attributes: [
          'category_id',
          [sequelize.fn('COUNT', sequelize.col('Course.id')), 'course_count'],
          [sequelize.fn('SUM', sequelize.col('enrollment_count')), 'total_enrollments'],
        ],
        group: ['category_id', 'category.id'],
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name', 'icon'],
          },
        ],
        subQuery: false,
      });

      // Courses by level (beginner, intermediate, advanced)
      const coursesByLevel = await Course.findAll({
        attributes: [
          'level',
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: ['level'],
        raw: true,
      });

      // Most enrolled courses
      const topCourses = await Course.findAll({
        attributes: ['id', 'title', 'enrollment_count', 'completion_count', 'average_rating'],
        order: [['enrollment_count', 'DESC']],
        limit: 10,
      });

      // Course creation trends (last 12 months)
      const courseCreationTrends = await Course.findAll({
        attributes: [
          [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'month'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        where: {
          created_at: {
            [Op.gte]: sequelize.literal('DATE_SUB(NOW(), INTERVAL 12 MONTH)'),
          },
        },
        group: [sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m')],
        order: [[sequelize.fn('DATE_FORMAT', sequelize.col('created_at'), '%Y-%m'), 'ASC']],
        raw: true,
      });

      return ApiResponse.success(res, {
        coursesByCategory,
        coursesByLevel,
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
      // Questions by category
      const questionsByCategory = await QuestionBank.findAll({
        attributes: [
          'category_id',
          [sequelize.fn('COUNT', sequelize.col('QuestionBank.id')), 'question_count'],
        ],
        group: ['category_id', 'category.id'],
        include: [
          {
            model: Category,
            as: 'category',
            attributes: ['id', 'name'],
          },
        ],
        subQuery: false,
      });

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
      // Top instructors by courses created
      const topInstructors = await Course.findAll({
        attributes: [
          'instructor_id',
          [sequelize.fn('COUNT', sequelize.col('Course.id')), 'courses_count'],
          [sequelize.fn('SUM', sequelize.col('enrollment_count')), 'total_enrollments'],
          [sequelize.fn('AVG', sequelize.col('average_rating')), 'avg_rating'],
        ],
        group: ['instructor_id'],
        order: [[sequelize.fn('COUNT', sequelize.col('Course.id')), 'DESC']],
        limit: 10,
        include: [
          {
            model: User,
            as: 'instructor',
            attributes: ['id', 'full_name', 'email'],
          },
        ],
      });

      return ApiResponse.success(res, {
        topInstructors,
      });
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

      // Enrollments by day
      const enrollmentsByDay = await Enrollment.findAll({
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

      // Completions by day
      const completionsByDay = await Enrollment.findAll({
        where: {
          completed_at: {
            [Op.gte]: startDate,
            [Op.ne]: null,
          },
        },
        attributes: [
          [sequelize.fn('DATE', sequelize.col('completed_at')), 'date'],
          [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
        ],
        group: [sequelize.fn('DATE', sequelize.col('completed_at'))],
        order: [[sequelize.fn('DATE', sequelize.col('completed_at')), 'ASC']],
        raw: true,
      });

      return ApiResponse.success(res, {
        enrollmentsByDay,
        completionsByDay,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = AnalyticsController;
