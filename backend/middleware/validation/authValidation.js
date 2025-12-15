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
      new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])')
    ).messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
      'string.pattern.base':
        'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    }),
    role: Joi.string()
      .valid('student', 'instructor')
      .optional()
      .default('student'),
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
