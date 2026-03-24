const express = require('express');
const router = express.Router();
const LeadsController = require('../../../controllers/admin/leadsController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/stats', LeadsController.getStats);
router.get('/', LeadsController.getAll);
router.get('/:id', LeadsController.getById);
router.patch('/:id/convert', LeadsController.markConverted);
router.delete('/:id', LeadsController.delete);

module.exports = router;
