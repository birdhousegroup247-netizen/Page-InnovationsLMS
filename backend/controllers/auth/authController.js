const { User, PasswordReset } = require('../../models');
const JWT = require('../../utils/jwt');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../../utils/errors');
const ActivityController = require('../activity/activityController');

/**
 * Authentication Controller
 */

class AuthController {
  /**
   * Register a new user
   * POST /api/auth/register
   */
  static async register(req, res, next) {
    try {
      const { full_name, email, password, role } = req.body;

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new BadRequestError('Email already registered');
      }

      // Handle instructor application
      let userRole = role || 'student';
      let instructorStatus = 'none';
      let registrationMessage = 'Registration successful';

      if (role === 'instructor') {
        // Set role to student and mark instructor status as pending
        userRole = 'student';
        instructorStatus = 'pending';
        registrationMessage = 'Registration successful. Your instructor application is pending approval.';
        logger.info(`New instructor application from: ${email}`);
      }

      // Create user
      const user = await User.createUser({
        full_name,
        email,
        password,
        role: userRole,
        instructor_status: instructorStatus,
      });

      // Generate tokens
      const tokens = JWT.generateTokens(user);

      // Log activity
      logger.info(`New user registered: ${email} (role: ${userRole}, instructor_status: ${instructorStatus})`);

      return ApiResponse.created(res, {
        user: user.toJSON(),
        ...tokens,
        instructor_application_pending: instructorStatus === 'pending',
      }, registrationMessage);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Login user
   * POST /api/auth/login
   */
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Check if account is active
      if (!user.is_active) {
        throw new UnauthorizedError('Account is deactivated. Please contact support.');
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(password);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Invalid email or password');
      }

      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      const tokens = JWT.generateTokens(user);

      // Log activity
      logger.info(`User logged in: ${email}`);

      return ApiResponse.success(res, {
        user: user.toJSON(),
        ...tokens,
      }, 'Login successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get current user
   * GET /api/auth/me
   */
  static async getMe(req, res, next) {
    try {
      // req.user is set by auth middleware
      const user = await User.findByPk(req.user.id, {
        attributes: { exclude: ['password_hash'] },
      });

      if (!user) {
        throw new NotFoundError('User not found');
      }

      return ApiResponse.success(res, { user }, 'User retrieved successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Refresh access token
   * POST /api/auth/refresh
   */
  static async refreshToken(req, res, next) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new BadRequestError('Refresh token is required');
      }

      // Verify refresh token
      const decoded = JWT.verifyRefreshToken(refreshToken);

      // Find user
      const user = await User.findByPk(decoded.id);
      if (!user || !user.is_active) {
        throw new UnauthorizedError('Invalid refresh token');
      }

      // Generate new tokens
      const tokens = JWT.generateTokens(user);

      return ApiResponse.success(res, tokens, 'Token refreshed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Forgot password - Send reset email
   * POST /api/auth/forgot-password
   */
  static async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      // Find user
      const user = await User.findByEmail(email);
      if (!user) {
        // Don't reveal if email exists or not (security best practice)
        return ApiResponse.success(
          res,
          null,
          'If the email exists, a password reset link will be sent'
        );
      }

      // Generate reset token
      const { token, expires_at } = await PasswordReset.createResetToken(user.id);

      // Send password reset email
      try {
        const emailService = require('../../services/email/emailService');
        await emailService.sendPasswordResetEmail(email, user.full_name, token);
        logger.info(`Password reset email sent to: ${email}`);
      } catch (emailError) {
        logger.error('Failed to send password reset email:', emailError);
        // Continue anyway - don't reveal if email exists
      }

      // In development, return the token for testing (remove in production!)
      const responseData = process.env.NODE_ENV === 'development'
        ? { token, expires_at, message: 'Password reset email sent (dev mode)' }
        : null;

      return ApiResponse.success(
        res,
        responseData,
        'If the email exists, a password reset link will be sent'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Reset password with token
   * POST /api/auth/reset-password
   */
  static async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      // Verify token
      const userId = await PasswordReset.verifyToken(token);
      if (!userId) {
        throw new BadRequestError('Invalid or expired reset token');
      }

      // Find user
      const user = await User.findByPk(userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Update password
      user.password_hash = await User.hashPassword(newPassword);
      await user.save();

      // Mark token as used
      await PasswordReset.markAsUsed(token);

      // Log activity
      logger.info(`Password reset successful for user: ${user.email}`);

      return ApiResponse.success(res, null, 'Password reset successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Change password (authenticated user)
   * POST /api/auth/change-password
   */
  static async changePassword(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;

      // Find user
      const user = await User.findByPk(req.user.id);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      // Verify current password
      const isPasswordValid = await user.comparePassword(currentPassword);
      if (!isPasswordValid) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      // Update password
      user.password_hash = await User.hashPassword(newPassword);
      await user.save();

      // Log activity
      logger.info(`Password changed for user: ${user.email}`);

      return ApiResponse.success(res, null, 'Password changed successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Logout (client-side token removal)
   * POST /api/auth/logout
   */
  static async logout(req, res, next) {
    try {
      // Log activity
      if (req.user) {
        logger.info(`User logged out: ${req.user.email}`);
      }

      // Note: Since we're using JWT, logout is primarily client-side
      // The client should remove the token from storage
      // For enhanced security, you could implement token blacklisting

      return ApiResponse.success(res, null, 'Logout successful');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Google OAuth Callback
   * GET /api/auth/google/callback
   */
  static async googleCallback(req, res, next) {
    try {
      // User is authenticated via Passport Google OAuth
      const user = req.user;

      if (!user) {
        throw new UnauthorizedError('Google authentication failed');
      }

      // Generate JWT tokens
      const tokens = JWT.generateTokens(user);

      logger.info(`User logged in via Google: ${user.email}`);

      // Redirect to frontend with tokens in URL params
      // Frontend should extract tokens and store them
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?token=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      // Redirect to frontend with error
      const errorUrl = `${process.env.FRONTEND_URL}/login?error=google_auth_failed`;
      return res.redirect(errorUrl);
    }
  }
}

module.exports = AuthController;
