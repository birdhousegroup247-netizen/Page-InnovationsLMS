/**
 * Security Middleware
 * Additional security measures beyond helmet
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Generate CSRF token
 */
function generateCSRFToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */
const csrfProtection = (req, res, next) => {
  // Skip CSRF for GET, HEAD, OPTIONS
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }

  // Skip CSRF for API authentication (using JWT)
  if (req.headers.authorization) {
    return next();
  }

  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;

  if (!token || !sessionToken || token !== sessionToken) {
    logger.warn('CSRF token validation failed', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });

    return res.status(403).json({
      success: false,
      message: 'Invalid CSRF token',
    });
  }

  next();
};

/**
 * Provide CSRF token to client
 */
const provideCSRFToken = (req, res, next) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = generateCSRFToken();
  }

  res.locals.csrfToken = req.session.csrfToken;
  next();
};

/**
 * Content Security Policy
 * Enhanced CSP headers
 */
const contentSecurityPolicy = (req, res, next) => {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob:",
    "connect-src 'self' wss: ws:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');

  res.setHeader('Content-Security-Policy', cspDirectives);
  next();
};

/**
 * Prevent clickjacking
 */
const preventClickjacking = (req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  next();
};

/**
 * Prevent MIME sniffing
 */
const preventMimeSniffing = (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  next();
};

/**
 * Enable XSS Protection
 */
const xssProtection = (req, res, next) => {
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
};

/**
 * Strict Transport Security
 */
const strictTransportSecurity = (req, res, next) => {
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
};

/**
 * Referrer Policy
 */
const referrerPolicy = (req, res, next) => {
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
};

/**
 * Permissions Policy (formerly Feature Policy)
 */
const permissionsPolicy = (req, res, next) => {
  const policies = [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=()',
    'usb=()',
    'magnetometer=()',
    'gyroscope=()',
    'accelerometer=()',
  ].join(', ');

  res.setHeader('Permissions-Policy', policies);
  next();
};

/**
 * Detect and block common attack patterns
 */
const detectAttackPatterns = (req, res, next) => {
  const suspiciousPatterns = [
    // SQL Injection
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|DECLARE)\b)/i,
    // XSS
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    // Path Traversal
    /\.\.[\/\\]/,
    // Command Injection
    /[;&|`$()]/,
  ];

  const checkString = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logger.error('Potential attack detected', {
        ip: req.ip,
        path: req.path,
        method: req.method,
        userAgent: req.headers['user-agent'],
        pattern: pattern.toString(),
      });

      return res.status(403).json({
        success: false,
        message: 'Request blocked due to suspicious content',
      });
    }
  }

  next();
};

/**
 * Request size limiter
 * Prevents large payload attacks
 */
const requestSizeLimiter = (maxSize = '1mb') => {
  return (req, res, next) => {
    const contentLength = req.headers['content-length'];

    if (contentLength) {
      const sizeMB = parseInt(contentLength) / (1024 * 1024);
      const maxSizeMB = parseInt(maxSize);

      if (sizeMB > maxSizeMB) {
        logger.warn('Request size exceeded', {
          ip: req.ip,
          path: req.path,
          size: `${sizeMB.toFixed(2)}MB`,
          limit: maxSize,
        });

        return res.status(413).json({
          success: false,
          message: `Request size exceeds ${maxSize} limit`,
        });
      }
    }

    next();
  };
};

/**
 * Slow down brute force attacks
 * Adds delay for failed authentication attempts
 */
const slowDown = (options = {}) => {
  const {
    delayAfter = 5,
    delayMs = 500,
    maxDelayMs = 20000,
  } = options;

  const attempts = new Map();

  return (req, res, next) => {
    const key = req.ip;
    const now = Date.now();

    // Clean old entries (older than 1 hour)
    for (const [k, v] of attempts.entries()) {
      if (now - v.firstAttempt > 3600000) {
        attempts.delete(k);
      }
    }

    const record = attempts.get(key) || {
      count: 0,
      firstAttempt: now,
    };

    record.count++;
    attempts.set(key, record);

    if (record.count > delayAfter) {
      const delay = Math.min(
        (record.count - delayAfter) * delayMs,
        maxDelayMs
      );

      logger.warn('Slow down applied', {
        ip: req.ip,
        attempts: record.count,
        delay: `${delay}ms`,
      });

      setTimeout(next, delay);
    } else {
      next();
    }
  };
};

/**
 * Honeypot field detection
 * Detects bot submissions
 */
const honeypot = (fieldName = '_honeypot') => {
  return (req, res, next) => {
    if (req.body && req.body[fieldName]) {
      logger.warn('Honeypot triggered - potential bot', {
        ip: req.ip,
        path: req.path,
        userAgent: req.headers['user-agent'],
      });

      // Return success to fool the bot
      return res.status(200).json({
        success: true,
        message: 'Request processed successfully',
      });
    }

    next();
  };
};

/**
 * Security headers bundle
 */
const securityHeaders = [
  preventClickjacking,
  preventMimeSniffing,
  xssProtection,
  strictTransportSecurity,
  referrerPolicy,
  permissionsPolicy,
];

module.exports = {
  csrfProtection,
  provideCSRFToken,
  contentSecurityPolicy,
  preventClickjacking,
  preventMimeSniffing,
  xssProtection,
  strictTransportSecurity,
  referrerPolicy,
  permissionsPolicy,
  detectAttackPatterns,
  requestSizeLimiter,
  slowDown,
  honeypot,
  securityHeaders,
  generateCSRFToken,
};
