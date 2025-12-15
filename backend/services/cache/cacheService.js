/**
 * Cache Service
 * Handles all caching operations with Redis
 */

const { getRedisClient, isRedisAvailable } = require('../../config/redis');
const logger = require('../../utils/logger');

class CacheService {
  /**
   * Set a value in cache
   * @param {string} key - Cache key
   * @param {any} value - Value to cache (will be JSON stringified)
   * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
   */
  static async set(key, value, ttl = 300) {
    try {
      if (!isRedisAvailable()) {
        return false;
      }

      const redis = getRedisClient();
      const stringValue = JSON.stringify(value);

      if (ttl) {
        await redis.setex(key, ttl, stringValue);
      } else {
        await redis.set(key, stringValue);
      }

      logger.debug(`Cache set: ${key} (TTL: ${ttl}s)`);
      return true;
    } catch (error) {
      logger.error(`Cache set error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get a value from cache
   * @param {string} key - Cache key
   * @returns {any|null} - Parsed value or null
   */
  static async get(key) {
    try {
      if (!isRedisAvailable()) {
        return null;
      }

      const redis = getRedisClient();
      const value = await redis.get(key);

      if (!value) {
        logger.debug(`Cache miss: ${key}`);
        return null;
      }

      logger.debug(`Cache hit: ${key}`);
      return JSON.parse(value);
    } catch (error) {
      logger.error(`Cache get error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Delete a key from cache
   * @param {string} key - Cache key
   */
  static async del(key) {
    try {
      if (!isRedisAvailable()) {
        return false;
      }

      const redis = getRedisClient();
      await redis.del(key);
      logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error(`Cache delete error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Delete multiple keys matching a pattern
   * @param {string} pattern - Key pattern (e.g., 'course:*')
   */
  static async delPattern(pattern) {
    try {
      if (!isRedisAvailable()) {
        return false;
      }

      const redis = getRedisClient();
      const keys = await redis.keys(pattern);

      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Cache pattern deleted: ${pattern} (${keys.length} keys)`);
      }

      return true;
    } catch (error) {
      logger.error(`Cache pattern delete error for ${pattern}: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if a key exists in cache
   * @param {string} key - Cache key
   */
  static async exists(key) {
    try {
      if (!isRedisAvailable()) {
        return false;
      }

      const redis = getRedisClient();
      const exists = await redis.exists(key);
      return exists === 1;
    } catch (error) {
      logger.error(`Cache exists error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Get or set cache (cache-aside pattern)
   * If key exists, return cached value
   * If not, execute callback, cache result, and return it
   *
   * @param {string} key - Cache key
   * @param {Function} callback - Async function to get fresh data
   * @param {number} ttl - Time to live in seconds
   */
  static async getOrSet(key, callback, ttl = 300) {
    try {
      // Try to get from cache
      const cached = await this.get(key);
      if (cached !== null) {
        return cached;
      }

      // Get fresh data
      const freshData = await callback();

      // Cache it
      await this.set(key, freshData, ttl);

      return freshData;
    } catch (error) {
      logger.error(`Cache getOrSet error for key ${key}: ${error.message}`);
      // If cache fails, still return fresh data
      return await callback();
    }
  }

  /**
   * Increment a counter in cache
   * @param {string} key - Cache key
   * @param {number} increment - Amount to increment (default: 1)
   */
  static async incr(key, increment = 1) {
    try {
      if (!isRedisAvailable()) {
        return null;
      }

      const redis = getRedisClient();
      const value = await redis.incrby(key, increment);
      return value;
    } catch (error) {
      logger.error(`Cache incr error for key ${key}: ${error.message}`);
      return null;
    }
  }

  /**
   * Set expiration on a key
   * @param {string} key - Cache key
   * @param {number} seconds - Seconds until expiration
   */
  static async expire(key, seconds) {
    try {
      if (!isRedisAvailable()) {
        return false;
      }

      const redis = getRedisClient();
      await redis.expire(key, seconds);
      return true;
    } catch (error) {
      logger.error(`Cache expire error for key ${key}: ${error.message}`);
      return false;
    }
  }

  /**
   * Clear all cache (use with caution!)
   */
  static async flush() {
    try {
      if (!isRedisAvailable()) {
        return false;
      }

      const redis = getRedisClient();
      await redis.flushdb();
      logger.info('Cache flushed');
      return true;
    } catch (error) {
      logger.error(`Cache flush error: ${error.message}`);
      return false;
    }
  }

  // ============================================================================
  // DOMAIN-SPECIFIC CACHE HELPERS
  // ============================================================================

  /**
   * Cache course data
   */
  static async cacheCourse(courseId, data, ttl = 600) {
    return await this.set(`course:${courseId}`, data, ttl);
  }

  /**
   * Get cached course
   */
  static async getCachedCourse(courseId) {
    return await this.get(`course:${courseId}`);
  }

  /**
   * Invalidate course cache
   */
  static async invalidateCourse(courseId) {
    await this.del(`course:${courseId}`);
    await this.del(`course:${courseId}:rating`);
    await this.del(`course:${courseId}:reviews`);
    await this.delPattern(`course:${courseId}:*`);
  }

  /**
   * Cache course rating
   */
  static async cacheCourseRating(courseId, rating, ttl = 1800) {
    return await this.set(`course:${courseId}:rating`, rating, ttl);
  }

  /**
   * Get cached course rating
   */
  static async getCachedCourseRating(courseId) {
    return await this.get(`course:${courseId}:rating`);
  }

  /**
   * Cache user data
   */
  static async cacheUser(userId, data, ttl = 600) {
    return await this.set(`user:${userId}`, data, ttl);
  }

  /**
   * Get cached user
   */
  static async getCachedUser(userId) {
    return await this.get(`user:${userId}`);
  }

  /**
   * Invalidate user cache
   */
  static async invalidateUser(userId) {
    await this.delPattern(`user:${userId}*`);
  }

  /**
   * Cache notification count
   */
  static async cacheNotificationCount(userId, count, ttl = 60) {
    return await this.set(`notifications:${userId}:unread`, count, ttl);
  }

  /**
   * Get cached notification count
   */
  static async getCachedNotificationCount(userId) {
    return await this.get(`notifications:${userId}:unread`);
  }

  /**
   * Invalidate notification cache
   */
  static async invalidateNotifications(userId) {
    await this.del(`notifications:${userId}:unread`);
  }
}

module.exports = CacheService;
