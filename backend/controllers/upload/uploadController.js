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

      // Convert buffer to base64
      const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadImage(
        base64File,
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
   * Upload course thumbnail
   * POST /api/upload/course-thumbnail
   */
  static async uploadCourseThumbnail(req, res, next) {
    try {
      if (!req.file) {
        throw new BadRequestError('No file uploaded');
      }

      const courseId = req.body.courseId || Date.now();

      // Convert buffer to base64
      const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadImage(
        base64File,
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
      const fileName = req.file.originalname.replace(/\.[^/.]+$/, ''); // Remove extension

      // Convert buffer to base64
      const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadDocument(
        base64File,
        'course-documents',
        `course_${courseId}_${fileName}_${Date.now()}`
      );

      logger.info(`Course document uploaded: ${result.url}`);

      return ApiResponse.success(
        res,
        {
          ...result,
          original_filename: req.file.originalname,
          size_mb: (result.size / (1024 * 1024)).toFixed(2),
        },
        'Course document uploaded successfully'
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

      // Convert buffer to base64
      const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadImage(
        base64File,
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

      // Convert buffer to base64
      const base64File = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;

      // Upload to Cloudinary
      const result = await CloudinaryService.uploadImage(
        base64File,
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

      const folder = req.body.folder || 'general';
      const uploadPromises = req.files.map(async (file) => {
        const base64File = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

        // Determine upload type based on mimetype
        if (file.mimetype.startsWith('image/')) {
          return await CloudinaryService.uploadImage(
            base64File,
            folder,
            `${file.originalname.replace(/\.[^/.]+$/, '')}_${Date.now()}`
          );
        } else {
          return await CloudinaryService.uploadDocument(
            base64File,
            folder,
            `${file.originalname.replace(/\.[^/.]+$/, '')}_${Date.now()}`
          );
        }
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
   * POST /api/upload/from-url
   */
  static async uploadFromUrl(req, res, next) {
    try {
      const { url, folder } = req.body;

      if (!url) {
        throw new BadRequestError('URL is required');
      }

      const result = await CloudinaryService.uploadFromUrl(url, folder || 'general');

      logger.info(`File uploaded from URL: ${url}`);

      return ApiResponse.success(res, result, 'File uploaded from URL successfully');
    } catch (error) {
      next(error);
    }
  }

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
