/**
 * Upload Routes
 * Handles file upload endpoints
 */

const express = require('express');
const router = express.Router();
const UploadController = require('../../controllers/upload/uploadController');
const { authenticate } = require('../../middleware/auth/authMiddleware');
const {
  uploadImage,
  uploadDocument,
  uploadProfilePicture,
  uploadCourseThumbnail,
  uploadMultiple,
  handleUploadErrors,
} = require('../../middleware/upload/uploadMiddleware');

// =============================================================================
// PROFILE PICTURE UPLOAD
// =============================================================================

/**
 * @route   POST /api/upload/profile-picture
 * @desc    Upload profile picture
 * @access  Private
 */
router.post(
  '/profile-picture',
  authenticate,
  uploadProfilePicture.single('file'),
  handleUploadErrors,
  UploadController.uploadProfilePicture
);

// =============================================================================
// COURSE UPLOADS
// =============================================================================

/**
 * @route   POST /api/upload/course-thumbnail
 * @desc    Upload course thumbnail
 * @access  Private (Instructor/Admin)
 */
router.post(
  '/course-thumbnail',
  authenticate,
  uploadCourseThumbnail.single('file'),
  handleUploadErrors,
  UploadController.uploadCourseThumbnail
);

/**
 * @route   POST /api/upload/course-document
 * @desc    Upload course document (PDF, DOCX, etc.)
 * @access  Private (Instructor/Admin)
 */
router.post(
  '/course-document',
  authenticate,
  uploadDocument.single('file'),
  handleUploadErrors,
  UploadController.uploadCourseDocument
);

// =============================================================================
// KNOWLEDGE ARTICLE UPLOADS
// =============================================================================

/**
 * @route   POST /api/upload/article-image
 * @desc    Upload image for knowledge article
 * @access  Private (Instructor/Admin)
 */
router.post(
  '/article-image',
  authenticate,
  uploadImage.single('file'),
  handleUploadErrors,
  UploadController.uploadArticleImage
);

// =============================================================================
// CERTIFICATE UPLOADS
// =============================================================================

/**
 * @route   POST /api/upload/certificate-template
 * @desc    Upload certificate template image
 * @access  Private (Admin only)
 */
router.post(
  '/certificate-template',
  authenticate,
  uploadImage.single('file'),
  handleUploadErrors,
  UploadController.uploadCertificateTemplate
);

// =============================================================================
// MULTIPLE FILES UPLOAD
// =============================================================================

/**
 * @route   POST /api/upload/multiple
 * @desc    Upload multiple files
 * @access  Private
 */
router.post(
  '/multiple',
  authenticate,
  uploadMultiple.array('files', 10),
  handleUploadErrors,
  UploadController.uploadMultiple
);

// =============================================================================
// UPLOAD FROM URL
// =============================================================================

/**
 * @route   POST /api/upload/from-url
 * @desc    Upload file from external URL
 * @access  Private
 */
router.post('/from-url', authenticate, UploadController.uploadFromUrl);

// =============================================================================
// FILE MANAGEMENT
// =============================================================================

/**
 * @route   DELETE /api/upload/:publicId
 * @desc    Delete file from Cloudinary
 * @access  Private
 */
router.delete('/:publicId', authenticate, UploadController.deleteFile);

/**
 * @route   GET /api/upload/details/:publicId
 * @desc    Get file details from Cloudinary
 * @access  Private
 */
router.get('/details/:publicId', authenticate, UploadController.getFileDetails);

module.exports = router;
