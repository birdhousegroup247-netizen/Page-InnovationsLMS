const express = require('express');
const router = express.Router();
const { AdminReferralsController } = require('../../../controllers/referrals/referralsController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/', AdminReferralsController.getAll);

module.exports = router;
