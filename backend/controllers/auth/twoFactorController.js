const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { User } = require('../../models');
const ApiResponse = require('../../utils/response');
const JWT = require('../../utils/jwt');
const AuthController = require('./authController');
const ActivityController = require('../activity/activityController');
const logger = require('../../utils/logger');
const { UnauthorizedError, BadRequestError } = require('../../utils/errors');

class TwoFactorController {
  // POST /api/auth/2fa/setup — generate secret + QR code
  static async setup(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id);
      if (user.two_factor_enabled) return ApiResponse.error(res, '2FA is already enabled', 400);

      const secret = authenticator.generateSecret();
      const otpauth = authenticator.keyuri(user.email, 'TekyPro', secret);
      const qrCode = await QRCode.toDataURL(otpauth);

      // Store secret temporarily (not enabled yet)
      await user.update({ two_factor_secret: secret });

      return ApiResponse.success(res, { secret, qrCode });
    } catch (err) { next(err); }
  }

  // POST /api/auth/2fa/verify — verify token and enable 2FA
  static async verify(req, res, next) {
    try {
      const { token } = req.body;
      if (!token) return ApiResponse.error(res, 'Token is required', 400);

      const user = await User.findByPk(req.user.id);
      if (!user.two_factor_secret) return ApiResponse.error(res, 'Run setup first', 400);

      const valid = authenticator.verify({ token, secret: user.two_factor_secret });
      if (!valid) return ApiResponse.error(res, 'Invalid token', 400);

      await user.update({ two_factor_enabled: true });
      return ApiResponse.success(res, null, '2FA enabled successfully');
    } catch (err) { next(err); }
  }

  // POST /api/auth/2fa/disable — disable 2FA with token confirmation
  static async disable(req, res, next) {
    try {
      const { token } = req.body;
      const user = await User.findByPk(req.user.id);

      if (!user.two_factor_enabled) return ApiResponse.error(res, '2FA is not enabled', 400);

      const valid = authenticator.verify({ token, secret: user.two_factor_secret });
      if (!valid) return ApiResponse.error(res, 'Invalid token', 400);

      await user.update({ two_factor_enabled: false, two_factor_secret: null });
      return ApiResponse.success(res, null, '2FA disabled');
    } catch (err) { next(err); }
  }

  // POST /api/auth/2fa/authenticate — second step of login when 2FA is enabled.
  // Verifies the TOTP token and — only on success — issues the real
  // JWT tokens. This closes the security-audit §4.1 hole where 2FA
  // was decorative: previously login handed out tokens on password
  // alone, and this endpoint just returned { verified: true } to a
  // non-existent express-session.
  static async authenticate(req, res, next) {
    try {
      const { userId, token, remember_me } = req.body;
      if (!userId || !token) {
        throw new BadRequestError('userId and token are required');
      }

      const user = await User.findByPk(userId, {
        attributes: { exclude: ['password_hash'] },
      });
      if (!user || !user.two_factor_enabled || !user.two_factor_secret) {
        throw new UnauthorizedError('2FA not enabled for this account');
      }
      if (!user.is_active) {
        throw new UnauthorizedError('Account is deactivated');
      }
      if (!user.email_verified) {
        throw new UnauthorizedError('Email not verified');
      }

      const valid = authenticator.verify({ token, secret: user.two_factor_secret });
      if (!valid) {
        // Log failed 2FA attempt so the activity trail catches TOTP
        // brute force even though the rate limiter on this endpoint
        // (authRateLimiter) does most of the work.
        await ActivityController.logActivity({
          user_id: userId,
          action: 'failed_2fa',
          metadata: { reason: 'Invalid TOTP token' },
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        }).catch(() => {});
        throw new UnauthorizedError('Invalid 2FA token');
      }

      // TOTP verified — this is the actual login moment. Mirror
      // login()'s tail: bump last-login, mint tokens, set cookies,
      // return the payload.
      await user.updateLastLogin();
      const tokens = JWT.generateTokens(user, { rememberMe: !!remember_me });
      AuthController.setAuthCookies(res, tokens, { rememberMe: !!remember_me });

      await ActivityController.logActivity({
        user_id: user.id,
        action: 'login',
        metadata: { email: user.email, via: '2fa' },
        ip_address: req.ip,
        user_agent: req.get('user-agent'),
      }).catch(() => {});
      logger.info(`User logged in via 2FA: ${user.email}`);

      return ApiResponse.success(res, {
        user: user.toJSON(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }, 'Login successful');
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/2fa/status
  static async getStatus(req, res, next) {
    try {
      const user = await User.findByPk(req.user.id, { attributes: ['two_factor_enabled'] });
      return ApiResponse.success(res, { enabled: user.two_factor_enabled });
    } catch (err) { next(err); }
  }
}

module.exports = TwoFactorController;
