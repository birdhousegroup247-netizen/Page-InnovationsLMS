const express = require('express');
const router = express.Router();
const StripeController = require('../../controllers/payments/stripeController');

// POST /api/webhooks/stripe
// Raw body is already set by server.js (express.raw middleware before JSON parser).
// No authentication — Stripe signs the request with STRIPE_WEBHOOK_SECRET instead.
router.post('/stripe', StripeController.handleWebhook);

module.exports = router;
