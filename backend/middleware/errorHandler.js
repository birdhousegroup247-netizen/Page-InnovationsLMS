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

  // Sequelize Database Error — surface the precise Postgres message in the
  // response so the UI toast actually says what's wrong (column missing,
  // constraint violated, etc.). Walk EVERY known message location because
  // different driver / sequelize versions stash it in different places.
  // Always dumps the full error shape to logs so when the toast IS the
  // generic fallback, Railway logs still have the answer.
  if (err.name === 'SequelizeDatabaseError') {
    const candidates = [
      err.original?.message,
      err.original?.detail,
      err.parent?.message,
      err.parent?.detail,
      err.errors?.[0]?.message,
      err.message,
    ].filter((s) => typeof s === 'string' && s.trim());
    const raw = candidates[0] || '';
    const clean = raw.split('\n')[0].replace(/\s+at .*$/, '').trim();
    logger.error('SequelizeDatabaseError details:', {
      name: err.name,
      message: err.message,
      code: err.original?.code || err.parent?.code,
      detail: err.original?.detail || err.parent?.detail,
      column: err.original?.column || err.parent?.column,
      table: err.original?.table || err.parent?.table,
      constraint: err.original?.constraint || err.parent?.constraint,
      sql: (err.sql || err.parent?.sql || '').slice(0, 500),
      original_keys: err.original ? Object.keys(err.original) : null,
      parent_keys: err.parent ? Object.keys(err.parent) : null,
      stack: err.stack?.split('\n').slice(0, 5).join('\n'),
    });
    return ApiResponse.serverError(res, clean ? `Database error: ${clean}` : 'Database error occurred');
  }

  // Generic SequelizeBaseError — covers older driver shapes that don't
  // report name === 'SequelizeDatabaseError' but still carry the same useful
  // properties (.original.message, .parent.message). Without this branch the
  // request would fall through to the default 500 handler which masks the
  // real cause in production.
  if (err.name && err.name.startsWith('Sequelize')) {
    const raw = err.original?.message || err.parent?.message || err.message || '';
    const clean = raw.split('\n')[0].replace(/\s+at .*$/, '').trim();
    logger.error('Sequelize error (generic branch):', {
      name: err.name,
      message: err.message,
      original: err.original?.message,
      parent: err.parent?.message,
      code: err.original?.code || err.parent?.code,
      sql: (err.sql || err.parent?.sql || '').slice(0, 500),
    });
    return ApiResponse.serverError(res, clean ? `Database error: ${clean}` : 'Database error occurred');
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
