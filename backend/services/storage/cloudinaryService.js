/**
 * Cloudinary Service
 * Handles file uploads to Cloudinary
 */

const cloudinary = require('cloudinary').v2;
const logger = require('../../utils/logger');

// Validate environment variables
if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
  logger.error('Cloudinary configuration error: Missing environment variables', {
    hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME,
    hasApiKey: !!process.env.CLOUDINARY_API_KEY,
    hasApiSecret: !!process.env.CLOUDINARY_API_SECRET
  });
}

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Log configuration status (without exposing secrets)
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
logger.info('Cloudinary configuration loaded', {
  cloud_name: cloudName ? `${cloudName.substring(0, 3)}***` : 'NOT_SET',
  has_api_key: !!process.env.CLOUDINARY_API_KEY,
  has_api_secret: !!process.env.CLOUDINARY_API_SECRET
});

/**
 * Stream a Buffer to Cloudinary via upload_stream. Accepts either a
 * Node Buffer (preferred — what multer.memoryStorage gives us) or a
 * data-URI string (for backwards compat with the base64 callers we
 * haven't fully migrated yet). Kills the base64 memory bloat that
 * used to double RAM footprint per upload.
 */
function _streamUpload(input, uploadOptions) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
    if (Buffer.isBuffer(input)) {
      stream.end(input);
    } else {
      // Legacy data-URI callers: upload_stream can't take a string,
      // so we fall through to the SDK's upload() for those. Keep this
      // path lean — new callers should pass Buffer instead.
      cloudinary.uploader.upload(input, uploadOptions).then(resolve, reject);
    }
  });
}

class CloudinaryService {
  /**
   * Upload image to Cloudinary
   * @param {Buffer|String} input   - multer buffer (preferred) or base64 data URI
   * @param {String} folder         - Cloudinary folder name
   * @param {String} fileName       - Optional file name (public_id)
   * @returns {Promise<Object>}     - Upload result
   */
  static async uploadImage(input, folder = 'lms', fileName = null) {
    try {
      const uploadOptions = {
        folder: `tekypro-lms/${folder}`,
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
        transformation: [
          { width: 1200, height: 630, crop: 'limit' },
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      };
      if (fileName) uploadOptions.public_id = fileName;

      const result = await _streamUpload(input, uploadOptions);
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
      logger.error('Cloudinary image upload error:', {
        message: error.message,
        error: error.error?.message || error.message,
        http_code: error.http_code,
        stack: error.stack
      });
      const errorMessage = error.error?.message || error.message || 'Failed to upload image to cloud storage';
      throw new Error(`Cloudinary upload failed: ${errorMessage}`);
    }
  }

  /**
   * Upload document to Cloudinary
   * @param {String} fileBuffer - Base64 encoded document or buffer
   * @param {String} folder - Cloudinary folder name
   * @param {String} fileName - Optional file name
   * @returns {Promise<Object>} Upload result
   */
  static async uploadDocument(input, folder = 'documents', fileName = null, mimetype = null) {
    try {
      // PDFs need resource_type: 'image' for public delivery to work.
      // Free Cloudinary plans block raw/PDF delivery by default
      // (returns HTTP 401), so we route PDFs through the image
      // pipeline which has no such restriction. Everything else
      // (txt/doc/docx/etc) stays on raw — those formats deliver fine.
      const looksPdf =
        (mimetype && mimetype === 'application/pdf') ||
        (fileName || '').toLowerCase().endsWith('.pdf') ||
        (typeof input === 'string' && input.startsWith('data:application/pdf'));
      const uploadOptions = {
        folder: `tekypro-lms/${folder}`,
        resource_type: looksPdf ? 'image' : 'raw',
      };
      if (fileName) uploadOptions.public_id = fileName;

      const result = await _streamUpload(input, uploadOptions);
      logger.info(`Document uploaded to Cloudinary: ${result.secure_url}`);

      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        size: result.bytes,
        original_filename: result.original_filename,
      };
    } catch (error) {
      logger.error('Cloudinary document upload error:', {
        message: error.message,
        error: error.error?.message || error.message,
        http_code: error.http_code,
        stack: error.stack
      });
      const errorMessage = error.error?.message || error.message || 'Failed to upload document to cloud storage';
      throw new Error(`Cloudinary upload failed: ${errorMessage}`);
    }
  }

  /**
   * Upload video to Cloudinary
   * @param {String} fileBuffer - Base64 encoded video or buffer
   * @param {String} folder - Cloudinary folder name
   * @param {String} fileName - Optional file name
   * @returns {Promise<Object>} Upload result
   */
  static async uploadVideo(input, folder = 'videos', fileName = null) {
    try {
      const uploadOptions = {
        folder: `tekypro-lms/${folder}`,
        resource_type: 'video',
        allowed_formats: ['mp4', 'mov', 'avi', 'wmv', 'flv'],
        chunk_size: 6000000, // 6MB chunks for large files
      };
      if (fileName) uploadOptions.public_id = fileName;

      const result = await _streamUpload(input, uploadOptions);
      logger.info(`Video uploaded to Cloudinary: ${result.secure_url}`);

      return {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
        duration: result.duration,
        size: result.bytes,
      };
    } catch (error) {
      logger.error('Cloudinary video upload error:', {
        message: error.message,
        error: error.error?.message || error.message,
        http_code: error.http_code,
        stack: error.stack
      });
      const errorMessage = error.error?.message || error.message || 'Failed to upload video to cloud storage';
      throw new Error(`Cloudinary upload failed: ${errorMessage}`);
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
      logger.error('Cloudinary delete error:', {
        message: error.message,
        error: error.error?.message || error.message,
        publicId,
        resourceType
      });
      const errorMessage = error.error?.message || error.message || 'Failed to delete file from cloud storage';
      throw new Error(`Cloudinary delete failed: ${errorMessage}`);
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
      logger.error('Cloudinary URL upload error:', {
        message: error.message,
        error: error.error?.message || error.message,
        url
      });
      const errorMessage = error.error?.message || error.message || 'Failed to upload file from URL';
      throw new Error(`Cloudinary upload from URL failed: ${errorMessage}`);
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
      logger.error('Cloudinary get file details error:', {
        message: error.message,
        error: error.error?.message || error.message,
        publicId,
        resourceType
      });
      const errorMessage = error.error?.message || error.message || 'Failed to get file details';
      throw new Error(`Cloudinary get details failed: ${errorMessage}`);
    }
  }
}

module.exports = CloudinaryService;
