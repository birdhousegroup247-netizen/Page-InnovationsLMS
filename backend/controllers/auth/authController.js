const { User, PasswordReset, InstructorApplication } = require('../../models');
const JWT = require('../../utils/jwt');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../../utils/errors');
const ActivityController = require('../activity/activityController');
const TokenBlacklist = require('../../utils/tokenBlacklist');
const CSRF = require('../../utils/csrf');

/**
 * Authentication Controller
 */

class AuthController {
  /**
   * Helper: Set authentication cookies
   * @private
   */
  static setAuthCookies(res, tokens) {
    const isProduction = process.env.NODE_ENV === 'production';

    // Set access token cookie (httpOnly for security)
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
      secure: isProduction, // HTTPS only in production
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-origin in production, 'lax' for dev
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });

    // Set refresh token cookie (httpOnly for security)
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax', // 'none' for cross-origin in production, 'lax' for dev
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set CSRF token cookie (readable by JavaScript for headers)
    CSRF.setCookie(res);
  }

  /**
   * Helper: Clear authentication cookies
   * @private
   */
  static clearAuthCookies(res) {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    res.clearCookie('csrf-token');
  }
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

      // Set authentication cookies
      this.setAuthCookies(res, tokens);

      // Log registration activity
      await ActivityController.logActivity({
        user_id: user.id,
        action: 'user_register',
        metadata: { email, role: userRole, instructor_status: instructorStatus },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
      });

      // Create instructor application if applicable
      if (instructorStatus === 'pending') {
        await InstructorApplication.createApplication({
          user_id: user.id,
          status: 'pending',
          bio: req.body.bio || null,
          qualifications: req.body.qualifications || null,
          teaching_experience: req.body.teaching_experience || null,
          subject_expertise: req.body.subject_expertise || null,
          portfolio_url: req.body.portfolio_url || null,
        });

        // Log instructor application activity
        await ActivityController.logActivity({
          user_id: user.id,
          action: 'instructor_application_submit',
          metadata: { email, full_name },
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('user-agent'),
        });
      }

      // Log activity
      logger.info(`New user registered: ${email} (role: ${userRole}, instructor_status: ${instructorStatus})`);

      return ApiResponse.created(res, {
        user: user.toJSON(),
        instructor_application_pending: instructorStatus === 'pending',
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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
        // Log failed login attempt
        await ActivityController.logActivity({
          user_id: user.id,
          action: 'failed_login',
          metadata: { email, reason: 'Invalid password' },
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('user-agent'),
        });
        throw new UnauthorizedError('Invalid email or password');
      }

      // Update last login
      await user.updateLastLogin();

      // Generate tokens
      const tokens = JWT.generateTokens(user);

      // Set authentication cookies
      this.setAuthCookies(res, tokens);

      // Log successful login activity
      await ActivityController.logActivity({
        user_id: user.id,
        action: 'login',
        metadata: { email },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
      });

      // Log activity
      logger.info(`User logged in: ${email}`);

      return ApiResponse.success(res, {
        user: user.toJSON(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
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
      // Try to get refresh token from cookie first, fallback to body for backward compatibility
      const refreshToken = req.cookies.refreshToken || req.body.refreshToken;

      if (!refreshToken) {
        throw new BadRequestError('Refresh token is required');
      }

      // Check if token is blacklisted
      const isBlacklisted = await TokenBlacklist.isBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new UnauthorizedError('Token has been revoked');
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

      // Set new authentication cookies
      this.setAuthCookies(res, tokens);

      return ApiResponse.success(res, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }, 'Token refreshed successfully');
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

      // Never expose the token in the response for security
      // The token should only be sent via email
      return ApiResponse.success(
        res,
        null,
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
   * Logout (blacklist tokens and clear cookies)
   * POST /api/auth/logout
   */
  static async logout(req, res, next) {
    try {
      // Get tokens from cookies
      const accessToken = req.cookies.accessToken;
      const refreshToken = req.cookies.refreshToken;

      // Blacklist both tokens if they exist
      if (accessToken) {
        try {
          const decoded = JWT.decode(accessToken);
          const ttl = TokenBlacklist.calculateTTL(decoded);
          await TokenBlacklist.addToBlacklist(accessToken, ttl);
        } catch (error) {
          logger.warn('Failed to blacklist access token:', error);
        }
      }

      if (refreshToken) {
        try {
          const decoded = JWT.decode(refreshToken);
          const ttl = TokenBlacklist.calculateTTL(decoded);
          await TokenBlacklist.addToBlacklist(refreshToken, ttl);
        } catch (error) {
          logger.warn('Failed to blacklist refresh token:', error);
        }
      }

      // Clear authentication cookies
      this.clearAuthCookies(res);

      // Log activity
      if (req.user) {
        await ActivityController.logActivity({
          user_id: req.user.id,
          action: 'logout',
          metadata: { email: req.user.email },
          ip_address: req.ip || req.connection.remoteAddress,
          user_agent: req.get('user-agent'),
        });
        logger.info(`User logged out: ${req.user.email}`);
      }

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

      // Set authentication cookies
      this.setAuthCookies(res, tokens);

      logger.info(`User logged in via Google: ${user.email}`);

      // Redirect to frontend (tokens are now in cookies)
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?success=true`;

      return res.redirect(redirectUrl);
    } catch (error) {
      // Redirect to frontend with error
      const errorUrl = `${process.env.FRONTEND_URL}/login?error=google_auth_failed`;
      return res.redirect(errorUrl);
    }
  }
}

module.exports = AuthController;
