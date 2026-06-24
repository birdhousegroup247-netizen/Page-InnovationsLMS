const { sequelize } = require('../../models');
const ApiResponse = require('../../utils/response');

class LeaderboardController {
  // GET /api/leaderboard?courseId=&limit=20
  static async getLeaderboard(req, res, next) {
    try {
      const { courseId, limit = 20 } = req.query;
      const lim = Math.min(parseInt(limit) || 20, 100);

      let query;
      if (courseId) {
        // Course-specific leaderboard: rank by lessons completed in that course
        query = `
          SELECT
            u.id,
            u.full_name,
            u.profile_picture,
            COUNT(cp.id) AS lessons_completed,
            e.created_at AS enrolled_at
          FROM users u
          JOIN enrollments e ON e.student_id = u.id AND e.course_id = :courseId
          LEFT JOIN content_progress cp
            ON cp.student_id = u.id
            AND cp.completed = TRUE
            AND cp.content_id IN (
              SELECT mc.id FROM module_contents mc
              JOIN course_modules cm ON cm.id = mc.module_id
              WHERE cm.course_id = :courseId
            )
          WHERE u.is_active = TRUE
          GROUP BY u.id, u.full_name, u.profile_picture, e.created_at
          ORDER BY lessons_completed DESC, e.created_at ASC
          LIMIT :lim
        `;
      } else {
        // Platform-wide leaderboard: rank by total certificates earned
        query = `
          SELECT
            u.id,
            u.full_name,
            u.profile_picture,
            COUNT(DISTINCT c.id)  AS courses_completed,
            COUNT(DISTINCT ub.id) AS badges_earned,
            COUNT(DISTINCT e.id)  AS courses_enrolled
          FROM users u
          LEFT JOIN certificates c ON c.student_id = u.id
          LEFT JOIN user_badges ub ON ub.user_id = u.id
          LEFT JOIN enrollments e ON e.student_id = u.id
          WHERE u.role = 'student' AND u.is_active = TRUE
          GROUP BY u.id, u.full_name, u.profile_picture
          ORDER BY courses_completed DESC, badges_earned DESC, courses_enrolled DESC
          LIMIT :lim
        `;
      }

      const results = await sequelize.query(query, {
        replacements: courseId ? { courseId, lim } : { lim },
        type: sequelize.QueryTypes.SELECT,
      });

      const leaderboard = results.map((row, i) => ({ rank: i + 1, ...row }));
      return ApiResponse.success(res, { leaderboard });
    } catch (err) { next(err); }
  }

  // GET /api/leaderboard/my-rank
  static async getMyRank(req, res, next) {
    try {
      const [[{ courses_completed, badges_earned }]] = await sequelize.query(`
        SELECT
          COUNT(DISTINCT c.id)  AS courses_completed,
          COUNT(DISTINCT ub.id) AS badges_earned
        FROM users u
        LEFT JOIN certificates c ON c.student_id = u.id
        LEFT JOIN user_badges ub ON ub.user_id = u.id
        WHERE u.id = :userId
      `, { replacements: { userId: req.user.id }, type: sequelize.QueryTypes.SELECT });

      const [[{ rank }]] = await sequelize.query(`
        SELECT COUNT(*) + 1 AS rank
        FROM (
          SELECT u.id, COUNT(DISTINCT c.id) AS cc
          FROM users u
          LEFT JOIN certificates c ON c.student_id = u.id
          WHERE u.role = 'student' AND u.is_active = TRUE
          GROUP BY u.id
        ) sub
        WHERE sub.cc > :cc
      `, { replacements: { cc: courses_completed || 0 }, type: sequelize.QueryTypes.SELECT });

      return ApiResponse.success(res, { rank, courses_completed, badges_earned });
    } catch (err) { next(err); }
  }
}

module.exports = LeaderboardController;
