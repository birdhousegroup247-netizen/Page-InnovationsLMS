const JWT = require('../../utils/jwt');
const { User } = require('../../models');
const ApiResponse = require('../../utils/response');
const { UnauthorizedError, ForbiddenError } = require('../../utils/errors');
const TokenBlacklist = require('../../utils/tokenBlacklist');

/**
 * Authentication Middleware
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from cookie first, fallback to Authorization header for backward compatibility
    let token = req.cookies.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      token = JWT.extractFromHeader(authHeader);
    }

    if (!token) {
      throw new UnauthorizedError('No token provided');
    }

    // Check if token is blacklisted
    const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
    if (isBlacklisted) {
      throw new UnauthorizedError('Token has been revoked');
    }

    // Verify token
    const decoded = JWT.verifyAccessToken(token);

    // Find user
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password_hash'] },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    // Check if user is active
    if (!user.is_active) {
      throw new UnauthorizedError('Account is deactivated');
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return ApiResponse.unauthorized(res, error.message);
    }
    return ApiResponse.unauthorized(res, 'Invalid or expired token');
  }
};

/**
 * Optional Authentication Middleware
 * Attach user to request if token is provided, but don't require it
 */
const optionalAuthenticate = async (req, res, next) => {
  try {
    // Get token from cookie first, fallback to Authorization header
    let token = req.cookies.accessToken;

    if (!token) {
      const authHeader = req.headers.authorization;
      token = JWT.extractFromHeader(authHeader);
    }

    if (token) {
      // Check if token is blacklisted
      const isBlacklisted = await TokenBlacklist.isBlacklisted(token);
      if (!isBlacklisted) {
        const decoded = JWT.verifyAccessToken(token);
        const user = await User.findByPk(decoded.id, {
          attributes: { exclude: ['password_hash'] },
        });

        if (user && user.is_active) {
          req.user = user;
        }
      }
    }

    next();
  } catch (error) {
    // If token is invalid, just continue without user
    next();
  }
};

/**
 * Authorization Middleware Factory
 * Check if user has required role(s)
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    // Match on primary role first.
    if (allowedRoles.includes(req.user.role)) return next();

    // Dual-role grant: if the route allows instructors, a student whose
    // instructor application has been approved also counts. This is what lets
    // one email + one account both teach and learn (Udemy / Skillshare model).
    if (allowedRoles.includes('instructor') && req.user.instructor_status === 'approved') {
      return next();
    }

    return ApiResponse.forbidden(
      res,
      'You do not have permission to access this resource'
    );
  };
};

/**
 * Check if user owns the resource
 * @param {string} paramName - Name of the parameter containing user ID
 */
const checkOwnership = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    const resourceUserId = parseInt(req.params[paramName]);
    const currentUserId = req.user.id;

    // Allow if user is admin/super_admin or owns the resource
    if (
      req.user.role === 'admin' ||
      req.user.role === 'super_admin' ||
      resourceUserId === currentUserId
    ) {
      return next();
    }

    return ApiResponse.forbidden(res, 'You can only access your own resources');
  };
};

/**
 * Block suspended users from accessing course content.
 * Suspended = overdue installment. They can still log in and pay.
 */
const checkNotSuspended = (req, res, next) => {
  if (req.user && req.user.registration_status === 'suspended') {
    return ApiResponse.forbidden(
      res,
      'Your account is suspended due to an overdue installment payment. Please complete your payment to regain access.'
    );
  }
  next();
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
  checkOwnership,
  checkNotSuspended,
};
