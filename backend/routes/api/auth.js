const express = require('express');
const router = express.Router();
const passport = require('../../config/passport');
const AuthController = require('../../controllers/auth/authController');
const { validate } = require('../../middleware/validation/authValidation');
const { authenticate } = require('../../middleware/auth/authMiddleware');

/**
 * Auth Routes
 * Base: /api/auth
 */

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validate('register'), AuthController.register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', validate('login'), AuthController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticate, AuthController.getMe);

// @route   POST /api/auth/refresh
// @desc    Refresh access token
// @access  Public
router.post('/refresh', AuthController.refreshToken);

// @route   POST /api/auth/forgot-password
// @desc    Request password reset
// @access  Public
router.post('/forgot-password', validate('forgotPassword'), AuthController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', validate('resetPassword'), AuthController.resetPassword);

// @route   POST /api/auth/change-password
// @desc    Change password (authenticated user)
// @access  Private
router.post('/change-password', authenticate, validate('changePassword'), AuthController.changePassword);

// @route   POST /api/auth/logout
// @desc    Logout user
// @access  Private
router.post('/logout', authenticate, AuthController.logout);

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
  AuthController.googleCallback
);

module.exports = router;
