const logger = require('../utils/logger');
const ApiResponse = require('../utils/response');

/**
 * Global Error Handler Middleware
 */
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.stack = err.stack;

  // Log error
  logger.error(`${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`, {
    error: err.stack,
  });

  // Sequelize Validation Error — surface the field-level reason so the
  // frontend toast says e.g. "total_questions cannot be null" instead of
  // a useless generic "Validation failed".
  if (err.name === 'SequelizeValidationError') {
    const errors = err.errors.map((e) => ({
      field: e.path,
      message: e.message,
    }));
    const summary = errors.map((e) => `${e.field}: ${e.message}`).join('; ');
    return ApiResponse.validationError(res, errors, summary || 'Validation failed');
  }

  // Sequelize Unique Constraint Error
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors[0].path;
    const message = `${field} already exists`;
    return ApiResponse.badRequest(res, message);
  }

  // Sequelize Foreign Key Constraint Error
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return ApiResponse.badRequest(res, 'Invalid reference to related resource');
  }

  // Sequelize Database Error
  if (err.name === 'SequelizeDatabaseError') {
    logger.error('SequelizeDatabaseError details:', {
      message: err.message,
      sql: err.sql || err.parent?.sql,
      original: err.original?.message || err.parent?.message,
    });
    return ApiResponse.serverError(res, 'Database error occurred');
  }

  // JWT Error
  if (err.name === 'JsonWebTokenError') {
    return ApiResponse.unauthorized(res, 'Invalid token');
  }

  // JWT Expired Error
  if (err.name === 'TokenExpiredError') {
    return ApiResponse.unauthorized(res, 'Token expired');
  }

  // Multer File Size Error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return ApiResponse.badRequest(res, 'File too large');
  }

  // Multer File Type Error
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return ApiResponse.badRequest(res, 'Invalid file type');
  }

  // Custom App Errors
  if (err.isOperational) {
    return ApiResponse.error(res, err.message, err.statusCode, err.errors);
  }

  // Default Error — never expose internal error messages to clients in production
  const statusCode = err.statusCode || 500;
  const isProduction = process.env.NODE_ENV === 'production';
  const message = statusCode === 500 && isProduction
    ? 'Internal server error'
    : err.message || 'Internal server error';

  return ApiResponse.error(res, message, statusCode);
};

/**
 * 404 Not Found Handler
 */
const notFound = (req, res, next) => {
  return ApiResponse.notFound(res, `Route ${req.originalUrl} not found`);
};

module.exports = { errorHandler, notFound };
