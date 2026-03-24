const express = require('express');
const router = express.Router();
const AdminAnnouncementsController = require('../../../controllers/admin/announcementsController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// Preview recipient count (before sending)
router.get('/recipient-count', AdminAnnouncementsController.getRecipientCount);

// Get announcement history
router.get('/', AdminAnnouncementsController.getAll);

// Send a new announcement
router.post('/', AdminAnnouncementsController.send);

module.exports = router;
