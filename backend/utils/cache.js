/**
 * Caching Utility
 * Redis-based caching with fallback to memory
 */

const { getRedisClient, isRedisAvailable } = require('../config/redis');
const logger = require('./logger');

// In-memory cache fallback (for when Redis is unavailable)
const memoryCache = new Map();
const MEMORY_CACHE_MAX_SIZE = 100;

/**
 * Generate cache key with namespace
 */
function generateKey(namespace, key) {
  return `cache:${namespace}:${key}`;
}

/**
 * Get value from cache
 */
async function get(namespace, key) {
  const cacheKey = generateKey(namespace, key);

  try {
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      const value = await redis.get(cacheKey);
      if (value) {
        logger.debug(`Cache HIT: ${cacheKey}`);
        return JSON.parse(value);
      }
      logger.debug(`Cache MISS: ${cacheKey}`);
      return null;
    } else {
      // Fallback to memory cache
      const value = memoryCache.get(cacheKey);
      if (value && value.expiry > Date.now()) {
        logger.debug(`Memory cache HIT: ${cacheKey}`);
        return value.data;
      }
      if (value) {
        memoryCache.delete(cacheKey); // Remove expired
      }
      logger.debug(`Memory cache MISS: ${cacheKey}`);
      return null;
    }
  } catch (error) {
    logger.error(`Cache GET error for ${cacheKey}:`, error.message);
    return null;
  }
}

/**
 * Set value in cache
 */
async function set(namespace, key, value, ttl = 300) {
  const cacheKey = generateKey(namespace, key);

  try {
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      await redis.set(cacheKey, JSON.stringify(value), 'EX', ttl);
      logger.debug(`Cache SET: ${cacheKey} (TTL: ${ttl}s)`);
      return true;
    } else {
      // Fallback to memory cache
      if (memoryCache.size >= MEMORY_CACHE_MAX_SIZE) {
        // Simple LRU: delete oldest entry
        const firstKey = memoryCache.keys().next().value;
        memoryCache.delete(firstKey);
      }
      memoryCache.set(cacheKey, {
        data: value,
        expiry: Date.now() + (ttl * 1000),
      });
      logger.debug(`Memory cache SET: ${cacheKey} (TTL: ${ttl}s)`);
      return true;
    }
  } catch (error) {
    logger.error(`Cache SET error for ${cacheKey}:`, error.message);
    return false;
  }
}

/**
 * Delete value from cache
 */
async function del(namespace, key) {
  const cacheKey = generateKey(namespace, key);

  try {
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      await redis.del(cacheKey);
      logger.debug(`Cache DEL: ${cacheKey}`);
      return true;
    } else {
      memoryCache.delete(cacheKey);
      logger.debug(`Memory cache DEL: ${cacheKey}`);
      return true;
    }
  } catch (error) {
    logger.error(`Cache DEL error for ${cacheKey}:`, error.message);
    return false;
  }
}

/**
 * Delete all keys matching pattern
 */
async function delPattern(namespace, pattern = '*') {
  const searchPattern = generateKey(namespace, pattern);

  try {
    if (isRedisAvailable()) {
      const redis = getRedisClient();
      const keys = await redis.keys(searchPattern);
      if (keys.length > 0) {
        await redis.del(...keys);
        logger.debug(`Cache DEL pattern: ${searchPattern} (${keys.length} keys)`);
      }
      return keys.length;
    } else {
      // Memory cache: delete matching keys
      let count = 0;
      for (const key of memoryCache.keys()) {
        if (key.startsWith(`cache:${namespace}:`)) {
          memoryCache.delete(key);
          count++;
        }
      }
      logger.debug(`Memory cache DEL pattern: ${searchPattern} (${count} keys)`);
      return count;
    }
  } catch (error) {
    logger.error(`Cache DEL pattern error for ${searchPattern}:`, error.message);
    return 0;
  }
}

/**
 * Cache wrapper - get from cache or execute function
 */
async function wrap(namespace, key, fn, ttl = 300) {
  // Try to get from cache
  const cached = await get(namespace, key);
  if (cached !== null) {
    return cached;
  }

  // Execute function to get fresh data
  try {
    const result = await fn();

    // Store in cache
    await set(namespace, key, result, ttl);

    return result;
  } catch (error) {
    logger.error(`Cache wrap error for ${namespace}:${key}:`, error.message);
    throw error;
  }
}

/**
 * Flush entire cache namespace
 */
async function flush(namespace) {
  return await delPattern(namespace, '*');
}

/**
 * Cache statistics
 */
function getStats() {
  return {
    backend: isRedisAvailable() ? 'redis' : 'memory',
    memoryEntries: memoryCache.size,
    memoryMaxSize: MEMORY_CACHE_MAX_SIZE,
  };
}

// Clean up expired memory cache entries periodically
if (!isRedisAvailable()) {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
      if (value.expiry <= now) {
        memoryCache.delete(key);
      }
    }
  }, 60000); // Every minute
}

module.exports = {
  get,
  set,
  del,
  delPattern,
  wrap,
  flush,
  getStats,
};
