/**
 * Redis Configuration
 * Handles Redis connection and client setup
 */

const Redis = require('ioredis');
const logger = require('../utils/logger');

let redisClient = null;

/**
 * Initialize Redis connection
 */
const initRedis = () => {
  try {
    // Check if Redis is enabled in environment
    if (process.env.REDIS_ENABLED !== 'true') {
      logger.info('Redis caching is disabled');
      return null;
    }

    const redisConfig = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: parseInt(process.env.REDIS_DB) || 0,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      maxRetriesPerRequest: 3,
    };

    redisClient = new Redis(redisConfig);

    // Connection event handlers
    redisClient.on('connect', () => {
      logger.info('✓ Redis connected successfully');
    });

    redisClient.on('ready', () => {
      logger.info('✓ Redis is ready');
    });

    redisClient.on('error', (err) => {
      logger.error(`Redis error: ${err.message}`);
    });

    redisClient.on('close', () => {
      logger.warn('Redis connection closed');
    });

    redisClient.on('reconnecting', () => {
      logger.info('Redis reconnecting...');
    });

    return redisClient;
  } catch (error) {
    logger.error(`Failed to initialize Redis: ${error.message}`);
    return null;
  }
};

/**
 * Get Redis client instance
 */
const getRedisClient = () => {
  if (!redisClient) {
    logger.warn('Redis client not initialized');
  }
  return redisClient;
};

/**
 * Close Redis connection
 */
const closeRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis connection closed');
  }
};

/**
 * Check if Redis is available
 */
const isRedisAvailable = () => {
  return redisClient && redisClient.status === 'ready';
};

module.exports = {
  initRedis,
  getRedisClient,
  closeRedis,
  isRedisAvailable,
};
