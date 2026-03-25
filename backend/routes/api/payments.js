const express = require('express');
const router = express.Router();
const StripeController = require('../../controllers/payments/stripeController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// Create checkout session — user must be authenticated
router.post('/checkout-session', authenticate, StripeController.createCheckoutSession);

// Create checkout session for outstanding installment balance
router.post('/installment-session', authenticate, StripeController.createInstallmentSession);

// Verify payment after Stripe redirect
router.get('/verify', authenticate, StripeController.verifyPayment);

// Get all payments for the current user
router.get('/my', authenticate, StripeController.getMyPayments);

module.exports = router;
