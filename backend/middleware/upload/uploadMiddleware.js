/**
 * Upload Middleware
 * Handles file uploads using Multer
 */

const multer = require('multer');
const path = require('path');
const { BadRequestError } = require('../../utils/errors');

// Configure multer storage (memory storage for Cloudinary upload)
const storage = multer.memoryStorage();

// File filter function
const fileFilter = (allowedTypes) => {
  return (req, file, cb) => {
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestError(
          `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        ),
        false
      );
    }
  };
};

/**
 * Image upload middleware
 * Accepts: jpg, jpeg, png, gif, webp
 * Max size: 5MB
 */
const uploadImage = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: fileFilter([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
  ]),
});

/**
 * Document upload middleware
 * Accepts: pdf, doc, docx, ppt, pptx, xls, xlsx
 * Max size: 10MB
 */
const uploadDocument = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: fileFilter([
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
  ]),
});

/**
 * Video upload middleware
 * Accepts: mp4, avi, mov, wmv
 * Max size: 100MB
 */
const uploadVideo = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: fileFilter([
    'video/mp4',
    'video/avi',
    'video/quicktime',
    'video/x-ms-wmv',
  ]),
});

/**
 * Profile picture upload middleware
 * Accepts: jpg, jpeg, png
 * Max size: 2MB
 */
const uploadProfilePicture = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: fileFilter(['image/jpeg', 'image/jpg', 'image/png']),
});

/**
 * Course thumbnail upload middleware
 * Accepts: jpg, jpeg, png, webp
 * Max size: 3MB
 */
const uploadCourseThumbnail = multer({
  storage: storage,
  limits: {
    fileSize: 3 * 1024 * 1024, // 3MB
  },
  fileFilter: fileFilter([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
  ]),
});

/**
 * Multiple files upload middleware
 * For bulk uploads
 * Max files: 10
 * Max size per file: 5MB
 */
const uploadMultiple = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB per file
    files: 10, // Max 10 files
  },
});

/**
 * Error handler middleware for multer errors
 */
const handleUploadErrors = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File is too large. Please upload a smaller file.',
        error: err.message,
      });
    }

    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum allowed is 10 files.',
        error: err.message,
      });
    }

    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        message: 'Unexpected field in file upload.',
        error: err.message,
      });
    }

    return res.status(400).json({
      success: false,
      message: 'File upload error.',
      error: err.message,
    });
  }

  // Pass other errors to global error handler
  next(err);
};

module.exports = {
  uploadImage,
  uploadDocument,
  uploadVideo,
  uploadProfilePicture,
  uploadCourseThumbnail,
  uploadMultiple,
  handleUploadErrors,
};
