const express = require('express');
const router = express.Router();
const { ReferralsController } = require('../../controllers/referrals/referralsController');
const { authenticate } = require('../../middleware/auth/authMiddleware');

router.use(authenticate);

router.get('/my-stats', ReferralsController.getMyStats);
router.post('/reward', ReferralsController.rewardReferrer); // internal call from enrollment

module.exports = router;
