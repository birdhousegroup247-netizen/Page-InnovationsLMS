const { Badge, UserBadge, User, Enrollment, Certificate, AssignedTestAttempt } = require('../../models');
const ApiResponse = require('../../utils/response');
const { Op } = require('sequelize');

class BadgesController {
  // GET /api/badges - all available badges
  static async getAllBadges(req, res, next) {
    try {
      const badges = await Badge.findAll({ order: [['condition_type', 'ASC'], ['condition_value', 'ASC']] });
      return ApiResponse.success(res, { badges });
    } catch (err) { next(err); }
  }

  // GET /api/badges/my - current user's earned badges
  static async getMyBadges(req, res, next) {
    try {
      const userBadges = await UserBadge.findAll({
        where: { user_id: req.user.id },
        include: [{ model: Badge, as: 'badge' }],
        order: [['earned_at', 'DESC']],
      });
      return ApiResponse.success(res, { badges: userBadges });
    } catch (err) { next(err); }
  }

  // GET /api/badges/user/:userId
  static async getUserBadges(req, res, next) {
    try {
      const userBadges = await UserBadge.findAll({
        where: { user_id: req.params.userId },
        include: [{ model: Badge, as: 'badge' }],
        order: [['earned_at', 'DESC']],
      });
      return ApiResponse.success(res, { badges: userBadges });
    } catch (err) { next(err); }
  }

  /**
   * Award badges to a user based on current stats.
   * Called internally after course completion, test pass, enrollment.
   * @param {number} userId
   * @param {string} triggerType - 'course_complete' | 'test_pass' | 'enrollment_count' | 'score_perfect'
   */
  static async checkAndAward(userId, triggerType, extraData = {}) {
    try {
      const badges = await Badge.findAll({ where: { condition_type: triggerType } });
      if (!badges.length) return [];

      let count = 0;

      if (triggerType === 'course_complete') {
        count = await Certificate.count({ where: { student_id: userId } });
      } else if (triggerType === 'enrollment_count') {
        count = await Enrollment.count({ where: { student_id: userId } });
      } else if (triggerType === 'test_pass') {
        count = await AssignedTestAttempt.count({ where: { student_id: userId, passed: true } });
      } else if (triggerType === 'score_perfect') {
        // extraData.score should be 100
        count = extraData.score === 100 ? 1 : 0;
      }

      const newlyEarned = [];
      for (const badge of badges) {
        if (count >= badge.condition_value) {
          const [, created] = await UserBadge.findOrCreate({
            where: { user_id: userId, badge_id: badge.id },
            defaults: { user_id: userId, badge_id: badge.id },
          });
          if (created) newlyEarned.push(badge);
        }
      }
      return newlyEarned;
    } catch (err) {
      console.error('[BadgesController.checkAndAward]', err.message);
      return [];
    }
  }
}

module.exports = BadgesController;
