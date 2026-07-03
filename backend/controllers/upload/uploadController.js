/**
 * Upload Controller
 * Handles file uploads to Cloudinary
 */

const CloudinaryService = require('../../services/storage/cloudinaryService');
const ApiResponse = require('../../utils/response');
const logger = require('../../utils/logger');
const { BadRequestError } = require('../../utils/errors');

class UploadController {
  /**
   * Upload profile picture
   * POST /api/upload/profile-picture
   */
  static async uploadProfilePicture(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      // Stream the multer buffer straight to Cloudinary — no base64
      // conversion, no doubled RAM. cloudinaryService accepts Buffer.

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadImage(
        req.file.buffer,
        'profile-pictures',
        `user_${req.user.id}_${Date.now()}`
      );

      logger.info(`Profile picture uploaded for user ${req.user.id}`);

      return ApiResponse.success(res, result, 'Profile picture uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload an avatar during signup (public — no req.user yet).
   * Same shape as uploadProfilePicture but the public_id doesn't
   * include a user id (we don't have one), so we anchor it to a
   * timestamp + random suffix instead. The rate-limiter on this
   * router keeps this from being abused.
   * POST /api/upload/signup-avatar
   */
  static async uploadSignupAvatar(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }
      const result = await CloudinaryService.uploadImage(
        req.file.buffer,
        'signup-avatars',
        `signup_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      );
      logger.info(`Signup avatar uploaded: ${result.url}`);
      return ApiResponse.success(res, result, 'Avatar uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload course thumbnail
   * POST /api/upload/course-thumbnail
   */
  static async uploadCourseThumbnail(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      const courseId = req.body.courseId || Date.now();

      // Stream the multer buffer straight to Cloudinary — no base64
      // conversion, no doubled RAM. cloudinaryService accepts Buffer.

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadImage(
        req.file.buffer,
        'course-thumbnails',
        `course_${courseId}_${Date.now()}`
      );

      logger.info(`Course thumbnail uploaded: ${result.url}`);

      return ApiResponse.success(res, result, 'Course thumbnail uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload course document
   * POST /api/upload/course-document
   */
  static async uploadCourseDocument(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      const courseId = req.body.courseId || Date.now();
      const ext = req.file.originalname.match(/\.([^/.]+)$/)?.[1] || '';
      const fileName = req.file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension for public_id

      // Stream the multer buffer straight to Cloudinary — no base64
      // conversion, no doubled RAM. cloudinaryService accepts Buffer.

      // Upload to Cloudinary (include extension in public_id so URL has it)
      const result = await CloudinaryService.uploadDocument(
        req.file.buffer,
        'course-documents',
        `course_${courseId}_${fileName}_${Date.now()}${ext ? '.' + ext : ''}`,
        req.file.mimetype
      );

      logger.info(`Course document uploaded: ${result.url}`);

      return ApiResponse.success(
        res,
        {
          ...result,
          format: ext || result.format,
          original_filename: req.file.originalname,
          size_mb: (result.size / (1024 * 1024)).toFixed(2),
        },
        'Course document uploaded successfully'
      );
    } catch (error) {
      // Surface the real Cloudinary error so a "couldn't upload TXT"
      // toast in the UI tells us why (auth, quota, file too big, etc.).
      const logger = require('../../utils/logger');
      logger.error('uploadCourseDocument failed:', {
        mimetype: req.file?.mimetype,
        size: req.file?.size,
        name: req.file?.originalname,
        message: error.message,
        cloudinary: error.error?.message,
        http_code: error.http_code,
      });
      next(error);
    }
  }

  /**
   * Upload an attachment for an admin announcement.
   * Accepts images OR documents; classifies type so the renderer can pick
   * inline preview vs link-card.
   * POST /api/upload/announcement-attachment
   */
  static async uploadAnnouncementAttachment(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      const isImage = req.file.mimetype.startsWith('image/');
      const ext = req.file.originalname.match(/\.([^/.]+)$/)?.[1] || '';
      const baseName = req.file.originalname.replace(/\.[^/.]+$/, '');
      const publicId = `announcement_${Date.now()}_${baseName}${ext ? '.' + ext : ''}`;

      const result = isImage
        ? await CloudinaryService.uploadImage(req.file.buffer, 'announcement-attachments', publicId)
        : await CloudinaryService.uploadDocument(req.file.buffer, 'announcement-attachments', publicId, req.file.mimetype);

      logger.info(`Announcement attachment uploaded (${isImage ? 'image' : 'document'}): ${result.url}`);

      return ApiResponse.success(
        res,
        {
          url: result.url,
          public_id: result.public_id,
          type: isImage ? 'image' : 'document',
          name: req.file.originalname,
          format: ext || result.format,
          size_mb: (result.size / (1024 * 1024)).toFixed(2),
        },
        'Attachment uploaded'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload certificate template
   * POST /api/upload/certificate-template
   */
  static async uploadCertificateTemplate(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      // Stream the multer buffer straight to Cloudinary — no base64
      // conversion, no doubled RAM. cloudinaryService accepts Buffer.

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadImage(
        req.file.buffer,
        'certificate-templates',
        `template_${Date.now()}`
      );

      logger.info(`Certificate template uploaded: ${result.url}`);

      return ApiResponse.success(res, result, 'Certificate template uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload knowledge article image
   * POST /api/upload/article-image
   */
  static async uploadArticleImage(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      // Stream the multer buffer straight to Cloudinary — no base64
      // conversion, no doubled RAM. cloudinaryService accepts Buffer.

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadImage(
        req.file.buffer,
        'article-images',
        `article_${Date.now()}`
      );

      logger.info(`Article image uploaded: ${result.url}`);

      return ApiResponse.success(res, result, 'Article image uploaded successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload multiple files
   * POST /api/upload/multiple
   */
  static async uploadMultiple(req, res, next) {
    try {
      if (!req.files || req.files.length === 0) {
        throw new BadRequestError('No files uploaded');
      }

      // Bulk uploads are gated to admin/instructor via the router; add
      // a MIME allowlist regardless so a mis-wired route can't turn
      // this into an anonymous "upload any 5 MB × 10 files" endpoint.
      const ALLOWED_MIMES = new Set([
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain',
      ]);
      for (const file of req.files) {
        if (!ALLOWED_MIMES.has(file.mimetype)) {
          throw new BadRequestError(`File type not allowed: ${file.mimetype}`);
        }
      }

      const folder = req.body.folder || 'general';
      const uploadPromises = req.files.map(async (file) => {
        const publicId = `${file.originalname.replace(/\.[^/.]+$/, '')}_${Date.now()}`;
        if (file.mimetype.startsWith('image/')) {
          return CloudinaryService.uploadImage(file.buffer, folder, publicId);
        }
        return CloudinaryService.uploadDocument(file.buffer, folder, publicId, file.mimetype);
      });

      const results = await Promise.all(uploadPromises);

      logger.info(`Multiple files uploaded: ${results.length} files`);

      return ApiResponse.success(
        res,
        { files: results, count: results.length },
        `Successfully uploaded ${results.length} files`
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload assignment submission file (for students)
   * POST /api/upload/assignment
   */
  static async uploadAssignmentFile(req, res, next) {
    try {
      if (!req.file) throw new BadRequestError('No file uploaded');

      const ext = req.file.originalname.match(/\.([^/.]+)$/)?.[1] || '';
      const fileName = req.file.originalname.replace(/\.[^/.]+$/, '');

      const result = await CloudinaryService.uploadDocument(
        req.file.buffer,
        'assignment-submissions',
        `submission_${req.user.id}_${fileName}_${Date.now()}${ext ? '.' + ext : ''}`,
        req.file.mimetype
      );

      logger.info(`Assignment file uploaded by user ${req.user.id}: ${result.url}`);

      return ApiResponse.success(
        res,
        {
          ...result,
          format: ext || result.format,
          original_filename: req.file.originalname,
          size_mb: (result.size / (1024 * 1024)).toFixed(2),
        },
        'Assignment file uploaded successfully'
      );
    } catch (error) {
      next(error);
    }
  }

  /**
   * Delete file from Cloudinary
   * DELETE /api/upload/:publicId
   */
  static async deleteFile(req, res, next) {
    try {
      const { publicId } = req.params;
      const { resourceType } = req.query; // image, raw, or video

      if (!publicId) {
        throw new BadRequestError('Public ID is required');
      }

      const result = await CloudinaryService.deleteFile(
        publicId,
        resourceType || 'image'
      );

      logger.info(`File deleted from Cloudinary: ${publicId}`);

      return ApiResponse.success(res, result, 'File deleted successfully');
    } catch (error) {
      next(error);
    }
  }

  /**
   * Upload from URL
   * (uploadFromUrl removed — nothing in either frontend used it, and it
   * let any authenticated student make Cloudinary ingest arbitrary URLs
   * into our storage. uploads-audit §4.9.)
   */

  /**
   * Get file details
   * GET /api/upload/details/:publicId
   */
  static async getFileDetails(req, res, next) {
    try {
      const { publicId } = req.params;
      const { resourceType } = req.query;

      if (!publicId) {
        throw new BadRequestError('Public ID is required');
      }

      const result = await CloudinaryService.getFileDetails(
        publicId,
        resourceType || 'image'
      );

      return ApiResponse.success(res, result, 'File details retrieved successfully');
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UploadController;
