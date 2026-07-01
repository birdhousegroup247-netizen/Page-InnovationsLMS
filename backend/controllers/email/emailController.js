/**
 * Email preferences controller.
 *
 * Handles:
 *   - Unsubscribe (public, signed token) — the `<Unsubscribe>` link in
 *     every non-transactional footer routes here.
 *   - Re-subscribe (authenticated) — a signed-in user can flip their
 *     opt-out back off from settings.
 *
 * Tokens are HMAC(secret, `${kind}:${id}`) — no separate storage table.
 * See emailService.makeUnsubToken / verifyUnsubToken.
 */

const { User, Lead } = require('../../models');
const emailService = require('../../services/email/emailService');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { BadRequestError, NotFoundError } = require('../../utils/errors');

class EmailController {
  /**
   * POST /api/email/unsubscribe
   * Body: { type: 'user' | 'lead', id: number, token: string }
   * No auth — token is the auth.
   */
  static async unsubscribe(req, res, next) {
    try {
      const { type, id, token } = req.body || {};
      if (!type || !id || !token) {
        throw new BadRequestError('type, id and token are required');
      }
      if (!['user', 'lead'].includes(type)) {
        throw new BadRequestError('type must be "user" or "lead"');
      }
      if (!emailService.verifyUnsubToken(type, id, token)) {
        throw new BadRequestError('Invalid or expired unsubscribe token');
      }

      if (type === 'user') {
        const user = await User.findByPk(id);
        if (!user) throw new NotFoundError('User not found');
        await user.update({ email_opt_out: true });
        logger.info(`[Email] user ${id} (${user.email}) unsubscribed`);
      } else {
        const lead = await Lead.findByPk(id);
        if (!lead) throw new NotFoundError('Lead not found');
        await lead.update({ email_opt_out: true, drip_status: 'unsubscribed' });
        logger.info(`[Email] lead ${id} (${lead.email}) unsubscribed`);
      }

      return ApiResponse.success(res, { unsubscribed: true }, 'You have been unsubscribed');
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/email/unsubscribe/verify?type=user|lead&id=X&token=X
   * Peek at whether a token is valid + return the email so the
   * frontend confirmation page can render "unsubscribe alex@…?"
   * without accepting the flip yet.
   */
  static async verifyToken(req, res, next) {
    try {
      const { type, id, token } = req.query || {};
      if (!type || !id || !token) throw new BadRequestError('type, id and token are required');
      if (!['user', 'lead'].includes(type)) throw new BadRequestError('type must be "user" or "lead"');
      if (!emailService.verifyUnsubToken(type, id, token)) {
        throw new BadRequestError('Invalid unsubscribe token');
      }
      let email;
      if (type === 'user') {
        const u = await User.findByPk(id, { attributes: ['email', 'email_opt_out'] });
        if (!u) throw new NotFoundError('User not found');
        email = u.email;
        return ApiResponse.success(res, { email, already: !!u.email_opt_out });
      } else {
        const l = await Lead.findByPk(id, { attributes: ['email', 'email_opt_out'] });
        if (!l) throw new NotFoundError('Lead not found');
        email = l.email;
        return ApiResponse.success(res, { email, already: !!l.email_opt_out });
      }
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/email/resubscribe
   * Authenticated. Flips the current user's email_opt_out back off.
   */
  static async resubscribe(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id);
      if (!user) throw new NotFoundError('User not found');
      await user.update({ email_opt_out: false });
      return ApiResponse.success(res, { subscribed: true }, 'You have been re-subscribed');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = EmailController;
