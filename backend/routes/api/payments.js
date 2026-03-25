const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const StripeController = require('../../controllers/payments/stripeController');
const PaystackController = require('../../controllers/payments/paystackController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// Max 10 checkout attempts per IP per 15 minutes
const checkoutLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Too many payment requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// ── Stripe ────────────────────────────────────────────────────────────────────
router.post('/checkout-session', checkoutLimiter, authenticate, StripeController.createCheckoutSession);
router.post('/installment-session', checkoutLimiter, authenticate, StripeController.createInstallmentSession);
router.get('/verify', authenticate, StripeController.verifyPayment);

// ── Paystack ──────────────────────────────────────────────────────────────────
router.post('/paystack/initialize', checkoutLimiter, authenticate, PaystackController.initializeCheckout);
router.post('/paystack/installment', checkoutLimiter, authenticate, PaystackController.initializeInstallmentCheckout);
router.get('/paystack/verify', authenticate, PaystackController.verifyPayment);

// ── Shared ────────────────────────────────────────────────────────────────────
router.get('/my', authenticate, StripeController.getMyPayments);

module.exports = router;
