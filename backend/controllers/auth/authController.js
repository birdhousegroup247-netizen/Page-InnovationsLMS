const { User, Lead, PasswordReset, EmailVerification, InstructorApplication, Referral } = require('../../models');
const JWT = require('../../utils/jwt');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { BadRequestError, UnauthorizedError, NotFoundError } = require('../../utils/errors');
const ActivityController = require('../activity/activityController');
const TokenBlacklist = require('../../utils/tokenBlacklist');
const CSRF = require('../../utils/csrf');
const emailService = require('../../services/email/emailService');
const { verifyTurnstile } = require('../../utils/turnstile');

/**
 * Authentication Controller
 */

class AuthController {
  /**
   * Helper: Set authentication cookies
   * @private
   */
  static setAuthCookies(res, tokens, opts = {}) {
    const isProduction = process.env.NODE_ENV === 'production';
    const rememberMe = !!opts.rememberMe;

    // Access token: short-lived. Bump to 7 days when "Remember me" is on so
    // the user isn't kicked out daily, otherwise keep the normal 24h window.
    const accessMaxAge = rememberMe
      ? 7 * 24 * 60 * 60 * 1000     // 7 days
      : 24 * 60 * 60 * 1000;         // 24 hours

    // Refresh token: persistent session. 30 days when Remember me, 7 days
    // otherwise (current behavior). 30d is the standard "trust this device"
    // window most modern auth uses (GitHub, Google web).
    const refreshMaxAge = rememberMe
      ? 30 * 24 * 60 * 60 * 1000    // 30 days
      : 7 * 24 * 60 * 60 * 1000;     // 7 days

    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: accessMaxAge,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      maxAge: refreshMaxAge,
    });

    // CSRF cookie (JS-readable for header echo).
    CSRF.setCookie(res);
  }

  /**
   * Helper: Clear authentication cookies
   * @private
   *
   * Express's clearCookie only matches a cookie for removal if the options
   * (sameSite, secure, path, domain) match what was set. Without matching
   * options, the browser keeps the original cookie around — which is how the
   * user ended up auto-logged-in after clicking logout.
   */
  static clearAuthCookies(res) {
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOpts = {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    };
    res.clearCookie('accessToken', cookieOpts);
    res.clearCookie('refreshToken', cookieOpts);
    // csrf-token is not httpOnly (JS reads it), so clear with that variant too.
    res.clearCookie('csrf-token', {
      httpOnly: false,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'lax',
      path: '/',
    });
  }
  /**
   * Register a new student
   * POST /api/auth/register
   *
   * Students only. Instructor applications go through POST /api/auth/instructor-apply,
   * which collects qualifications + document uploads.
   *
   * Creates the user with email_verified=false, issues a verification token + 6-digit
   * code, sends the verification email, and returns a 'verification required' response.
   * No auth cookies are set — the user must verify before they can log in.
   */
  static async register(req, res, next) {
    try {
      const { full_name, email, password, role, phone, country, experience_level, referral_source, utm_source, utm_medium, utm_campaign, ref, turnstile_token, profile_picture, date_of_birth } = req.body;

      // Bot check — only enforced when TURNSTILE_SECRET_KEY is configured.
      // A bot scripting against /api/auth/register without solving the
      // Turnstile widget on the signup page is rejected here.
      const captcha = await verifyTurnstile(turnstile_token, req.ip);
      if (!captcha.ok) {
        throw new BadRequestError('Captcha verification failed — please refresh and try again.');
      }

      // Instructor applications use a separate endpoint with documents
      if (role === 'instructor') {
        throw new BadRequestError(
          'Instructor applications require additional documents. Please use the instructor application page.'
        );
      }

      // Check if user already exists
      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new BadRequestError('Email already registered');
      }

      // Create user. profile_picture is optional from the registration
      // form — students can upload one upfront via the CloudinaryUpload
      // widget, or skip it and set one later from Profile Settings.
      const user = await User.createUser({
        full_name,
        email,
        password,
        role: 'student',
        instructor_status: 'none',
        phone: phone || null,
        profile_picture: profile_picture || null,
        date_of_birth: date_of_birth || null,
      });

      // Create lead record for marketing funnel (fire-and-forget — don't block registration)
      try {
        const lead = await Lead.create({
          full_name,
          email,
          phone: phone || null,
          country: country || null,
          experience_level: experience_level || null,
          referral_source: referral_source || null,
          drip_status: 'registered',
          registered_at: new Date(),
          ip_address: req.ip || req.connection?.remoteAddress || null,
          utm_source: utm_source || null,
          utm_medium: utm_medium || null,
          utm_campaign: utm_campaign || null,
        });
        await user.update({ lead_id: lead.id });
      } catch (leadErr) {
        logger.warn(`Failed to create lead for ${email}: ${leadErr.message}`);
      }

      // Handle referral code (fire-and-forget)
      if (ref) {
        try {
          const referrer = await User.findOne({ where: { referral_code: ref } });
          if (referrer && referrer.id !== user.id) {
            await Referral.create({ referrer_id: referrer.id, referred_id: user.id });
          }
        } catch (refErr) {
          logger.warn(`Failed to create referral record for ref=${ref}: ${refErr.message}`);
        }
      }

      // Issue verification token + send email
      const { token, code } = await EmailVerification.createForUser(user.id);
      try {
        await emailService.sendVerificationEmail(email, full_name, token, code);
        logger.info(`Verification email sent to ${email}`);
      } catch (e) {
        logger.error(`Failed to send verification email to ${email}: ${e.message}`);
        // Continue — user can resend from the verify page
      }

      // Log registration activity
      await ActivityController.logActivity({
        user_id: user.id,
        action: 'user_register',
        metadata: { email, role: 'student' },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
      });

      logger.info(`New user registered (unverified): ${email}`);

      // No tokens, no cookies — must verify first
      return ApiResponse.created(res, {
        verification_required: true,
        email,
      }, 'Account created. Check your inbox for a verification email.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Instructor application — creates the user (role=student, instructor_status=pending),
   * the InstructorApplication record with all required fields + document URLs,
   * issues an email verification token, sends:
   *   - verification email to the applicant
   *   - "application received" email to the applicant
   *   - "new instructor application" notification to every admin
   *
   * POST /api/auth/instructor-apply
   */
  static async instructorApply(req, res, next) {
    try {
      const {
        full_name, email, password, phone, country,
        bio, qualifications, teaching_experience, subject_expertise,
        portfolio_url, cv_url, credential_urls, turnstile_token,
      } = req.body;

      // Bot check — see /api/auth/register for the rationale.
      const captcha = await verifyTurnstile(turnstile_token, req.ip);
      if (!captcha.ok) {
        throw new BadRequestError('Captcha verification failed — please refresh and try again.');
      }

      const existingUser = await User.findByEmail(email);
      if (existingUser) {
        throw new BadRequestError('Email already registered');
      }

      const user = await User.createUser({
        full_name,
        email,
        password,
        role: 'student',
        instructor_status: 'pending',
        phone: phone || null,
      });

      const application = await InstructorApplication.createApplication({
        user_id: user.id,
        status: 'pending',
        bio,
        qualifications,
        teaching_experience,
        subject_expertise,
        portfolio_url: portfolio_url || null,
        cv_url,
        credential_urls: Array.isArray(credential_urls) ? credential_urls : [],
      });

      await ActivityController.logActivity({
        user_id: user.id,
        action: 'instructor_application_submit',
        metadata: { email, full_name },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
      });

      // Issue verification token + send verification email
      const { token, code } = await EmailVerification.createForUser(user.id);
      try {
        await emailService.sendVerificationEmail(email, full_name, token, code);
      } catch (e) {
        logger.error(`Verification email failed for ${email}: ${e.message}`);
      }

      // Application-received confirmation
      emailService.sendInstructorApplicationReceived(email, full_name).catch((e) =>
        logger.warn(`Application-received email failed for ${email}: ${e.message}`)
      );

      // Notify all admins (fire-and-forget — don't block the response)
      (async () => {
        try {
          const admins = await User.findAll({
            where: { role: ['admin', 'super_admin'], is_active: true },
            attributes: ['email', 'full_name'],
          });
          for (const admin of admins) {
            emailService.sendNewInstructorApplicationToAdmin(
              admin.email, admin.full_name, { applicantName: full_name, applicantEmail: email, applicationId: application.id }
            ).catch((e) => logger.warn(`Admin notify failed for ${admin.email}: ${e.message}`));
          }
        } catch (e) {
          logger.warn(`Could not notify admins of new application: ${e.message}`);
        }
      })();

      logger.info(`New instructor application from ${email} (unverified)`);

      return ApiResponse.created(res, {
        verification_required: true,
        application_submitted: true,
        email,
      }, 'Application submitted. Check your inbox to verify your email — the admin team will review your application after verification.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Apply to teach as an already-logged-in user.
   * POST /api/auth/apply-to-teach
   *
   * Same end result as POST /api/auth/instructor-apply, but skips the
   * account-creation step because the user is already authenticated. This is
   * what the "Become an Instructor" button on the student dashboard hits.
   *
   * Refuses if the user already has an active application (pending / approved /
   * under_review) — they'd be applying twice for the same thing.
   */
  static async applyToTeach(req, res, next) {
    try {
      const userId = req.user.id;
      const user = await User.findByPk(userId);
      if (!user) throw new NotFoundError('User not found');

      // Refuse if there's already a current application
      const existing = await InstructorApplication.findByUserId(userId);
      if (existing && ['pending', 'under_review'].includes(existing.status)) {
        throw new BadRequestError('You already have an instructor application in review.');
      }
      if (existing && existing.status === 'approved') {
        throw new BadRequestError('You are already approved as an instructor.');
      }

      const {
        bio, qualifications, teaching_experience, subject_expertise,
        portfolio_url, cv_url, credential_urls,
      } = req.body;

      const application = await InstructorApplication.createApplication({
        user_id: userId,
        status: 'pending',
        bio,
        qualifications,
        teaching_experience,
        subject_expertise,
        portfolio_url: portfolio_url || null,
        cv_url,
        credential_urls: Array.isArray(credential_urls) ? credential_urls : [],
      });

      await user.update({ instructor_status: 'pending' });

      await ActivityController.logActivity({
        user_id: userId,
        action: 'instructor_application_submit',
        metadata: { email: user.email, full_name: user.full_name, source: 'logged_in' },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
      });

      // Confirm to the applicant
      emailService.sendInstructorApplicationReceived(user.email, user.full_name).catch((e) =>
        logger.warn(`Application-received email failed for ${user.email}: ${e.message}`)
      );

      // Notify admins (fire-and-forget)
      (async () => {
        try {
          const admins = await User.findAll({
            where: { role: ['admin', 'super_admin'], is_active: true },
            attributes: ['email', 'full_name'],
          });
          for (const admin of admins) {
            emailService.sendNewInstructorApplicationToAdmin(
              admin.email, admin.full_name, {
                applicantName: user.full_name, applicantEmail: user.email, applicationId: application.id,
              }
            ).catch((e) => logger.warn(`Admin notify failed for ${admin.email}: ${e.message}`));
          }
        } catch (e) {
          logger.warn(`Could not notify admins of new application: ${e.message}`);
        }
      })();

      logger.info(`Existing user ${user.email} submitted an instructor application`);

      return ApiResponse.created(res, {
        application_id: application.id,
        instructor_status: 'pending',
      }, 'Application submitted. Our team will review it within 2–3 business days.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Verify email via link token
   * GET /api/auth/verify-email?token=...
   * Redirects to the frontend with a success or error flag rather than rendering JSON,
   * because users click this from their email client.
   */
  static async verifyEmailByToken(req, res, next) {
    const FE = process.env.FRONTEND_URL || 'http://localhost:5173';
    try {
      const { token } = req.query;
      if (!token) {
        return res.redirect(`${FE}/verify-email?error=missing_token`);
      }
      const record = await EmailVerification.findActiveByToken(token);
      if (!record) {
        return res.redirect(`${FE}/verify-email?error=invalid_or_expired`);
      }
      const user = await User.findByPk(record.user_id);
      if (!user) {
        return res.redirect(`${FE}/verify-email?error=user_not_found`);
      }
      await user.update({ email_verified: true, email_verified_at: new Date() });
      await EmailVerification.markAsUsed(record.id);
      logger.info(`Email verified (link) for ${user.email}`);
      return res.redirect(`${FE}/verify-email?verified=1&email=${encodeURIComponent(user.email)}`);
    } catch (error) {
      logger.error('verifyEmailByToken error:', error);
      return res.redirect(`${FE}/verify-email?error=server_error`);
    }
  }

  /**
   * Verify email via 6-digit code
   * POST /api/auth/verify-email-code  { email, code }
   * On success: marks user verified, issues auth tokens + cookies (auto-login).
   */
  static async verifyEmailByCode(req, res, next) {
    try {
      const { email, code } = req.body;
      const user = await User.findByEmail(email);
      if (!user) {
        throw new NotFoundError('Account not found');
      }
      if (user.email_verified) {
        return ApiResponse.success(res, { already_verified: true }, 'Email already verified — please log in.');
      }
      const record = await EmailVerification.findActiveByUserId(user.id);
      if (!record) {
        throw new BadRequestError('Verification code has expired. Please request a new one.');
      }
      if (record.attempts >= 5) {
        throw new BadRequestError('Too many incorrect attempts. Please request a new code.');
      }
      if (record.verification_code !== code) {
        await record.update({ attempts: record.attempts + 1 });
        throw new BadRequestError('Incorrect code. Please try again.');
      }
      await user.update({ email_verified: true, email_verified_at: new Date() });
      await EmailVerification.markAsUsed(record.id);

      // Auto-login on successful verification
      const tokens = JWT.generateTokens(user);
      this.setAuthCookies(res, tokens);
      await user.updateLastLogin();
      await ActivityController.logActivity({
        user_id: user.id,
        action: 'email_verified',
        metadata: { email: user.email },
        ip_address: req.ip || req.connection.remoteAddress,
        user_agent: req.get('user-agent'),
      });
      logger.info(`Email verified (code) for ${user.email}`);

      // Welcome email after verification
      emailService.sendWelcomeEmail(user.email, user.full_name).catch((e) =>
        logger.warn(`Welcome email failed for ${user.email}: ${e.message}`)
      );

      return ApiResponse.success(res, {
        user: user.toJSON(),
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }, 'Email verified. You are now logged in.');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Resend verification email
   * POST /api/auth/resend-verification  { email }
   * Always returns success-shape to avoid leaking whether email exists.
   */
  static async resendVerification(req, res, next) {
    try {
      const { email } = req.body;
      const user = await User.findByEmail(email);
      if (!user) {
        return ApiResponse.success(res, null, 'If that account exists and is unverified, a new email has been sent.');
      }
      if (user.email_verified) {
        return ApiResponse.success(res, { already_verified: true }, 'This email is already verified. Please log in.');
      }
      const { token, code } = await EmailVerification.createForUser(user.id);
      try {
        await emailService.sendVerificationEmail(user.email, user.full_name, token, code);
        logger.info(`Resent verification email to ${user.email}`);
      } catch (e) {
        logger.error(`Failed to resend verification email to ${user.email}: ${e.message}`);
        throw new BadRequestError('Failed to send verification email. Please try again in a moment.');
      }
      return ApiResponse.success(res, null, 'A new verification email has been sent.');
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
      const { email, password, remember_me } = req.body;

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

      // Gate: must have verified email before logging in.
      // Returns 403 with code so the frontend can redirect to /verify-email.
      if (!user.email_verified) {
        return res.status(403).json({
          success: false,
          message: 'Please verify your email before logging in.',
          code: 'EMAIL_NOT_VERIFIED',
          email: user.email,
        });
      }

      // Gate: if 2FA is enabled, do NOT issue tokens on password alone.
      // Return a 200 with { requires2FA, userId } so the frontend
      // collects the TOTP code and calls /api/auth/2fa/authenticate,
      // which issues the real tokens on successful code verification.
      if (user.two_factor_enabled) {
        logger.info(`Login step 1 (password ok) for ${email}, awaiting 2FA`);
        return ApiResponse.success(res, {
          requires2FA: true,
          userId: user.id,
          rememberMe: !!remember_me,
        }, '2FA code required');
      }

      // Update last login
      await user.updateLastLogin();

      // Generate tokens — extend lifetimes when Remember me is on.
      const tokens = JWT.generateTokens(user, { rememberMe: !!remember_me });

      // Set authentication cookies — Remember me extends them to 30 days.
      this.setAuthCookies(res, tokens, { rememberMe: !!remember_me });

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

      logger.info(`User logged in via Google: ${user.email}`);

      // Pass tokens in URL so frontend can store in localStorage (SPA auth pattern)
      const redirectUrl = `${process.env.FRONTEND_URL}/auth/callback?accessToken=${tokens.accessToken}&refreshToken=${tokens.refreshToken}`;

      return res.redirect(redirectUrl);
    } catch (error) {
      // Redirect to frontend with error
      const errorUrl = `${process.env.FRONTEND_URL}/login?error=google_auth_failed`;
      return res.redirect(errorUrl);
    }
  }
}

module.exports = AuthController;
