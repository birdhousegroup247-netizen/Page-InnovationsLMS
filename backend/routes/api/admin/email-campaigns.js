const express = require('express');
const router = express.Router();
const EmailCampaignsController = require('../../../controllers/admin/emailCampaignsController');
const { authenticate } = require('../../../middleware/auth/authMiddleware');
const { requireAdmin } = require('../../../middleware/auth/adminMiddleware');

router.use(authenticate, requireAdmin);

router.get('/', EmailCampaignsController.list);
router.get('/:id', EmailCampaignsController.getById);
router.post('/', EmailCampaignsController.create);
router.put('/:id', EmailCampaignsController.update);
router.delete('/:id', EmailCampaignsController.remove);
router.post('/:id/send', EmailCampaignsController.sendNow);
router.post('/:id/schedule', EmailCampaignsController.schedule);

module.exports = router;
