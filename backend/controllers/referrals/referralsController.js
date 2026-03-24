const { User, Referral, Enrollment } = require('../../models');
const ApiResponse = require('../../utils/response');
const crypto = require('crypto');

/**
 * Generate a short unique referral code for a user
 */
async function ensureReferralCode(user) {
  if (user.referral_code) return user.referral_code;
  let code;
  let exists = true;
  while (exists) {
    code = crypto.randomBytes(5).toString('hex').toUpperCase(); // 10-char hex
    exists = await User.findOne({ where: { referral_code: code } });
  }
  await user.update({ referral_code: code });
  return code;
}

class ReferralsController {
  // GET /api/referrals/my-stats — referrer sees their link + stats
  static async getMyStats(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id);
      const code = await ensureReferralCode(user);

      const total = await Referral.count({ where: { referrer_id: user.id } });
      const rewarded = await Referral.count({ where: { referrer_id: user.id, status: 'rewarded' } });
      const pending = total - rewarded;

      return ApiResponse.success(res, {
        referral_code: code,
        referral_link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/register?ref=${code}`,
        stats: {
          total_invited: total,
          enrolled: rewarded,
          pending,
          credits_earned: user.referral_credits,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  // Internal — called from enrollment flow to reward referrer
  // POST /api/referrals/reward  { enrolled_user_id }
  static async rewardReferrer(req, res, next) {
    try {
      const { enrolled_user_id } = req.body;

      const referral = await Referral.findOne({
        where: { referred_id: enrolled_user_id, status: 'pending' },
      });

      if (!referral) {
        return ApiResponse.success(res, { rewarded: false }, 'No pending referral found');
      }

      await referral.update({ status: 'rewarded', rewarded_at: new Date() });

      // Increment referrer credits
      await User.increment('referral_credits', { by: 1, where: { id: referral.referrer_id } });

      return ApiResponse.success(res, { rewarded: true }, 'Referral rewarded');
    } catch (error) {
      next(error);
    }
  }
}

// Admin controller
class AdminReferralsController {
  static async getAll(req, res, next) {
    try {
      const referrals = await Referral.findAll({
        include: [
          { model: User, as: 'referrer', attributes: ['id', 'full_name', 'email', 'referral_credits'] },
          { model: User, as: 'referred', attributes: ['id', 'full_name', 'email', 'created_at'] },
        ],
        order: [['created_at', 'DESC']],
      });

      return ApiResponse.success(res, { referrals, total: referrals.length });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = { ReferralsController, AdminReferralsController };
