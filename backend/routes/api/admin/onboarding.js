const express = require('express');
const router = express.Router();
const OnboardingController = require('../../../controllers/admin/onboardingController');
const { authenticate, authorize } = require('../../../middleware/auth/authMiddleware');

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin', 'super_admin'));

// ============================================================================
// ONBOARDING CENTER ROUTES
// ============================================================================

// Register a new student (personal → next of kin → academic → review)
router.post('/student', OnboardingController.onboardStudent);

// Register a new staff member (personal → employment → compensation → review)
router.post('/staff', OnboardingController.onboardStaff);

module.exports = router;
