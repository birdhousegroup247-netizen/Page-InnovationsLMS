/**
 * CSRF (Cross-Site Request Forgery) Protection Utility
 * Generates and validates CSRF tokens
 */

const crypto = require('crypto');

class CSRF {
  /**
   * Generate a random CSRF token
   * @returns {string} - CSRF token
   */
  static generateToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Validate CSRF token from request
   * @param {Object} req - Express request object
   * @param {string} tokenFromRequest - CSRF token from request header
   * @returns {boolean} - True if token is valid
   */
  static validateToken(req, tokenFromRequest) {
    const tokenFromCookie = req.cookies['csrf-token'];

    if (!tokenFromCookie || !tokenFromRequest) {
      return false;
    }

    // Constant-time comparison to prevent timing attacks
    try {
      return crypto.timingSafeEqual(
        Buffer.from(tokenFromCookie),
        Buffer.from(tokenFromRequest)
      );
    } catch (error) {
      // Buffers are not equal length
      return false;
    }
  }

  /**
   * Set CSRF token in cookie
   * @param {Object} res - Express response object
   */
  static setCookie(res) {
    const token = this.generateToken();

    res.cookie('csrf-token', token, {
      httpOnly: false, // Client needs to read this to send back in header
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      sameSite: 'lax',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    return token;
  }
}

module.exports = CSRF;
