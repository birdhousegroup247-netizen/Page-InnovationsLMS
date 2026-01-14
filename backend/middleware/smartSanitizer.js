/**
 * Smart Input Sanitization Middleware
 * Context-aware sanitization that doesn't break legitimate content
 */

const logger = require('../utils/logger');

// Fields that contain rich text/HTML and should use lenient sanitization
const RICH_TEXT_FIELDS = [
  'description',
  'content',
  'body',
  'bio',
  'announcement_content',
  'question_text',
  'answer_explanation',
];

// Fields that contain code and should not be sanitized
const CODE_FIELDS = [
  'code',
  'code_snippet',
  'example_code',
  'solution',
];

// Fields that should be escaped (user-generated plain text)
const PLAIN_TEXT_FIELDS = [
  'name',
  'title',
  'full_name',
  'email',
  'subject',
];

/**
 * Basic HTML escape for plain text fields
 */
function escapeHtml(text) {
  if (typeof text !== 'string') return text;

  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Lenient sanitization for rich text
 * Only removes dangerous tags/attributes, keeps formatting
 */
function sanitizeRichText(html) {
  if (typeof html !== 'string') return html;

  // Remove script tags and their content
  html = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

  // Remove event handlers (onclick, onerror, etc.)
  html = html.replace(/\s*on\w+\s*=\s*["'][^"']*["']/gi, '');
  html = html.replace(/\s*on\w+\s*=\s*[^\s>]*/gi, '');

  // Remove javascript: protocol
  html = html.replace(/javascript:/gi, '');

  // Remove data: protocol (can be used for XSS)
  html = html.replace(/data:text\/html/gi, '');

  // Remove iframe tags
  html = html.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');

  // Remove object/embed tags
  html = html.replace(/<(object|embed)\b[^<]*(?:(?!<\/\1>)<[^<]*)*<\/\1>/gi, '');

  return html;
}

/**
 * Determine sanitization strategy based on field name
 */
function getSanitizationStrategy(key) {
  const lowerKey = key.toLowerCase();

  if (CODE_FIELDS.some(field => lowerKey.includes(field))) {
    return 'none'; // Don't sanitize code
  }

  if (RICH_TEXT_FIELDS.some(field => lowerKey.includes(field))) {
    return 'rich_text';
  }

  if (PLAIN_TEXT_FIELDS.some(field => lowerKey.includes(field))) {
    return 'escape';
  }

  // Default: escape for safety
  return 'escape';
}

/**
 * Recursively sanitize object with context awareness
 */
function sanitizeObject(obj, parentKey = '') {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => sanitizeObject(item, `${parentKey}[${index}]`));
  }

  const sanitized = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      const fullKey = parentKey ? `${parentKey}.${key}` : key;

      if (typeof value === 'string') {
        const strategy = getSanitizationStrategy(key);

        switch (strategy) {
          case 'none':
            sanitized[key] = value; // No sanitization for code
            break;
          case 'rich_text':
            sanitized[key] = sanitizeRichText(value);
            break;
          case 'escape':
          default:
            sanitized[key] = escapeHtml(value);
            break;
        }
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value, fullKey);
      } else {
        sanitized[key] = value;
      }
    }
  }

  return sanitized;
}

/**
 * Smart sanitization middleware
 */
const smartSanitizer = (req, res, next) => {
  try {
    // Sanitize body
    if (req.body) {
      req.body = sanitizeObject(req.body);
    }

    // Sanitize query (always escape - no rich text in URLs)
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }

    next();
  } catch (error) {
    logger.error('Smart sanitization error:', error);
    // Don't block request on sanitization error
    next();
  }
};

/**
 * Aggressive sanitization for high-risk endpoints (auth, password reset, etc.)
 */
const aggressiveSanitizer = (req, res, next) => {
  try {
    if (req.body) {
      req.body = JSON.parse(JSON.stringify(req.body, (key, value) => {
        if (typeof value === 'string') {
          return escapeHtml(value);
        }
        return value;
      }));
    }

    if (req.query) {
      req.query = JSON.parse(JSON.stringify(req.query, (key, value) => {
        if (typeof value === 'string') {
          return escapeHtml(value);
        }
        return value;
      }));
    }

    next();
  } catch (error) {
    logger.error('Aggressive sanitization error:', error);
    next();
  }
};

module.exports = {
  smartSanitizer,
  aggressiveSanitizer,
  escapeHtml,
  sanitizeRichText,
};
