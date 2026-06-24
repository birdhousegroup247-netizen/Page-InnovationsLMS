import { useState } from 'react';
import { Upload, X, Image as ImageIcon, File, Check, AlertCircle } from 'lucide-react';
import { Spinner } from '../ui';

/**
 * CloudinaryUpload Component
 * Reusable component for uploading images and documents to Cloudinary
 * 
 * @param {Function} onUploadSuccess - Callback with uploaded file URL
 * @param {Function} onUploadError - Callback with error message
 * @param {string} acceptedTypes - 'image' | 'document' | 'any'
 * @param {number} maxSizeMB - Maximum file size in MB (default: 10)
 * @param {string} currentFile - Current file URL (for showing existing file)
 * @param {string} folder - Cloudinary folder to upload to (optional)
 * @param {string} uploadEndpoint - Backend upload endpoint path (default: '/api/upload/course-thumbnail')
 */
// Legacy / broken thumbnails: anything that isn't a usable http(s) URL.
// The first-gen flow stored a base64 data-URL straight into a STRING(500)
// column, so what came back from the DB was a truncated data: blob that
// renders as a broken <img>. Treat those as "no preview" so the user
// gets the upload area instead of a misleading broken tile.
const isUsableUrl = (val) =>
  typeof val === 'string' &&
  val.length > 0 &&
  /^(https?:)?\/\//i.test(val);

