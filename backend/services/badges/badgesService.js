/**
 * BadgesService — business logic for the badges domain.
 *
 * Extracted from BadgesController on 2026-07-01 as the reference
 * pattern for the "no controller > 200 lines" discipline stolen from
 * VIREL (see VIREL-vs-Page Innovations-audit.md §2.1). Badges is a small
 * domain — 4 read/write methods + one internal `checkAndAward` — so
 * it's a clean pilot for the pattern.
 *
 * Rule: every method here takes plain inputs and returns plain data
 * (or throws). No req/res. Controllers do the transport layer;
 * services do the business logic; models do the DB.
 */

const { Badge, UserBadge, Enrollment, Certificate, AssignedTestAttempt } = require('../../models');
const logger = require('../../utils/logger');

class BadgesService {
  static async listAllBadges() {
    return Badge.findAll({
      order: [['condition_type', 'ASC'], ['condition_value', 'ASC']],
    });
  }

  static async listBadgesForUser(userId) {
    return UserBadge.findAll({
      where: { user_id: userId },
      include: [{ model: Badge, as: 'badge' }],
      order: [['earned_at', 'DESC']],
    });
  }

  /**
   * Called internally after course completion, test pass, enrollment,
   * or a perfect score. Grants any badge whose condition is now
   * satisfied and returns the list of newly-earned badges (empty if
   * none).
   *
   * @param {number} userId
   * @param {'course_complete'|'test_pass'|'enrollment_count'|'score_perfect'} triggerType
   * @param {object} [extraData]  Trigger-specific payload (e.g. { score })
   * @returns {Promise<Badge[]>}   Newly-earned badges
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
      logger.warn(`[BadgesService.checkAndAward] ${err.message}`);
      return [];
    }
  }

  static async createBadge(data) {
    const { slug, name, description, icon, condition_type, condition_value } = data;
    return Badge.create({ slug, name, description, icon, condition_type, condition_value });
  }

  static async updateBadge(id, data) {
    const badge = await Badge.findByPk(id);
    if (!badge) return null;
    await badge.update(data);
    return badge;
  }

  static async deleteBadge(id) {
    const badge = await Badge.findByPk(id);
    if (!badge) return false;
    await badge.destroy();
    return true;
  }
}

module.exports = BadgesService;
