import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { coursesAPI, categoriesAPI } from '../../lib/api';
import {
  BookOpen,
  CheckCircle,
  AlertCircle,
  ArrowLeft,
  Save,
  Send,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { Container } from '../../components/layout';
import { Button, Input, Alert, Spinner } from '../../components/ui';

export default function CreateCourse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});
  const [thumbnailPreview, setThumbnailPreview] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    difficulty: 'beginner',
    duration_hours: '',
    thumbnail: '',
    status: 'draft',
  });

  // Fetch categories on mount
  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data.data.categories || []);
    } catch (err) {
      console.error('Failed to load categories:', err);
    } finally {
      setLoadingCategories(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
    // Clear error for this field
    if (validationErrors[name]) {
      setValidationErrors({
        ...validationErrors,
        [name]: '',
      });
    }
    setError('');
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setValidationErrors({
          ...validationErrors,
          thumbnail: 'Please select an image file',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setValidationErrors({
          ...validationErrors,
          thumbnail: 'Image size should be less than 5MB',
        });
        return;
      }

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
        setFormData({
          ...formData,
          thumbnail: reader.result, // Base64 for now, will use Cloudinary later
        });
      };
      reader.readAsDataURL(file);

      // Clear error
      if (validationErrors.thumbnail) {
        setValidationErrors({
          ...validationErrors,
          thumbnail: '',
        });
      }
    }
  };

  const removeThumbnail = () => {
    setThumbnailPreview(null);
    setFormData({
      ...formData,
      thumbnail: '',
    });
    // Reset file input
    const fileInput = document.getElementById('thumbnail');
    if (fileInput) fileInput.value = '';
  };

  const validateForm = () => {
    const errors = {};

    // Title validation
    if (!formData.title.trim()) {
      errors.title = 'Course title is required';
    } else if (formData.title.trim().length < 5) {
      errors.title = 'Title must be at least 5 characters';
    } else if (formData.title.trim().length > 255) {
      errors.title = 'Title must not exceed 255 characters';
    }

    // Description validation
    if (!formData.description.trim()) {
      errors.description = 'Course description is required';
    } else if (formData.description.trim().length < 20) {
      errors.description = 'Description must be at least 20 characters';
    }

    // Category validation
    if (!formData.category_id) {
      errors.category_id = 'Please select a category';
    }

    // Duration validation (optional but must be positive if provided)
    if (formData.duration_hours && parseInt(formData.duration_hours) <= 0) {
      errors.duration_hours = 'Duration must be a positive number';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e, submitStatus = 'draft') => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data - temporarily exclude thumbnail to avoid Cloudflare WAF blocking
      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category_id: parseInt(formData.category_id),
        difficulty: formData.difficulty,
        duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null,
        // thumbnail: formData.thumbnail || null, // Disabled - triggers Cloudflare WAF
        status: submitStatus,
      };

      const response = await coursesAPI.create(courseData);

      if (response.data.success) {
        // Success! Redirect to instructor dashboard
        navigate('/instructor/dashboard', {
          state: {
            message:
              submitStatus === 'published'
                ? 'Course created and published successfully!'
                : 'Course saved as draft successfully!',
          },
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to create course. Please try again.'
      );
      console.error('Create course error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center gap-3 mb-2">
              <BookOpen className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                Create New Course
              </h1>
            </div>
            <p className="text-lg text-white/90 animate-fade-in">
              Fill in the details below to create your course. You can save as draft and publish later.
            </p>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Error Alert */}
        {error && (
          <Alert variant="danger" className="mb-6">
            {error}
          </Alert>
        )}

        {/* Course Form */}
        <form onSubmit={(e) => handleSubmit(e, 'draft')} className="space-y-6">
          {/* Main Card */}
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm dark:shadow-card p-6 space-y-6 transition-colors">
            {/* Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                Course Title <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <input
                id="title"
                name="title"
                type="text"
                required
                value={formData.title}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  validationErrors.title
                    ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700'
                } text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors`}
                placeholder="e.g., Complete Web Development Bootcamp"
              />
              {validationErrors.title && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1 transition-colors">{validationErrors.title}</p>
              )}
              <p className="text-gray-500 dark:text-text-dark-muted text-xs mt-1 transition-colors">
                Choose a clear, descriptive title for your course
              </p>
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                Course Description <span className="text-red-600 dark:text-red-400">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={6}
                value={formData.description}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  validationErrors.description
                    ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700'
                } text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors resize-none`}
                placeholder="Describe what students will learn in this course..."
              />
              {validationErrors.description && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1 transition-colors">{validationErrors.description}</p>
              )}
              <p className="text-gray-500 dark:text-text-dark-muted text-xs mt-1 transition-colors">
                Provide a comprehensive overview of your course content
              </p>
            </div>

            {/* Category and Difficulty - Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Category */}
              <div>
                <label htmlFor="category_id" className="block text-sm font-medium text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                  Category <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                {loadingCategories ? (
                  <div className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 flex items-center gap-2 transition-colors">
                    <Spinner size="sm" />
                    <span className="text-gray-500 dark:text-text-dark-muted">Loading categories...</span>
                  </div>
                ) : (
                  <select
                    id="category_id"
                    name="category_id"
                    required
                    value={formData.category_id}
                    onChange={handleChange}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      validationErrors.category_id
                        ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                        : 'border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700'
                    } text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors`}
                  >
                    <option value="">Select a category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                )}
                {validationErrors.category_id && (
                  <p className="text-red-600 dark:text-red-400 text-xs mt-1 transition-colors">{validationErrors.category_id}</p>
                )}
              </div>

              {/* Difficulty */}
              <div>
                <label htmlFor="difficulty" className="block text-sm font-medium text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                  Difficulty Level
                </label>
                <select
                  id="difficulty"
                  name="difficulty"
                  value={formData.difficulty}
                  onChange={handleChange}
                  className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors"
                >
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>

            {/* Duration */}
            <div>
              <label htmlFor="duration_hours" className="block text-sm font-medium text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                Estimated Duration (hours)
              </label>
              <input
                id="duration_hours"
                name="duration_hours"
                type="number"
                min="1"
                value={formData.duration_hours}
                onChange={handleChange}
                className={`w-full px-4 py-2 rounded-lg border ${
                  validationErrors.duration_hours
                    ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700'
                } text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors`}
                placeholder="e.g., 10"
              />
              {validationErrors.duration_hours && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1 transition-colors">{validationErrors.duration_hours}</p>
              )}
              <p className="text-gray-500 dark:text-text-dark-muted text-xs mt-1 transition-colors">
                How many hours will it take to complete this course? (Optional)
              </p>
            </div>

            {/* Thumbnail Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                Course Thumbnail
              </label>

              {thumbnailPreview ? (
                <div className="relative">
                  <img
                    src={thumbnailPreview}
                    alt="Thumbnail preview"
                    className="w-full h-64 object-cover rounded-lg border border-gray-300 dark:border-border-dark transition-colors"
                  />
                  <button
                    type="button"
                    onClick={removeThumbnail}
                    className="absolute top-2 right-2 p-2 bg-gray-900/80 hover:bg-gray-900 dark:bg-dark-900/80 dark:hover:bg-dark-900 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 dark:border-border-dark rounded-lg p-8 text-center hover:border-brand-blue dark:hover:border-brand-blue transition-colors">
                  <input
                    id="thumbnail"
                    name="thumbnail"
                    type="file"
                    accept="image/*"
                    onChange={handleThumbnailChange}
                    className="hidden"
                  />
                  <label
                    htmlFor="thumbnail"
                    className="cursor-pointer flex flex-col items-center gap-3"
                  >
                    <div className="p-3 bg-brand-blue/10 dark:bg-brand-blue/20 rounded-lg">
                      <ImageIcon className="w-8 h-8 text-brand-blue" />
                    </div>
                    <div>
                      <p className="text-gray-900 dark:text-text-dark-primary font-medium mb-1 transition-colors">
                        Click to upload thumbnail
                      </p>
                      <p className="text-gray-500 dark:text-text-dark-muted text-sm transition-colors">
                        PNG, JPG up to 5MB (Recommended: 1200x675px)
                      </p>
                    </div>
                  </label>
                </div>
              )}

              {validationErrors.thumbnail && (
                <p className="text-red-600 dark:text-red-400 text-xs mt-1 transition-colors">{validationErrors.thumbnail}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/instructor/dashboard')}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="outline"
              onClick={(e) => handleSubmit(e, 'draft')}
              disabled={loading}
              loading={loading}
              leftIcon={!loading && <Save className="w-5 h-5" />}
            >
              Save as Draft
            </Button>

            <Button
              type="button"
              variant="primary"
              onClick={(e) => handleSubmit(e, 'published')}
              disabled={loading}
              loading={loading}
              leftIcon={!loading && <Send className="w-5 h-5" />}
            >
              Create & Publish
            </Button>
          </div>
        </form>

        {/* Info Card */}
        <div className="mt-8 p-4 bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 dark:border-brand-blue/20 rounded-lg transition-colors">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-blue font-medium mb-1">Next Steps</p>
              <p className="text-brand-blue dark:text-brand-blue text-sm">
                After creating your course, you can add modules, lessons, and content to build your
                curriculum.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