export default function CloudinaryUpload({
  onUploadSuccess,
  onUploadError,
  acceptedTypes = 'image',
  maxSizeMB = 10,
  currentFile = null,
  folder = null,
  uploadEndpoint = '/api/upload/course-thumbnail',
}) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(isUsableUrl(currentFile) ? currentFile : null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [justUploaded, setJustUploaded] = useState(false);
  const [imgBroken, setImgBroken] = useState(false);

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  // Determine accepted file types
  const getAcceptedFileTypes = () => {
    switch (acceptedTypes) {
      case 'image':
        return 'image/*';
      case 'document':
        return '.pdf,.doc,.docx,.txt';
      case 'any':
        return 'image/*,.pdf,.doc,.docx,.txt';
      default:
        return 'image/*';
    }
  };

  // Validate file
  const validateFile = (file) => {
    // Check file size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxSizeMB) {
      return `File size must be less than ${maxSizeMB}MB`;
    }

    // Check file type
    const isImage = file.type.startsWith('image/');
    const isDocument = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ].includes(file.type);

    if (acceptedTypes === 'image' && !isImage) {
      return 'Please select an image file';
    }
    if (acceptedTypes === 'document' && !isDocument) {
      return 'Please select a document file (PDF, DOC, DOCX, TXT)';
    }
    if (acceptedTypes === 'any' && !isImage && !isDocument) {
      return 'Please select an image or document file';
    }

    return null;
  };

  // Upload to backend API (which uploads to Cloudinary)
  const uploadFile = async (file) => {
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      if (onUploadError) onUploadError(validationError);
      return;
    }

    setUploading(true);
    setError('');
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (folder) {
        formData.append('folder', folder);
      }

      // Upload to backend API — per-tab Bearer token (see tokenStorage.js).
      // Public endpoints (e.g. /api/upload/signup-avatar during
      // registration) won't have a session yet, so only attach the
      // Authorization header when we actually have a token.
      const { tokenStorage } = await import('../../utils/tokenStorage');
      const token = tokenStorage.get('accessToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${uploadEndpoint}`,
        {
          method: 'POST',
          headers,
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Upload error:', errorData);
        throw new Error(errorData.message || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();
      const imageUrl = data.data.url;

      setPreview(imageUrl);
      setProgress(100);
      setJustUploaded(true);
      setImgBroken(false);

      if (onUploadSuccess) {
        onUploadSuccess(imageUrl);
      }
    } catch (err) {
      console.error('Upload error:', err);
      const errorMessage = err.message || 'Failed to upload file';
      setError(errorMessage);
      if (onUploadError) {
        onUploadError(errorMessage);
      }
    } finally {
      setUploading(false);
    }
  };

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  // Handle drag and drop
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      uploadFile(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // Remove file
  const handleRemove = () => {
    setPreview(null);
    setProgress(0);
    setError('');
    setJustUploaded(false);
    setImgBroken(false);
    if (onUploadSuccess) {
      onUploadSuccess(null);
    }
  };

  // Cloudinary delivers via /image/upload/ regardless of extension once we
  // route PDFs through that pipeline, so treat any URL whose path looks
  // like an image (or any /image/upload/ URL) as renderable. This way we
  // don't fall back to the "file uploaded" card just because the URL
  // happens to lack a recognized extension.
  const isImage = !!preview && (
    /\.(jpg|jpeg|png|gif|webp|svg|bmp)(\?|$)/i.test(preview) ||
    /\/image\/upload\//i.test(preview) ||
    acceptedTypes === 'image'
  );

  return (
    <div className="w-full">
      {preview ? (
        /* File Preview */
        <div className="relative">
          {isImage && !imgBroken ? (
            <div className="relative group">
              <img
                src={preview}
                alt="Preview"
                onError={() => setImgBroken(true)}
                className="w-full h-64 object-cover rounded-lg border border-gray-300 dark:border-border-dark bg-gray-100 dark:bg-dark-700"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          ) : isImage && imgBroken ? (
            <div className="flex items-center justify-between p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-300 dark:border-amber-700">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-lg">
                  <AlertCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                    Stored image won't load
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    This thumbnail is broken — click Replace to upload a new one.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-lg transition-colors"
              >
                Replace
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-300 dark:border-border-dark">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-brand-blue/10 rounded-lg">
                  <File className="w-6 h-6 text-brand-blue" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary">
                    File uploaded
                  </p>
                  <p className="text-xs text-gray-500 dark:text-text-dark-muted truncate max-w-xs">
                    {preview}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemove}
                className="p-2 hover:bg-gray-200 dark:hover:bg-dark-600 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-text-dark-secondary" />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* Upload Area */
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          className="border-2 border-dashed border-gray-300 dark:border-border-dark rounded-lg p-8 text-center hover:border-brand-blue dark:hover:border-brand-blue transition-colors cursor-pointer"
        >
          <input
            type="file"
            accept={getAcceptedFileTypes()}
            onChange={handleFileChange}
            disabled={uploading}
            className="hidden"
            id="cloudinary-upload"
          />
          <label
            htmlFor="cloudinary-upload"
            className="cursor-pointer flex flex-col items-center gap-3"
          >
            {uploading ? (
              <>
                <Spinner size="lg" />
                <p className="text-gray-900 dark:text-text-dark-primary font-medium">
                  Uploading... {progress}%
                </p>
              </>
            ) : (
              <>
                <div className="p-3 bg-brand-blue/10 dark:bg-brand-blue/20 rounded-lg">
                  {acceptedTypes === 'document' ? (
                    <File className="w-8 h-8 text-brand-blue" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-brand-blue" />
                  )}
                </div>
                <div>
                  <p className="text-gray-900 dark:text-text-dark-primary font-medium mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-gray-500 dark:text-text-dark-muted text-sm">
                    {acceptedTypes === 'image' && `Images up to ${maxSizeMB}MB (PNG, JPG, GIF, WebP)`}
                    {acceptedTypes === 'document' && `Documents up to ${maxSizeMB}MB (PDF, DOC, DOCX, TXT)`}
                    {acceptedTypes === 'any' && `Images or documents up to ${maxSizeMB}MB`}
                  </p>
                </div>
              </>
            )}
          </label>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Success Message — only after a real upload in this session */}
      {justUploaded && !uploading && !error && (
        <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          <p>File uploaded successfully</p>
        </div>
      )}
    </div>
  );
}
