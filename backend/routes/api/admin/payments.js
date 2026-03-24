const express = require('express');
const router = express.Router();
const AdminPaymentsController = require('../../../controllers/admin/paymentsController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// Stats (before /:id)
router.get('/stats', AdminPaymentsController.getStats);

// List all payments
router.get('/', AdminPaymentsController.getAllPayments);

// Issue refund for a payment
router.post('/:id/refund', AdminPaymentsController.issueRefund);

module.exports = router;
