const Joi = require('joi');
const ApiResponse = require('../../utils/response');

/**
 * Validation Schemas for Authentication
 */

const schemas = {
  // Register validation
  register: Joi.object({
    full_name: Joi.string().min(2).max(255).required().messages({
      'string.empty': 'Full name is required',
      'string.min': 'Full name must be at least 2 characters',
      'string.max': 'Full name cannot exceed 255 characters',
    }),
    email: Joi.string().email().required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Must be a valid email address',
    }),
    password: Joi.string().min(8).max(128).required().pattern(
      new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])')
    ).messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base':
        'Password must contain uppercase, lowercase, and a number',
    }),
    role: Joi.string()
      .valid('student', 'instructor')
      .optional()
      .default('student'),
    phone: Joi.string().max(50).allow('', null).optional(),
    country: Joi.string().max(100).allow('', null).optional(),
    experience_level: Joi.string().valid('beginner', 'intermediate', 'advanced').allow('', null).optional(),
    referral_source: Joi.string().max(100).allow('', null).optional(),
    utm_source: Joi.string().max(100).allow('', null).optional(),
    utm_medium: Joi.string().max(100).allow('', null).optional(),
    utm_campaign: Joi.string().max(100).allow('', null).optional(),
    ref: Joi.string().max(50).allow('', null).optional(),
  }),

  // Email verification (6-digit code)
  verifyEmailCode: Joi.object({
    email: Joi.string().email().required(),
    code: Joi.string().length(6).pattern(/^\d{6}$/).required().messages({
      'string.pattern.base': 'Code must be 6 digits',
      'string.length': 'Code must be 6 digits',
    }),
  }),

  // Resend verification email
  resendVerification: Joi.object({
    email: Joi.string().email().required(),
  }),

  // Apply-to-teach for a logged-in user. No account fields — just the instructor profile.
  applyToTeach: Joi.object({
    bio: Joi.string().min(20).max(5000).required(),
    qualifications: Joi.string().min(10).max(5000).required(),
    teaching_experience: Joi.string().min(10).max(5000).required(),
    subject_expertise: Joi.string().min(5).max(2000).required(),
    portfolio_url: Joi.string().uri().allow('', null).optional(),
    cv_url: Joi.string().uri().required().messages({
      'any.required': 'A CV / resume document is required',
      'string.uri': 'CV URL must be a valid URL',
    }),
    credential_urls: Joi.array().items(Joi.string().uri()).max(10).optional().default([]),
  }),

  // Instructor application — collects everything register does PLUS the instructor fields
  instructorApply: Joi.object({
    full_name: Joi.string().min(2).max(255).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(8).max(128).required().pattern(
      new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])')
    ).messages({
      'string.pattern.base': 'Password must contain uppercase, lowercase, and a number',
    }),
    phone: Joi.string().max(50).allow('', null).optional(),
    country: Joi.string().max(100).allow('', null).optional(),
    bio: Joi.string().min(20).max(5000).required().messages({
      'string.min': 'Bio must be at least 20 characters',
    }),
    qualifications: Joi.string().min(10).max(5000).required().messages({
      'string.min': 'Qualifications must be at least 10 characters',
    }),
    teaching_experience: Joi.string().min(10).max(5000).required().messages({
      'string.min': 'Teaching experience must be at least 10 characters',
    }),
    subject_expertise: Joi.string().min(5).max(2000).required(),
    portfolio_url: Joi.string().uri().allow('', null).optional(),
    cv_url: Joi.string().uri().required().messages({
      'any.required': 'A CV / resume document is required',
      'string.uri': 'CV URL must be a valid URL',
    }),
    credential_urls: Joi.array().items(Joi.string().uri()).max(10).optional().default([]),
  }),

  // Login validation
  login: Joi.object({
    email: Joi.string().email().required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Must be a valid email address',
    }),
    password: Joi.string().required().messages({
      'string.empty': 'Password is required',
    }),
  }),

  // Forgot password validation
  forgotPassword: Joi.object({
    email: Joi.string().email().required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Must be a valid email address',
    }),
  }),

  // Reset password validation
  resetPassword: Joi.object({
    token: Joi.string().required().messages({
      'string.empty': 'Reset token is required',
    }),
    newPassword: Joi.string().min(8).max(128).required().pattern(
      new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])')
    ).messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  }),

  // Change password validation
  changePassword: Joi.object({
    currentPassword: Joi.string().required().messages({
      'string.empty': 'Current password is required',
    }),
    newPassword: Joi.string().min(8).max(128).required().pattern(
      new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])')
    ).messages({
      'string.empty': 'New password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
  }),
};

/**
 * Middleware factory for validation
 * @param {string} schemaName - Name of the schema to use
 * @returns {Function} - Express middleware
 */
const validate = (schemaName) => {
  return (req, res, next) => {
    const schema = schemas[schemaName];

    if (!schema) {
      return ApiResponse.serverError(res, 'Invalid validation schema');
    }

    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return ApiResponse.validationError(res, errors);
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

module.exports = { validate, schemas };
