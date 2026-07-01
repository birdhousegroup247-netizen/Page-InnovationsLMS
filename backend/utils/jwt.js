const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('./errors');

/**
 * JWT Utility Functions
 */

class JWT {
  /**
   * Generate access token. `opts.rememberMe` extends the JWT expiry to
   * match the longer cookie maxAge — otherwise the cookie outlives the
   * signed claim.
   */
  static generateAccessToken(payload, opts = {}) {
    const expiresIn = opts.rememberMe
      ? (process.env.JWT_REMEMBER_EXPIRE || '7d')
      : (process.env.JWT_EXPIRE || '24h');
    return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  }

  /**
   * Generate refresh token. With rememberMe, lasts 30 days — matches
   * the "trust this device" pattern from GitHub/Google web.
   */
  static generateRefreshToken(payload, opts = {}) {
    const expiresIn = opts.rememberMe
      ? (process.env.JWT_REFRESH_REMEMBER_EXPIRE || '30d')
      : (process.env.JWT_REFRESH_EXPIRE || '7d');
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, { expiresIn });
  }

  /**
   * Generate both tokens. Pass { rememberMe: true } to extend lifetimes
   * to match the "Remember me" cookie window.
   */
  static generateTokens(user, opts = {}) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      // Session invalidation marker. Bumped on password change or
      // forced logout — authMiddleware rejects tokens whose tv doesn't
      // match the current users.token_version. Works without Redis.
      tv: user.token_version || 0,
    };

    return {
      accessToken: this.generateAccessToken(payload, opts),
      refreshToken: this.generateRefreshToken(payload, opts),
    };
  }

  /**
   * Verify access token
   * @param {string} token - JWT token
   * @returns {Object} - Decoded payload
   * @throws {UnauthorizedError}
   */
  static verifyAccessToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token expired');
      }
      throw new UnauthorizedError('Invalid token');
    }
  }

  /**
   * Verify refresh token
   * @param {string} token - JWT refresh token
   * @returns {Object} - Decoded payload
   * @throws {UnauthorizedError}
   */
  static verifyRefreshToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token expired');
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Decode token without verification (for debugging)
   * @param {string} token - JWT token
   * @returns {Object|null} - Decoded payload or null
   */
  static decode(token) {
    return jwt.decode(token);
  }

  /**
   * Extract token from Authorization header
   * @param {string} authHeader - Authorization header value
   * @returns {string|null} - Token or null
   */
  static extractFromHeader(authHeader) {
    if (!authHeader) return null;

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return null;
    }

    return parts[1];
  }
}

module.exports = JWT;
