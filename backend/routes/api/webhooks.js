const express = require('express');
const router = express.Router();
const StripeController = require('../../controllers/payments/stripeController');
const PaystackController = require('../../controllers/payments/paystackController');
const PayPalController = require('../../controllers/payments/paypalController');

// Raw body is already set by server.js (express.raw middleware before JSON parser).
// No authentication — each gateway signs the request with its own secret.

// POST /api/webhooks/stripe
router.post('/stripe', StripeController.handleWebhook);

// POST /api/webhooks/paystack
router.post('/paystack', PaystackController.handleWebhook);

// POST /api/webhooks/paypal
router.post('/paypal', PayPalController.handleWebhook);

module.exports = router;
