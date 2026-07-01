/**
 * BadgesController — thin transport layer for /api/badges. Business
 * logic lives in BadgesService (extraction on 2026-07-01 as the
 * reference pattern for future controllers > 200 lines).
 *
 * If you find yourself writing DB or business logic here, move it into
 * BadgesService and keep the controller focused on request parsing,
 * response shaping, and error propagation.
 */

const ApiResponse = require('../../utils/response');
const BadgesService = require('../../services/badges/badgesService');

class BadgesController {
  static async getAllBadges(req, res, next) {
    try {
      const badges = await BadgesService.listAllBadges();
      return ApiResponse.success(res, { badges });
    } catch (err) { next(err); }
  }

  static async getMyBadges(req, res, next) {
    try {
      const badges = await BadgesService.listBadgesForUser(req.user.id);
      return ApiResponse.success(res, { badges });
    } catch (err) { next(err); }
  }

  static async getUserBadges(req, res, next) {
    try {
      const badges = await BadgesService.listBadgesForUser(req.params.userId);
      return ApiResponse.success(res, { badges });
    } catch (err) { next(err); }
  }

  /**
   * Backwards-compatible re-export. Every controller that fires badge
   * awards (progressController, enrollmentService, etc.) calls
   * BadgesController.checkAndAward. Keep this alias until callers are
   * migrated to import BadgesService directly.
   */
  static async checkAndAward(userId, triggerType, extraData = {}) {
    return BadgesService.checkAndAward(userId, triggerType, extraData);
  }

  static async createBadge(req, res, next) {
    try {
      const badge = await BadgesService.createBadge(req.body);
      return ApiResponse.created(res, { badge }, 'Badge created');
    } catch (err) { next(err); }
  }

  static async updateBadge(req, res, next) {
    try {
      const badge = await BadgesService.updateBadge(req.params.id, req.body);
      if (!badge) return ApiResponse.notFound(res, 'Badge not found');
      return ApiResponse.success(res, { badge }, 'Badge updated');
    } catch (err) { next(err); }
  }

  static async deleteBadge(req, res, next) {
    try {
      const ok = await BadgesService.deleteBadge(req.params.id);
      if (!ok) return ApiResponse.notFound(res, 'Badge not found');
      return ApiResponse.success(res, null, 'Badge deleted');
    } catch (err) { next(err); }
  }
}

module.exports = BadgesController;
