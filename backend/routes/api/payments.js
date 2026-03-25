const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const StripeController = require('../../controllers/payments/stripeController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// Max 10 checkout attempts per IP per 15 minutes
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many payment requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Create checkout session — user must be authenticated
router.post('/checkout-session', checkoutLimiter, authenticate, StripeController.createCheckoutSession);

// Create checkout session for outstanding installment balance
router.post('/installment-session', checkoutLimiter, authenticate, StripeController.createInstallmentSession);

// Verify payment after Stripe redirect
router.get('/verify', authenticate, StripeController.verifyPayment);

// Get all payments for the current user
router.get('/my', authenticate, StripeController.getMyPayments);

module.exports = router;
