const express = require('express');
const router = express.Router();
const StripeController = require('../../controllers/payments/stripeController');
const PaystackController = require('../../controllers/payments/paystackController');

// Raw body is already set by server.js (express.raw middleware before JSON parser).
// No authentication — each gateway signs the request with its own secret.

// POST /api/webhooks/stripe
router.post('/stripe', StripeController.handleWebhook);

// POST /api/webhooks/paystack
router.post('/paystack', PaystackController.handleWebhook);

module.exports = router;
