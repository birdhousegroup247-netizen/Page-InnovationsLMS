const express = require('express');
const router = express.Router();
const { ReferralsController } = require('../../controllers/referrals/referralsController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

router.use(authenticate);

router.get('/my-stats', ReferralsController.getMyStats);
// /reward is intentionally removed — reward logic is handled internally in the
// payment/enrollment controllers. Exposing it allowed any authenticated user to
// fraudulently trigger referral credits for arbitrary user IDs.

module.exports = router;
