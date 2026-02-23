const { authenticator } = require('otplib');
const QRCode = require('qrcode');
const { User } = require('../../models');
const ApiResponse = require('../../utils/response');

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

  // POST /api/auth/2fa/authenticate — used at login when 2FA is enabled
  static async authenticate(req, res, next) {
    try {
      const { userId, token } = req.body;
      if (!userId || !token) return ApiResponse.error(res, 'userId and token are required', 400);

      const user = await User.findByPk(userId, { attributes: ['id', 'two_factor_secret', 'two_factor_enabled'] });
      if (!user || !user.two_factor_enabled) return ApiResponse.error(res, 'User not found or 2FA not enabled', 400);

      const valid = authenticator.verify({ token, secret: user.two_factor_secret });
      if (!valid) return ApiResponse.error(res, 'Invalid token', 401);

      // Mark session as 2FA-verified (store in req.session or return a short-lived token)
      // For cookie-based auth, set a flag in session
      req.session = req.session || {};
      req.session.twoFactorVerified = true;
      req.session.twoFactorUserId = userId;

      return ApiResponse.success(res, { verified: true });
    } catch (err) { next(err); }
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
