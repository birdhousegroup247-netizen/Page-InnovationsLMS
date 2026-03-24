const express = require('express');
const router = express.Router();
const CouponController = require('../../controllers/payments/couponController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

// Validate a coupon code for a given course (used live in checkout UI)
router.post('/validate', authenticate, CouponController.validateCoupon);

module.exports = router;
