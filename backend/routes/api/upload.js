/**
 * Upload Routes
 * Handles file upload endpoints
 */

const express = require('express');
const multer = require('multer');
const router = express.Router();
const UploadController = require('../../controllers/upload/uploadController');
const { authenticate } = require('../../middleware/auth/authMiddleware');
const { uploadRateLimiter } = require('../../middleware/rateLimiter');
const {
  uploadImage,
  uploadDocument,
  uploadProfilePicture,
  uploadCourseThumbnail,
  uploadMultiple,
  handleUploadErrors,
} = require('../../middleware/upload/uploadMiddleware');

// Combined image-or-document multer for announcement attachments. Images
// cap at the announcement upload's 10 MB; documents same.
const uploadAnnouncementAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
    ];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error(`Invalid file type. Allowed: images, PDF, Word, PowerPoint, Excel, text.`), false);
  },
});

// Apply upload rate limiting to all upload routes
router.use(uploadRateLimiter);

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
// ASSIGNMENT SUBMISSION UPLOADS
// =============================================================================

/**
 * @route   POST /api/upload/assignment
 * @desc    Upload assignment submission file (PDF, DOCX, etc.)
 * @access  Private (any authenticated user)
 */
router.post(
  '/assignment',
  authenticate,
  uploadDocument.single('file'),
  handleUploadErrors,
  UploadController.uploadAssignmentFile
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
// ANNOUNCEMENT ATTACHMENTS
// =============================================================================

/**
 * @route   POST /api/upload/announcement-attachment
 * @desc    Upload image or document for an admin announcement
 * @access  Private (Admin)
 */
router.post(
  '/announcement-attachment',
  authenticate,
  uploadAnnouncementAttachment.single('file'),
  handleUploadErrors,
  UploadController.uploadAnnouncementAttachment
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
