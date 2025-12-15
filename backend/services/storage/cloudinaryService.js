/**
 * Cloudinary Service
 * Handles file uploads to Cloudinary
 */

const cloudinary = require('cloudinary').v2;
const logger = require('../../utils/logger');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

class CloudinaryService {
  /**
   * Upload image to Cloudinary
   * @param {String} fileBuffer - Base64 encoded image or buffer
   * @param {String} folder - Cloudinary folder name
   * @param {String} fileName - Optional file name
   * @returns {Promise<Object>} Upload result
   */
  static async uploadImage(fileBuffer, folder = 'lms', fileName = null) {
    try {
      const uploadOptions = {
        folder: `tekypro-lms/${folder}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
          { width: 1200, height: 630, crop: 'limit' }, // Max dimensions
          { quality: 'auto' }, // Auto quality optimization
          { fetch_format: 'auto' }, // Auto format conversion
        ],
      };

      if (fileName) {
        uploadOptions.public_id = fileName;
      }

      const result = await cloudinary.uploader.upload(fileBuffer, uploadOptions);

      logger.info(`Image uploaded to Cloudinary: ${result.secure_url}`);

      return {
        url: result.secure_url,
        public_id: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      };
    } catch (error) {
      logger.error('Cloudinary image upload error:', error);
      throw new Error('Failed to upload image to cloud storage');
    }
  }

  /**
   * Upload document to Cloudinary
   * @param {String} fileBuffer - Base64 encoded document or buffer
   * @param {String} folder - Cloudinary folder name
   * @param {String} fileName - Optional file name
   * @returns {Promise<Object>} Upload result
   */
  static async uploadDocument(fileBuffer, folder = 'documents', fileName = null) {
    try {
      const uploadOptions = {
        folder: `tekypro-lms/${folder}`,
        resource_type: 'raw',
        allowed_formats: ['pdf', 'doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'txt'],
      };

      if (fileName) {
        uploadOptions.public_id = fileName;
      }

      const result = await cloudinary.uploader.upload(fileBuffer, uploadOptions);

      logger.info(`Document uploaded to Cloudinary: ${result.secure_url}`);

      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        size: result.bytes,
        original_filename: result.original_filename,
      };
    } catch (error) {
      logger.error('Cloudinary document upload error:', error);
      throw new Error('Failed to upload document to cloud storage');
    }
  }

  /**
   * Upload video to Cloudinary
   * @param {String} fileBuffer - Base64 encoded video or buffer
   * @param {String} folder - Cloudinary folder name
   * @param {String} fileName - Optional file name
   * @returns {Promise<Object>} Upload result
   */
  static async uploadVideo(fileBuffer, folder = 'videos', fileName = null) {
    try {
      const uploadOptions = {
        folder: `tekypro-lms/${folder}`,
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'avi', 'wmv', 'flv'],
        chunk_size: 6000000, // 6MB chunks for large files
      };

      if (fileName) {
        uploadOptions.public_id = fileName;
      }

      const result = await cloudinary.uploader.upload(fileBuffer, uploadOptions);

      logger.info(`Video uploaded to Cloudinary: ${result.secure_url}`);

      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        duration: result.duration,
        size: result.bytes,
      };
    } catch (error) {
      logger.error('Cloudinary video upload error:', error);
      throw new Error('Failed to upload video to cloud storage');
    }
  }

  /**
   * Delete file from Cloudinary
   * @param {String} publicId - Cloudinary public ID
   * @param {String} resourceType - Type of resource (image, raw, video)
   * @returns {Promise<Object>} Delete result
   */
  static async deleteFile(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.uploader.destroy(publicId, {
        resource_type: resourceType,
      });

      logger.info(`File deleted from Cloudinary: ${publicId}`);

      return result;
    } catch (error) {
      logger.error('Cloudinary delete error:', error);
      throw new Error('Failed to delete file from cloud storage');
    }
  }

  /**
   * Get optimized image URL
   * @param {String} publicId - Cloudinary public ID
   * @param {Object} options - Transformation options
   * @returns {String} Optimized image URL
   */
  static getOptimizedImageUrl(publicId, options = {}) {
    const {
      width = 800,
      height = 450,
      crop = 'fill',
      quality = 'auto',
      format = 'auto',
    } = options;

    return cloudinary.url(publicId, {
      width,
      height,
      crop,
      quality,
      fetch_format: format,
    });
  }

  /**
   * Upload from URL
   * @param {String} url - URL of the file to upload
   * @param {String} folder - Cloudinary folder name
   * @returns {Promise<Object>} Upload result
   */
  static async uploadFromUrl(url, folder = 'lms') {
    try {
      const result = await cloudinary.uploader.upload(url, {
        folder: `tekypro-lms/${folder}`,
      });

      logger.info(`File uploaded from URL to Cloudinary: ${result.secure_url}`);

      return {
        url: result.secure_url,
        public_id: result.public_id,
      };
    } catch (error) {
      logger.error('Cloudinary URL upload error:', error);
      throw new Error('Failed to upload file from URL');
    }
  }

  /**
   * Get file details
   * @param {String} publicId - Cloudinary public ID
   * @param {String} resourceType - Type of resource
   * @returns {Promise<Object>} File details
   */
  static async getFileDetails(publicId, resourceType = 'image') {
    try {
      const result = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });

      return result;
    } catch (error) {
      logger.error('Cloudinary get file details error:', error);
      throw new Error('Failed to get file details');
    }
  }
}

module.exports = CloudinaryService;
