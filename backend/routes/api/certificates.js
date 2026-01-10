const express = require('express');
const router = express.Router();
const CertificateController = require('../../controllers/certificates/certificateController');
const { authenticate, authorize } = require('../../middleware/auth/authMiddleware');

// ============================================================================
// CERTIFICATE ROUTES (Student)
// ============================================================================

// Get my certificates (default route)
router.get('/', authenticate, CertificateController.getMyCertificates);

// Get my certificates (explicit route for clarity)
router.get('/my', authenticate, CertificateController.getMyCertificates);

// Check if certificate is available for a course
router.get('/check/:courseId', authenticate, authorize('student'), CertificateController.checkCertificateAvailability);

// Download certificate for a course
router.get('/download/:courseId', authenticate, authorize('student'), CertificateController.downloadCertificate);

// ============================================================================
// CERTIFICATE ROUTES (Public - for verification)
// ============================================================================

// Verify certificate by ID
router.get('/verify/:certificateId', CertificateController.getCertificateById);

module.exports = router;
