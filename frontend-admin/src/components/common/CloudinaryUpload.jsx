import { useState } from 'react';
import { Upload, X, Image as ImageIcon, File, Check, AlertCircle } from 'lucide-react';
import { Spinner } from '../ui';
import { tokenStorage } from '../../utils/tokenStorage';

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
  const [preview, setPreview] = useState(currentFile);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

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

      // Per-tab Bearer (see utils/tokenStorage.js). Backend CSRF check
      // exempts any request with an Authorization header — that's how we
      // sidestep the cross-subdomain cookie problem.
      const accessToken = tokenStorage.get('accessToken');
      const csrfToken = document.cookie
        .split('; ')
        .find((row) => row.startsWith('csrf-token='))
        ?.split('=')[1];

      const headers = {};
      if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}${uploadEndpoint}`,
        {
          method: 'POST',
          headers,
          credentials: 'include',
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
      
      // Set preview
      setPreview(imageUrl);
      setProgress(100);
      
      // Call success callback
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
    if (onUploadSuccess) {
      onUploadSuccess(null);
    }
  };

  // Determine if file is an image
  const isImage = preview && (
    preview.includes('.jpg') ||
    preview.includes('.jpeg') ||
    preview.includes('.png') ||
    preview.includes('.gif') ||
    preview.includes('.webp')
  );

  return (
    <div className="w-full">
      {preview ? (
        /* File Preview */
        <div className="relative">
          {isImage ? (
            <div className="relative group">
              <img
                src={preview}
                alt="Preview"
                className="w-full h-40 object-cover rounded-lg border border-gray-300 dark:border-border-dark"
              />
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors opacity-0 group-hover:opacity-100"
              >
                <X className="w-5 h-5" />
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

      {/* Success Message */}
      {preview && !uploading && !error && (
        <div className="mt-3 flex items-center gap-2 text-green-600 dark:text-green-400 text-sm">
          <Check className="w-4 h-4 flex-shrink-0" />
          <p>File uploaded successfully</p>
        </div>
      )}
    </div>
  );
}
