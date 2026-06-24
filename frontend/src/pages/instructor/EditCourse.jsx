import { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { coursesAPI, categoriesAPI } from '../../lib/api';
import {
  BookOpen,
  CheckCircle,
  ArrowLeft,
  Save,
  Image as ImageIcon,
  X,
} from 'lucide-react';
import { Container } from '../../components/layout';
import { Button, Alert, Spinner } from '../../components/ui';
import CloudinaryUpload from '../../components/common/CloudinaryUpload';

export default function EditCourse() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [fetchingCourse, setFetchingCourse] = useState(true);
  const [categories, setCategories] = useState([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [allCourses, setAllCourses] = useState([]);
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
    prerequisite_course_id: '',
  });

  // Fetch course data and categories on mount
  useEffect(() => {
    fetchCategories();
    fetchCourseData();
    fetchAllCourses();
  }, [id]);

  const fetchCourseData = async () => {
    setFetchingCourse(true);
    try {
      const response = await coursesAPI.getById(id);
      const course = response.data.data.course;

      // Check if user owns this course
      if (course.instructor_id !== user?.id && !['admin', 'super_admin'].includes(user?.role)) {
        setError('You do not have permission to edit this course');
        setTimeout(() => navigate('/instructor/courses'), 2000);
        return;
      }

      // Pre-CloudinaryUpload courses stored a truncated base64 data: URL
      // in the 500-char thumbnail column. Those won't render and saving
      // the form would write them right back. Treat anything that isn't
      // an http(s) URL as "no thumbnail" so the form starts clean.
      const savedThumb =
        typeof course.thumbnail === 'string' &&
        /^(https?:)?\/\//i.test(course.thumbnail)
          ? course.thumbnail
          : '';

      setFormData({
        title: course.title || '',
        description: course.description || '',
        category_id: course.category_id || '',
        difficulty: course.difficulty || 'beginner',
        duration_hours: course.duration_hours || '',
        thumbnail: savedThumb,
        status: course.status || 'draft',
        prerequisite_course_id: course.prerequisite_course_id || '',
      });

      if (savedThumb) {
        setThumbnailPreview(savedThumb);
      }
    } catch (err) {
      console.error('Failed to load course:', err);
      setError(err.response?.data?.message || 'Failed to load course data');
      setTimeout(() => navigate('/instructor/courses'), 2000);
    } finally {
      setFetchingCourse(false);
    }
  };

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

  const fetchAllCourses = async () => {
    try {
      const response = await coursesAPI.getAll({ limit: 100, status: 'published' });
      setAllCourses(response.data.data.courses || []);
    } catch (err) {
      console.error('Failed to load courses:', err);
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
          thumbnail: reader.result,
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

  const handleSubmit = async (e, submitStatus = null) => {
    e.preventDefault();
    setError('');

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      // Prepare data
      const courseData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        category_id: parseInt(formData.category_id),
        difficulty: formData.difficulty,
        duration_hours: formData.duration_hours ? parseInt(formData.duration_hours) : null,
        thumbnail: formData.thumbnail || null,
        prerequisite_course_id: formData.prerequisite_course_id ? parseInt(formData.prerequisite_course_id) : null,
      };

      // Only update status if explicitly changing it
      if (submitStatus) {
        courseData.status = submitStatus;
      }

      const response = await coursesAPI.update(id, courseData);

      if (response.data.success) {
        // Land back on My Courses — that's where the user came from
        // and where the updated thumbnail/title is visible.
        navigate('/instructor/courses', {
          state: {
            message: 'Course updated successfully!',
          },
        });
      }
    } catch (err) {
      setError(
        err.response?.data?.message || 'Failed to update course. Please try again.'
      );
      console.error('Update course error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading spinner while fetching course data
  if (fetchingCourse) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">Loading course data...</p>
        </div>
      </div>
    );
  }

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
                Edit Course
              </h1>
            </div>
            <p className="text-lg text-white/90 animate-fade-in">
              Update your course details and save changes.
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
        <form onSubmit={handleSubmit} className="space-y-6">
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

            {/* Duration and Status - Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              </div>

              {/* Status */}
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                  Course Status
                </label>
                {formData.status === 'published' ? (
                  <div className="w-full px-4 py-2 rounded-lg border border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-medium">
                    Published
                  </div>
                ) : (
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors"
                  >
                    <option value="draft">Draft</option>
                    <option value="pending">Submit for Review</option>
                    <option value="archived">Archived</option>
                  </select>
                )}
                <p className="text-gray-500 dark:text-text-dark-muted text-xs mt-1 transition-colors">
                  {formData.status === 'published' && 'Approved by admin - visible to students'}
                  {formData.status === 'pending' && 'Submitted for admin review'}
                  {formData.status === 'draft' && 'Not visible to students'}
                  {formData.status === 'archived' && 'Hidden from catalog'}
                </p>
              </div>
            </div>

            {/* Prerequisite Course */}
            <div>
              <label htmlFor="prerequisite_course_id" className="block text-sm font-medium text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                Prerequisite Course <span className="text-gray-400 dark:text-text-dark-muted text-xs font-normal">(optional)</span>
              </label>
              <select
                id="prerequisite_course_id"
                name="prerequisite_course_id"
                value={formData.prerequisite_course_id}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors"
              >
                <option value="">No prerequisite</option>
                {allCourses.filter(c => String(c.id) !== String(id)).map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
              <p className="text-gray-500 dark:text-text-dark-muted text-xs mt-1 transition-colors">
                Students must complete this course before enrolling
              </p>
            </div>

            {/* Thumbnail Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
                Course Thumbnail
              </label>

              {/* CloudinaryUpload uploads to Cloudinary and stores the
                  resulting URL. Previous flow stored a base64 data-URL
                  in formData.thumbnail which the backend silently
                  rejected (and emitted no error toast either), so saves
                  appeared to do "nothing". Now identical to CreateCourse. */}
              <CloudinaryUpload
                onUploadSuccess={(url) => {
                  setFormData((prev) => ({ ...prev, thumbnail: url || '' }));
                  setThumbnailPreview(url || null);
                  if (validationErrors.thumbnail) {
                    setValidationErrors((prev) => ({ ...prev, thumbnail: '' }));
                  }
                }}
                onUploadError={(err) =>
                  setValidationErrors((prev) => ({ ...prev, thumbnail: err || 'Upload failed' }))
                }
                acceptedTypes="image"
                maxSizeMB={5}
                currentFile={thumbnailPreview}
                folder="tekyprolms/courses"
              />

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
              onClick={() => navigate('/instructor/courses')}
              disabled={loading}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              variant="primary"
              disabled={loading}
              loading={loading}
              leftIcon={!loading && <Save className="w-5 h-5" />}
            >
              Update Course
            </Button>
          </div>
        </form>

        {/* Info Card */}
        <div className="mt-8 p-4 bg-brand-blue/10 dark:bg-brand-blue/20 border border-brand-blue/30 dark:border-brand-blue/20 rounded-lg transition-colors">
          <div className="flex gap-3">
            <CheckCircle className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-brand-blue font-medium mb-1">Manage Course Content</p>
              <p className="text-brand-blue dark:text-brand-blue text-sm">
                After updating your course details, you can add or edit modules and lessons from your dashboard.
              </p>
            </div>
          </div>
        </div>
      </Container>
    </>
  );
}
