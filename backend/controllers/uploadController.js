const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const ApiResponse = require('../utils/response');
const { ForbiddenError, BadRequestError } = require('../utils/errors');

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
    },
    fileFilter: (req, file, cb) => {
        // Allow images and documents
        const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx/;
        const mimetype = allowedTypes.test(file.mimetype);
        const extname = allowedTypes.test(file.originalname.toLowerCase());

        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Only images and documents are allowed'));
    },
});

class UploadController {
    /**
     * Upload file to Cloudinary
     * POST /api/upload
     */
    static async uploadFile(req, res, next) {
        try {
            if (!req.file) {
                throw new BadRequestError('No file provided');
            }

            const { folder = 'tekyprolms' } = req.body;

            // Upload to Cloudinary using buffer
            const uploadPromise = new Promise((resolve, reject) => {
                const uploadStream = cloudinary.uploader.upload_stream(
                    {
                        folder: folder,
                        resource_type: 'auto', // Automatically detect file type
                    },
                    (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result);
                        }
                    }
                );

                uploadStream.end(req.file.buffer);
            });

            const result = await uploadPromise;

            return ApiResponse.success(
                res,
                {
                    url: result.secure_url,
                    public_id: result.public_id,
                    format: result.format,
                    resource_type: result.resource_type,
                },
                'File uploaded successfully'
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

            if (!publicId) {
                throw new BadRequestError('Public ID is required');
            }

            const result = await cloudinary.uploader.destroy(publicId);

            return ApiResponse.success(res, { result }, 'File deleted successfully');
        } catch (error) {
            next(error);
        }
    }
}

module.exports = { UploadController, upload };
