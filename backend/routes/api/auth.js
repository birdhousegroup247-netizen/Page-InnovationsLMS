const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const AuthController = require('../../controllers/auth/authController');
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

module.exports = router;
