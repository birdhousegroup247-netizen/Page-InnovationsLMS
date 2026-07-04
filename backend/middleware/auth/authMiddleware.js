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
    // Bearer header FIRST, cookie as fallback. The cookie is browser-wide
    // (shared by every tab and by both frontends), so if it wins, whoever
    // logged in last hijacks every other tab's identity. The per-tab
    // Authorization header is the caller's explicit identity — honor it.
    // Cookie fallback remains for cookie-only sessions (Google OAuth).
    let token = JWT.extractFromHeader(req.headers.authorization);

    if (!token) {
      token = req.cookies.accessToken;
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

    // Token-version check: after a password change or a forced-logout
    // the DB value is bumped and every previously-issued token becomes
    // invalid. Kicks in even without Redis (unlike the token blacklist).
    // Legacy tokens issued before this field existed have tv=undefined
    // and are treated as version 0 — matches the User default so nothing
    // breaks on the first deploy.
    const dbVersion = user.token_version || 0;
    const tokenVersion = decoded.tv || 0;
    if (tokenVersion !== dbVersion) {
      throw new UnauthorizedError('Session ended. Please log in again.');
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
    // Bearer header first, cookie fallback — same ordering as authenticate.
    let token = JWT.extractFromHeader(req.headers.authorization);

    if (!token) {
      token = req.cookies.accessToken;
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

/**
 * Fine-grained permission check for admin routes. Works alongside the
 * existing `authorize()` role-based check — you can wire either one
 * on any route.
 *
 * Usage: `router.post('/payouts', authenticate, requirePermission('payments.approve'), handler)`
 *
 * Semantics:
 *   - super_admin bypasses every check
 *   - non-admins are rejected (403)
 *   - admins must have the exact permission string in
 *     `user.admin_permissions` — a JSON array on the users row
 *
 * Legacy admins with `admin_permissions === null` behave as if they
 * have no explicit permissions, so wiring this middleware on a route
 * effectively opts every legacy admin out until an operator lists
 * their perms. Deliberate: forces the client to think through who
 * gets what. See VIREL-vs-Page Innovations-audit §2.5 for why we adopted the
 * pattern.
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }
    if (req.user.role === 'super_admin') return next();
    if (req.user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'Admin access required');
    }
    const perms = Array.isArray(req.user.admin_permissions)
      ? req.user.admin_permissions
      : [];
    if (!perms.includes(permission)) {
      return ApiResponse.forbidden(res, `Missing permission: ${permission}`);
    }
    next();
  };
};

module.exports = {
  authenticate,
  optionalAuthenticate,
  authorize,
  checkOwnership,
  checkNotSuspended,
  requirePermission,
};
