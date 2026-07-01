/**
 * Security Middleware
 * Additional security measures beyond helmet
 */

const crypto = require('crypto');
const logger = require('../utils/logger');

// NOTE: csrfProtection + provideCSRFToken previously lived here. They
// referenced req.session.csrfToken, but express-session is not
// installed anywhere in this app. Deleted 2026-07-01 during security
// audit. The actual CSRF layer is the double-submit-cookie pattern in
// server.js (utils/csrf.js), which does not depend on sessions.

/**
 * Content Security Policy
 * Enhanced CSP headers
 */
const contentSecurityPolicy = (req, res, next) => {
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https: blob: https://www.paypalobjects.com",
    "connect-src 'self' wss: ws: https://api.stripe.com https://js.stripe.com https://api-m.paypal.com https://api-m.sandbox.paypal.com https://www.paypal.com",
    "frame-src https://js.stripe.com https://hooks.stripe.com https://www.paypal.com",
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
 * NOTE: SQL keywords are NOT blocked because this is an LMS for database training.
 * SQL injection is prevented by using parameterized queries via Sequelize ORM.
 */
const detectAttackPatterns = (req, res, next) => {
  // Skip detection for content-heavy endpoints (courses, questions, knowledge articles)
  // These legitimately contain code examples and SQL content
  const contentEndpoints = [
    '/api/courses',
    '/api/questions',
    '/api/knowledge',
    '/api/announcements',
    '/api/lessons',
  ];

  const isContentEndpoint = contentEndpoints.some(endpoint => req.path.startsWith(endpoint));

  const suspiciousPatterns = [
    // XSS - Block script tags (but allow code blocks in markdown)
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    // Path Traversal - Always block
    /\.\.[\/\\]/,
  ];

  // Only check command injection patterns on non-content endpoints
  // Content endpoints may have legitimate code examples
  if (!isContentEndpoint) {
    // Command Injection - only block obvious shell metacharacters in sequence
    // Be more specific to avoid false positives
    suspiciousPatterns.push(/[;|`]\s*(rm|cat|wget|curl|bash|sh|nc|netcat)\b/i);
  }

  const checkString = JSON.stringify({
    body: req.body,
    query: req.query,
    params: req.params,
  });

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(checkString)) {
      logger.warn('Potential attack pattern detected', {
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
};
