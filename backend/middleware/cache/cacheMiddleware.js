/**
 * Cache Middleware
 * Provides route-level caching for GET requests
 */

const CacheService = require('../../services/cache/cacheService');
const logger = require('../../utils/logger');

/**
 * Cache middleware for GET requests
 * Caches successful responses for specified duration
 *
 * @param {number} ttl - Time to live in seconds (default: 300 = 5 minutes)
 * @param {string} keyPrefix - Custom prefix for cache key (optional)
 */
const cacheMiddleware = (ttl = 300, keyPrefix = '') => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    try {
      // Generate cache key from URL and query params
      const cacheKey = `${keyPrefix}${req.originalUrl || req.url}`;

      // Try to get cached response
      const cachedData = await CacheService.get(cacheKey);

      if (cachedData) {
        logger.debug(`Cache hit for: ${cacheKey}`);
        return res.status(200).json(cachedData);
      }

      // If no cache, intercept res.json to cache the response
      const originalJson = res.json.bind(res);

      res.json = function (data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          CacheService.set(cacheKey, data, ttl).catch((error) => {
            logger.error(`Error caching response: ${error.message}`);
          });
        }

        return originalJson(data);
      };

      next();
    } catch (error) {
      logger.error(`Cache middleware error: ${error.message}`);
      next();
    }
  };
};

/**
 * Cache middleware specifically for courses
 */
const cacheCourse = () => cacheMiddleware(600, 'route:course:');

/**
 * Cache middleware for course lists
 */
const cacheCourseList = () => cacheMiddleware(300, 'route:courses:');

/**
 * Cache middleware for reviews
 */
const cacheReviews = () => cacheMiddleware(300, 'route:reviews:');

/**
 * Cache middleware for notifications
 */
const cacheNotifications = () => cacheMiddleware(60, 'route:notifications:');

/**
 * Cache middleware for knowledge articles
 */
const cacheArticles = () => cacheMiddleware(600, 'route:articles:');

/**
 * Cache middleware for user profile (short duration)
 */
const cacheProfile = () => cacheMiddleware(120, 'route:profile:');

module.exports = {
  cacheMiddleware,
  cacheCourse,
  cacheCourseList,
  cacheReviews,
  cacheNotifications,
  cacheArticles,
  cacheProfile,
};
