const express = require('express');
const router = express.Router();
const { BundlesController } = require('../../controllers/bundles/bundlesController');

// Public routes
router.get('/', BundlesController.getAll);
router.get('/:id', BundlesController.getById);

module.exports = router;
