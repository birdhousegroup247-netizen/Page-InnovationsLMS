const express = require('express');
const router = express.Router();
const CouponsController = require('../../../controllers/admin/couponsController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/stats', CouponsController.getStats);
router.get('/', CouponsController.getAll);
router.get('/:id', CouponsController.getById);
router.post('/', CouponsController.create);
router.put('/:id', CouponsController.update);
router.delete('/:id', CouponsController.delete);

module.exports = router;
