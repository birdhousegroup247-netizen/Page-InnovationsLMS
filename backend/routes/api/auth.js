const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const AuthController = require('../../controllers/auth/authController');
const TwoFactorController = require('../../controllers/auth/twoFactorController');
const { validate } = require('../../middleware/validation/authValidation');
const { authenticate } = require('../../middleware/auth/authMiddleware');
const {
  authRateLimiter,
  passwordResetLimiter,
  registrationLimiter,
} = require('../../middleware/rateLimiter');

/**
 * Auth Routes
 * Base: /api/auth
 */

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registrationLimiter, validate('register'), (req, res, next) => AuthController.register(req, res, next));

// @route   GET /api/auth/verify-email
// @desc    Verify email by link token (clicked from email)
// @access  Public
router.get('/verify-email', (req, res, next) => AuthController.verifyEmailByToken(req, res, next));

// @route   POST /api/auth/verify-email-code
// @desc    Verify email by 6-digit code (entered on /verify-email page)
// @access  Public
router.post('/verify-email-code', authRateLimiter, validate('verifyEmailCode'), (req, res, next) => AuthController.verifyEmailByCode(req, res, next));

// @route   POST /api/auth/instructor-apply
// @desc    Register a new user + submit instructor application with documents
// @access  Public
router.post('/instructor-apply', registrationLimiter, validate('instructorApply'), (req, res, next) => AuthController.instructorApply(req, res, next));

// @route   POST /api/auth/apply-to-teach
// @desc    Submit an instructor application as an already-logged-in user
// @access  Private (any authenticated user)
router.post('/apply-to-teach', authenticate, validate('applyToTeach'), (req, res, next) => AuthController.applyToTeach(req, res, next));

// @route   POST /api/auth/resend-verification
// @desc    Resend verification email
// @access  Public
router.post('/resend-verification', passwordResetLimiter, validate('resendVerification'), (req, res, next) => AuthController.resendVerification(req, res, next));

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', authRateLimiter, validate('login'), (req, res, next) => AuthController.login(req, res, next));

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, (req, res, next) => AuthController.getMe(req, res, next));

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', (req, res, next) => AuthController.refreshToken(req, res, next));

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', passwordResetLimiter, validate('forgotPassword'), (req, res, next) => AuthController.forgotPassword(req, res, next));

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', passwordResetLimiter, validate('resetPassword'), (req, res, next) => AuthController.resetPassword(req, res, next));

// @route   POST /api/auth/change-password
// @desc    Change password (authenticated user)
// @access  Private
router.post('/change-password', authenticate, validate('changePassword'), (req, res, next) => AuthController.changePassword(req, res, next));

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, (req, res, next) => AuthController.logout(req, res, next));

// =============================================================================
// GOOGLE OAUTH 2.0 ROUTES
// =============================================================================

// @route   GET /api/auth/google
// @desc    Initiate Google OAuth
// @access  Public
router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google OAuth callback
// @access  Public
router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=google_auth_failed`
  }),
  (req, res, next) => AuthController.googleCallback(req, res, next)
);

// ── 2FA Routes ──────────────────────────────────────────────────────────────
router.get('/2fa/status',        authenticate, TwoFactorController.getStatus);
router.post('/2fa/setup',        authenticate, TwoFactorController.setup);
router.post('/2fa/verify',       authenticate, TwoFactorController.verify);
router.post('/2fa/disable',      authenticate, TwoFactorController.disable);
router.post('/2fa/authenticate', TwoFactorController.authenticate); // public (used at login)

module.exports = router;
