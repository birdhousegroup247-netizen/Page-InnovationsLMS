const jwt = require('jsonwebtoken');
const { UnauthorizedError } = require('./errors');

/**
 * JWT Utility Functions
 */

class JWT {
  /**
   * Generate access token
   * @param {Object} payload - User data to encode in token
   * @returns {string} - JWT token
   */
  static generateAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRE || '24h',
    });
  }

  /**
   * Generate refresh token
   * @param {Object} payload - User data to encode in token
   * @returns {string} - JWT refresh token
   */
  static generateRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
      expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
    });
  }

  /**
   * Generate both access and refresh tokens
   * @param {Object} user - User object
   * @returns {Object} - { accessToken, refreshToken }
   */
  static generateTokens(user) {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      accessToken: this.generateAccessToken(payload),
      refreshToken: this.generateRefreshToken(payload),
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
