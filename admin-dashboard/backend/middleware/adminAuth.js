const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { UnauthorizedError, ForbiddenError } = require('../utils/errors');

/**
 * Admin Authentication Middleware
 * Verifies JWT token and checks if user is admin/super_admin
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] },
    });

    if (!user) {
      throw new UnauthorizedError('User not found');
    }

    if (!user.is_active) {
      throw new UnauthorizedError('Account is inactive');
    }

    // Check if user is admin or super_admin
    if (!['admin', 'super_admin'].includes(user.role)) {
      throw new ForbiddenError('Admin access required');
    }

    // Attach user to request
    req.user = user;

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
    } else if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
    } else {
      next(error);
    }
  }
};

/**
 * Super Admin Only Middleware
 */
const superAdminOnly = (req, res, next) => {
  if (req.user.role !== 'super_admin') {
    return next(new ForbiddenError('Super admin access required'));
  }
  next();
};

module.exports = {
  authenticateAdmin,
  superAdminOnly,
};
