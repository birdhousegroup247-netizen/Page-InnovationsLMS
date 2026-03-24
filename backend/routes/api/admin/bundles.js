const express = require('express');
const router = express.Router();
const { AdminBundlesController } = require('../../../controllers/bundles/bundlesController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

router.get('/', AdminBundlesController.getAll);
router.post('/', AdminBundlesController.create);
router.put('/:id', AdminBundlesController.update);
router.delete('/:id', AdminBundlesController.delete);

module.exports = router;
