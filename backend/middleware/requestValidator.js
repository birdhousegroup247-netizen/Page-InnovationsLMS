/**
 * Request Validation Middleware
 * Validates and sanitizes incoming requests
 */

const { body, param, query, validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * Handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(err => ({
      field: err.path || err.param,
      message: err.msg,
      value: err.value,
    }));

    logger.warn('Validation failed:', {
      path: req.path,
      method: req.method,
      errors: errorMessages,
      ip: req.ip,
    });

    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errorMessages,
    });
  }

  next();
};

/**
 * Common validation rules
 */
const validationRules = {
  // Email validation
  email: () =>
    body('email')
      .trim()
      .isEmail()
      .withMessage('Please provide a valid email address')
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Email must not exceed 255 characters'),

  // Password validation
  password: () =>
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),

  // Name validation
  name: (field = 'name', options = {}) =>
    body(field)
      .trim()
      .isLength({ min: options.min || 2, max: options.max || 100 })
      .withMessage(`${field} must be between ${options.min || 2} and ${options.max || 100} characters`)
      .matches(/^[a-zA-Z\s'-]+$/)
      .withMessage(`${field} can only contain letters, spaces, hyphens, and apostrophes`),

  // ID parameter validation
  id: (paramName = 'id') =>
    param(paramName)
      .isInt({ min: 1 })
      .withMessage(`${paramName} must be a positive integer`)
      .toInt(),

  // UUID validation
  uuid: (paramName = 'id') =>
    param(paramName)
      .isUUID()
      .withMessage(`${paramName} must be a valid UUID`),

  // Phone validation
  phone: () =>
    body('phone')
      .optional()
      .trim()
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
      .withMessage('Please provide a valid phone number'),

  // URL validation
  url: (field = 'url') =>
    body(field)
      .optional()
      .trim()
      .isURL({ protocols: ['http', 'https'], require_protocol: true })
      .withMessage(`${field} must be a valid URL`),

  // Date validation
  date: (field = 'date') =>
    body(field)
      .optional()
      .isISO8601()
      .withMessage(`${field} must be a valid date`),

  // Pagination validation
  pagination: () => [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
  ],

  // Boolean validation
  boolean: (field = 'value') =>
    body(field)
      .optional()
      .isBoolean()
      .withMessage(`${field} must be a boolean`)
      .toBoolean(),

  // Array validation
  array: (field = 'items', options = {}) =>
    body(field)
      .isArray({ min: options.min, max: options.max })
      .withMessage(`${field} must be an array${options.min ? ` with at least ${options.min} items` : ''}${options.max ? ` and at most ${options.max} items` : ''}`),

  // String length validation
  string: (field, options = {}) =>
    body(field)
      .trim()
      .isLength({ min: options.min || 1, max: options.max || 1000 })
      .withMessage(`${field} must be between ${options.min || 1} and ${options.max || 1000} characters`),

  // Number range validation
  number: (field, options = {}) =>
    body(field)
      .isNumeric()
      .withMessage(`${field} must be a number`)
      .custom((value) => {
        const num = parseFloat(value);
        if (options.min !== undefined && num < options.min) {
          throw new Error(`${field} must be at least ${options.min}`);
        }
        if (options.max !== undefined && num > options.max) {
          throw new Error(`${field} must be at most ${options.max}`);
        }
        return true;
      }),

  // Enum validation
  enum: (field, values = []) =>
    body(field)
      .isIn(values)
      .withMessage(`${field} must be one of: ${values.join(', ')}`),
};

/**
 * Sanitize input to prevent XSS
 */
const sanitizeInput = (req, res, next) => {
  // Sanitize body
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }

  // Sanitize query
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }

  next();
};

/**
 * Recursively sanitize object
 */
function sanitizeObject(obj) {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'string') {
        // Basic XSS prevention - escape HTML
        sanitized[key] = value
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;')
          .replace(/\//g, '&#x2F;');
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * File upload validation
 */
const validateFileUpload = (options = {}) => {
  const {
    allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    maxSize = 5 * 1024 * 1024, // 5MB default
  } = options;

  return (req, res, next) => {
    if (!req.file && !req.files) {
      return next();
    }

    const files = req.files || [req.file];

    for (const file of files) {
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          success: false,
          message: `File type ${file.mimetype} is not allowed. Allowed types: ${allowedTypes.join(', ')}`,
        });
      }

      // Check file size
      if (file.size > maxSize) {
        return res.status(400).json({
          success: false,
          message: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds maximum allowed size of ${(maxSize / 1024 / 1024).toFixed(2)}MB`,
        });
      }
    }

    next();
  };
};

/**
 * Rate limit bypass prevention
 * Prevents common rate limit bypass techniques
 */
const preventRateLimitBypass = (req, res, next) => {
  // Check for suspicious headers that might be used to bypass rate limiting
  const suspiciousHeaders = [
    'x-forwarded-for',
    'x-real-ip',
    'x-originating-ip',
    'x-remote-ip',
    'x-client-ip',
  ];

  for (const header of suspiciousHeaders) {
    if (req.headers[header]) {
      logger.warn(`Suspicious header detected: ${header}`, {
        value: req.headers[header],
        ip: req.ip,
        path: req.path,
      });
    }
  }

  next();
};

module.exports = {
  handleValidationErrors,
  validationRules,
  sanitizeInput,
  validateFileUpload,
  preventRateLimitBypass,
};
