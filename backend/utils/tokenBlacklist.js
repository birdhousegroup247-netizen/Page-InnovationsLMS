/**
 * Token Blacklist Utility
 * Manages blacklisted JWT tokens using Redis for logout functionality
 */

const { getRedisClient, isRedisAvailable } = require('../config/redis');
const logger = require('./logger');

class TokenBlacklist {
  /**
   * Add token to blacklist
   * @param {string} token - JWT token to blacklist
   * @param {number} expiresIn - Seconds until token naturally expires
   */
  static async addToBlacklist(token, expiresIn) {
    try {
      if (!isRedisAvailable()) {
        logger.warn('Redis not available - token blacklist disabled');
        return false;
      }

      const redis = getRedisClient();
      const key = `blacklist:${token}`;

      // Store token in Redis with expiration matching token's natural expiry
      // After expiry, Redis will automatically remove it
      await redis.setex(key, expiresIn, '1');

      logger.info(`Token added to blacklist (expires in ${expiresIn}s)`);
      return true;
    } catch (error) {
      logger.error('Failed to add token to blacklist:', error);
      return false;
    }
  }

  /**
   * Check if token is blacklisted
   * @param {string} token - JWT token to check
   * @returns {boolean} - True if token is blacklisted
   */
  static async isBlacklisted(token) {
    try {
      if (!isRedisAvailable()) {
        // If Redis is not available, allow token (fail open for availability)
        // In production, you might want to fail closed (deny all) instead
        return false;
      }

      const redis = getRedisClient();
      const key = `blacklist:${token}`;
      const exists = await redis.exists(key);

      return exists === 1;
    } catch (error) {
      logger.error('Failed to check token blacklist:', error);
      // Fail open - allow token on error
      return false;
    }
  }

  /**
   * Remove token from blacklist (for testing/admin purposes)
   * @param {string} token - JWT token to remove
   */
  static async removeFromBlacklist(token) {
    try {
      if (!isRedisAvailable()) {
        return false;
      }

      const redis = getRedisClient();
      const key = `blacklist:${token}`;
      await redis.del(key);

      logger.info('Token removed from blacklist');
      return true;
    } catch (error) {
      logger.error('Failed to remove token from blacklist:', error);
      return false;
    }
  }

  /**
   * Get count of blacklisted tokens (for monitoring)
   */
  static async getBlacklistCount() {
    try {
      if (!isRedisAvailable()) {
        return 0;
      }

      const redis = getRedisClient();
      const keys = await redis.keys('blacklist:*');
      return keys.length;
    } catch (error) {
      logger.error('Failed to get blacklist count:', error);
      return 0;
    }
  }

  /**
   * Calculate remaining TTL from JWT token
   * @param {Object} decoded - Decoded JWT payload
   * @returns {number} - Seconds until expiration
   */
  static calculateTTL(decoded) {
    if (!decoded.exp) {
      // Default to 24 hours if no expiry
      return 24 * 60 * 60;
    }

    const now = Math.floor(Date.now() / 1000);
    const ttl = decoded.exp - now;

    // Return max 0 if already expired
    return Math.max(0, ttl);
  }
}

module.exports = TokenBlacklist;
