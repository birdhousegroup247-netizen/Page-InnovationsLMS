/**
 * Advanced Rate Limiting Middleware
 * Per-user rate limiting with Redis backend
 */

const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis').default;
const { getRedisClient } = require('../config/redis');
const logger = require('../utils/logger');

/**
 * Get Redis store configuration for rate limiting
 */
const getRedisStore = (prefix = 'rate_limit:') => {
  const client = getRedisClient();

  if (!client) {
    logger.warn('Redis not available, rate limiting will use memory store');
    return undefined;
  }

  return new RedisStore({
    sendCommand: (...args) => client.call(...args),
    prefix,
  });
};

/**
 * Per-user rate limiter for API endpoints
 * Uses user ID if authenticated, otherwise falls back to IP
 */
const createUserRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    max = 1000, // Limit each user to 1000 requests per window
    message = 'Too many requests, please try again later.',
    skipSuccessfulRequests = false,
    skipFailedRequests = false,
  } = options;

  return rateLimit({
    store: getRedisStore('rate_limit:user:'),
    validate: { ip: false },
    windowMs,
    max,
    message: {
      success: false,
      message,
      retryAfter: Math.ceil(windowMs / 1000), // seconds
    },
    standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
    legacyHeaders: false, // Disable `X-RateLimit-*` headers
    skipSuccessfulRequests,
    skipFailedRequests,
    // Use user ID for authenticated requests, IP for anonymous
    keyGenerator: (req) => {
      if (req.user && req.user.id) {
        return `user_${req.user.id}`;
      }
      return `ip_${req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'}`;
    },
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${req.user?.id ? `user ${req.user.id}` : `IP ${req.ip}`}`);
      res.status(429).json({
        success: false,
        message,
        retryAfter: Math.ceil(windowMs / 1000),
      });
    },
  });
};

/**
 * Strict rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
const authRateLimiter = rateLimit({
  store: getRedisStore('rate_limit:auth:'),
  validate: { ip: false },
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts per window
  message: {
    success: false,
    message: 'Too many login attempts, please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  keyGenerator: (req) => {
    // Use email from request body if available, otherwise IP
    const email = req.body?.email;
    return email ? `email_${email}` : `ip_${req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn(`Auth rate limit exceeded for ${req.body?.email || req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many login attempts, please try again after 15 minutes.',
    });
  },
});

/**
 * Rate limiter for password reset endpoints
 */
const passwordResetLimiter = rateLimit({
  store: getRedisStore('rate_limit:password:'),
  validate: { ip: false },
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 attempts per hour
  message: {
    success: false,
    message: 'Too many password reset requests, please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    const email = req.body?.email;
    return email ? `email_${email}` : `ip_${req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || 'unknown'}`;
  },
  handler: (req, res) => {
    logger.warn(`Password reset rate limit exceeded for ${req.body?.email || req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many password reset requests, please try again after 1 hour.',
    });
  },
});

/**
 * Rate limiter for registration endpoints
 */
const registrationLimiter = rateLimit({
  store: getRedisStore('rate_limit:register:'),
  validate: { ip: false },
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 registrations per hour per IP
  message: {
    success: false,
    message: 'Too many accounts created from this IP, please try again after 1 hour.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Registration rate limit exceeded for IP ${req.ip}`);
    res.status(429).json({
      success: false,
      message: 'Too many accounts created from this IP, please try again after 1 hour.',
    });
  },
});

/**
 * Rate limiter for file upload endpoints
 */
const uploadRateLimiter = createUserRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100, // 100 uploads per hour
  message: 'Too many file uploads, please try again later.',
});

/**
 * Rate limiter for test submission endpoints
 */
const testSubmissionLimiter = createUserRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 submissions per minute
  message: 'Too many test submissions, please slow down.',
});

/**
 * Global API rate limiter
 * Applied to all API routes
 */
const globalApiLimiter = createUserRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // 1000 requests per window per user
  message: 'Too many requests, please try again later.',
});

module.exports = {
  createUserRateLimiter,
  authRateLimiter,
  passwordResetLimiter,
  registrationLimiter,
  uploadRateLimiter,
  testSubmissionLimiter,
  globalApiLimiter,
};
