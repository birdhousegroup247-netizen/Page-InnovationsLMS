import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  PlayCircle,
  FileText,
  File,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  BookOpen,
  CheckCircle,
} from 'lucide-react';
import { contentsAPI, modulesAPI, coursesAPI } from '../../lib/api';
import { Container, EmptyState } from '../../components/layout';
import { Button, Spinner, Alert } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function ManageLessons() {
  const { courseId, moduleId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [module, setModule] = useState(null);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);

  // Form state for new lesson
  const [newLesson, setNewLesson] = useState({
    title: '',
    content_type: 'video',
    youtube_video_id: '',
    youtube_duration_seconds: '',
    document_url: '',
    article_content: '',
    is_preview: false,
  });

  // Form state for editing lesson
  const [editForm, setEditForm] = useState({
    title: '',
    content_type: 'video',
    youtube_video_id: '',
    youtube_duration_seconds: '',
    document_url: '',
    article_content: '',
    is_preview: false,
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    fetchData();
  }, [courseId, moduleId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch course, module, and lessons
      const [courseRes, modulesRes, lessonsRes] = await Promise.all([
        coursesAPI.getById(courseId),
        modulesAPI.getCourseModules(courseId),
        contentsAPI.getModuleContents(moduleId),
      ]);

      setCourse(courseRes.data.data.course);
      const foundModule = modulesRes.data.data.modules?.find(
        (m) => m.id === parseInt(moduleId)
      );
      setModule(foundModule);
      setLessons(lessonsRes.data.data.contents || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };

  const validateLesson = (data) => {
    const errors = {};

    if (!data.title || data.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }

    if (data.content_type === 'video' && !data.youtube_video_id) {
      errors.youtube_video_id = 'YouTube Video ID is required for video lessons';
    }

    if (data.content_type === 'document' && !data.document_url) {
      errors.document_url = 'Document URL is required for document lessons';
    }

    if (data.content_type === 'article' && !data.article_content) {
      errors.article_content = 'Article content is required for article lessons';
    }

    return errors;
  };

  const handleAddLesson = async (e) => {
    e.preventDefault();

    const errors = validateLesson(newLesson);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const order_index = lessons.length + 1;
      await contentsAPI.create(moduleId, {
        ...newLesson,
        youtube_duration_seconds: newLesson.youtube_duration_seconds
          ? parseInt(newLesson.youtube_duration_seconds)
          : null,
        order_index,
      });

      setSuccess('Lesson created successfully');
      setTimeout(() => setSuccess(''), 3000);

      // Reset form
      setNewLesson({
        title: '',
        content_type: 'video',
        youtube_video_id: '',
        youtube_duration_seconds: '',
        document_url: '',
        article_content: '',
        is_preview: false,
      });
      setIsAdding(false);
      setValidationErrors({});

      // Refresh lessons
      await fetchData();
    } catch (err) {
      console.error('Error creating lesson:', err);
      setError(err.response?.data?.message || 'Failed to create lesson');
    }
  };

  const startEdit = (lesson) => {
    setEditingLessonId(lesson.id);
    setEditForm({
      title: lesson.title,
      content_type: lesson.content_type,
      youtube_video_id: lesson.youtube_video_id || '',
      youtube_duration_seconds: lesson.youtube_duration_seconds || '',
      document_url: lesson.document_url || '',
      article_content: lesson.article_content || '',
      is_preview: lesson.is_preview || false,
    });
    setValidationErrors({});
  };

  const cancelEdit = () => {
    setEditingLessonId(null);
    setEditForm({
      title: '',
      content_type: 'video',
      youtube_video_id: '',
      youtube_duration_seconds: '',
      document_url: '',
      article_content: '',
      is_preview: false,
    });
    setValidationErrors({});
  };

  const handleUpdateLesson = async (lessonId) => {
    const errors = validateLesson(editForm);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await contentsAPI.update(lessonId, {
        ...editForm,
        youtube_duration_seconds: editForm.youtube_duration_seconds
          ? parseInt(editForm.youtube_duration_seconds)
          : null,
      });

      setSuccess('Lesson updated successfully');
      setTimeout(() => setSuccess(''), 3000);

      setEditingLessonId(null);
      setValidationErrors({});
      await fetchData();
    } catch (err) {
      console.error('Error updating lesson:', err);
      setError(err.response?.data?.message || 'Failed to update lesson');
    }
  };

  const handleDeleteLesson = async (lessonId) => {
    if (!confirm('Are you sure you want to delete this lesson?')) {
      return;
    }

    try {
      await contentsAPI.delete(lessonId);
      setSuccess('Lesson deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      await fetchData();
    } catch (err) {
      console.error('Error deleting lesson:', err);
      setError(err.response?.data?.message || 'Failed to delete lesson');
    }
  };

  const moveLesson = async (lessonId, direction) => {
    const currentIndex = lessons.findIndex((l) => l.id === lessonId);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === lessons.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const newLessons = [...lessons];
    const temp = newLessons[currentIndex];
    newLessons[currentIndex] = newLessons[newIndex];
    newLessons[newIndex] = temp;

    try {
      await contentsAPI.update(newLessons[currentIndex].id, {
        ...newLessons[currentIndex],
        order_index: currentIndex + 1,
      });
      await contentsAPI.update(newLessons[newIndex].id, {
        ...newLessons[newIndex],
        order_index: newIndex + 1,
      });

      await fetchData();
    } catch (err) {
      console.error('Error reordering lessons:', err);
      setError('Failed to reorder lessons');
    }
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'video':
        return PlayCircle;
      case 'article':
        return FileText;
      case 'document':
        return File;
      default:
        return FileText;
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
            <Link
              to={`/instructor/courses/${courseId}/modules`}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Modules
            </Link>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <PlayCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  Manage Lessons
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  {module?.title || 'Loading...'} • {course?.title || ''}
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading lessons...
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-6 animate-slide-up">
                <Alert variant="success" onClose={() => setSuccess('')}>
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    {success}
                  </div>
                </Alert>
              </div>
            )}
            {error && (
              <div className="mb-6 animate-slide-up">
                <Alert variant="danger" onClose={() => setError('')}>
                  {error}
                </Alert>
              </div>
            )}

            {/* Add Lesson Button / Form */}
            <div className="mb-6">
              {!isAdding && (
                <Button
                  variant="primary"
                  onClick={() => setIsAdding(true)}
                  leftIcon={<Plus className="w-5 h-5" />}
                >
                  Add New Lesson
                </Button>
              )}

              {/* Add Lesson Form */}
              {isAdding && (
                <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6 transition-colors">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2 transition-colors">
                    <PlayCircle className="w-5 h-5 text-brand-blue" />
                    New Lesson
                  </h3>
                  <form onSubmit={handleAddLesson}>
                    <LessonForm
                      formData={newLesson}
                      setFormData={setNewLesson}
                      validationErrors={validationErrors}
                      setValidationErrors={setValidationErrors}
                      onCancel={() => {
                        setIsAdding(false);
                        setNewLesson({
                          title: '',
                          content_type: 'video',
                          youtube_video_id: '',
                          youtube_duration_seconds: '',
                          document_url: '',
                          article_content: '',
                          is_preview: false,
                        });
                        setValidationErrors({});
                      }}
                    />
                  </form>
                </div>
              )}
            </div>

            {/* Empty State */}
            {lessons.length === 0 && !isAdding && (
              <EmptyState
                icon={<PlayCircle className="w-16 h-16" />}
                title="No lessons yet"
                description="Add your first lesson to this module. You can add videos, articles, or documents."
                actionLabel="Add First Lesson"
                onAction={() => setIsAdding(true)}
              />
            )}

            {/* Lessons List */}
            {lessons.length > 0 && (
              <div className="space-y-4">
                {lessons.map((lesson, index) => {
                  const Icon = getContentIcon(lesson.content_type);
                  return (
                    <div
                      key={lesson.id}
                      className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden transition-colors"
                    >
                      {editingLessonId === lesson.id ? (
                        // Edit Mode
                        <div className="p-6">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2 transition-colors">
                            <Edit2 className="w-5 h-5 text-brand-blue" />
                            Edit Lesson
                          </h3>
                          <LessonForm
                            formData={editForm}
                            setFormData={setEditForm}
                            validationErrors={validationErrors}
                            setValidationErrors={setValidationErrors}
                            onCancel={cancelEdit}
                            onSave={() => handleUpdateLesson(lesson.id)}
                            isEditing
                          />
                        </div>
                      ) : (
                        // View Mode
                        <div className="p-6">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 mb-2">
                                <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue font-medium text-sm">
                                  {index + 1}
                                </span>
                                <Icon className="w-5 h-5 text-gray-500 dark:text-text-dark-muted transition-colors" />
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary transition-colors">
                                  {lesson.title}
                                </h3>
                                {lesson.is_preview && (
                                  <span className="text-xs px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 border border-green-500/20 transition-colors">
                                    Free Preview
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-4 mt-3 ml-11 flex-wrap">
                                <span className="text-sm text-gray-600 dark:text-text-dark-secondary capitalize transition-colors">
                                  {lesson.content_type}
                                </span>
                                {lesson.youtube_duration_seconds && (
                                  <span className="text-sm text-gray-500 dark:text-text-dark-muted transition-colors">
                                    {formatDuration(lesson.youtube_duration_seconds)}
                                  </span>
                                )}
                                {lesson.youtube_video_id && (
                                  <span className="text-sm text-gray-500 dark:text-text-dark-muted font-mono transition-colors">
                                    ID: {lesson.youtube_video_id}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {/* Reorder buttons */}
                              <div className="flex flex-col gap-1">
                                <button
                                  onClick={() => moveLesson(lesson.id, 'up')}
                                  disabled={index === 0}
                                  className="p-1 text-gray-500 dark:text-text-dark-muted hover:text-gray-700 dark:hover:text-text-dark-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Move up"
                                >
                                  <ChevronUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => moveLesson(lesson.id, 'down')}
                                  disabled={index === lessons.length - 1}
                                  className="p-1 text-gray-500 dark:text-text-dark-muted hover:text-gray-700 dark:hover:text-text-dark-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                  title="Move down"
                                >
                                  <ChevronDown className="w-4 h-4" />
                                </button>
                              </div>

                              <button
                                onClick={() => startEdit(lesson)}
                                className="p-2 text-gray-500 dark:text-text-dark-muted hover:text-brand-blue dark:hover:text-brand-blue transition-colors"
                                title="Edit lesson"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteLesson(lesson.id)}
                                className="p-2 text-gray-500 dark:text-text-dark-muted hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                title="Delete lesson"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Info Card */}
            {lessons.length > 0 && (
              <div className="mt-8 bg-brand-blue/10 dark:bg-brand-blue/5 border border-brand-blue/20 rounded-xl p-4 transition-colors">
                <div className="flex gap-3">
                  <AlertCircle className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-brand-blue font-semibold text-sm">Content Types</p>
                    <p className="text-brand-blue/80 dark:text-brand-blue/70 text-sm mt-1 transition-colors">
                      Video: Paste YouTube Video ID • Document: Enter URL to PDF/file • Article: Write text content directly
                    </p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </Container>
    </>
  );
}

// Reusable Lesson Form Component
function LessonForm({ formData, setFormData, validationErrors, setValidationErrors, onCancel, onSave, isEditing }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSave) {
      onSave();
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
            Lesson Title *
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => {
              setFormData({ ...formData, title: e.target.value });
              setValidationErrors({ ...validationErrors, title: '' });
            }}
            className={cn(
              'w-full px-4 py-2 border rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors',
              validationErrors.title
                ? 'border-red-500 dark:border-red-500'
                : 'border-gray-300 dark:border-border-dark'
            )}
            placeholder="e.g., Introduction to Components"
            required
          />
          {validationErrors.title && (
            <p className="text-red-500 dark:text-red-400 text-sm mt-1 transition-colors">{validationErrors.title}</p>
          )}
        </div>

        {/* Content Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
            Content Type *
          </label>
          <select
            value={formData.content_type}
            onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          >
            <option value="video">Video (YouTube)</option>
            <option value="article">Article (Text)</option>
            <option value="document">Document (PDF/File)</option>
          </select>
        </div>

        {/* Video Fields */}
        {formData.content_type === 'video' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                YouTube Video ID *
              </label>
              <input
                type="text"
                value={formData.youtube_video_id}
                onChange={(e) => {
                  setFormData({ ...formData, youtube_video_id: e.target.value });
                  setValidationErrors({ ...validationErrors, youtube_video_id: '' });
                }}
                className={cn(
                  'w-full px-4 py-2 border rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors',
                  validationErrors.youtube_video_id
                    ? 'border-red-500 dark:border-red-500'
                    : 'border-gray-300 dark:border-border-dark'
                )}
                placeholder="e.g., dQw4w9WgXcQ"
              />
              <p className="text-gray-500 dark:text-text-dark-muted text-xs mt-1 transition-colors">
                From https://www.youtube.com/watch?v=<strong>dQw4w9WgXcQ</strong>
              </p>
              {validationErrors.youtube_video_id && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-1 transition-colors">{validationErrors.youtube_video_id}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                Duration (seconds)
              </label>
              <input
                type="number"
                value={formData.youtube_duration_seconds}
                onChange={(e) =>
                  setFormData({ ...formData, youtube_duration_seconds: e.target.value })
                }
                className="w-full px-4 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                placeholder="e.g., 360"
              />
            </div>
          </>
        )}

        {/* Document Fields */}
        {formData.content_type === 'document' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
              Document URL *
            </label>
            <input
              type="url"
              value={formData.document_url}
              onChange={(e) => {
                setFormData({ ...formData, document_url: e.target.value });
                setValidationErrors({ ...validationErrors, document_url: '' });
              }}
              className={cn(
                'w-full px-4 py-2 border rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors',
                validationErrors.document_url
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-border-dark'
              )}
              placeholder="https://example.com/document.pdf"
            />
            {validationErrors.document_url && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1 transition-colors">{validationErrors.document_url}</p>
            )}
          </div>
        )}

        {/* Article Fields */}
        {formData.content_type === 'article' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
              Article Content *
            </label>
            <textarea
              value={formData.article_content}
              onChange={(e) => {
                setFormData({ ...formData, article_content: e.target.value });
                setValidationErrors({ ...validationErrors, article_content: '' });
              }}
              className={cn(
                'w-full px-4 py-2 border rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none transition-colors',
                validationErrors.article_content
                  ? 'border-red-500 dark:border-red-500'
                  : 'border-gray-300 dark:border-border-dark'
              )}
              rows={8}
              placeholder="Write your article content here..."
            />
            {validationErrors.article_content && (
              <p className="text-red-500 dark:text-red-400 text-sm mt-1 transition-colors">{validationErrors.article_content}</p>
            )}
          </div>
        )}

        {/* Free Preview Checkbox */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="is_preview"
            checked={formData.is_preview}
            onChange={(e) => setFormData({ ...formData, is_preview: e.target.checked })}
            className="w-4 h-4 rounded border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-brand-blue focus:ring-brand-blue focus:ring-offset-white dark:focus:ring-offset-dark-800 transition-colors"
          />
          <label htmlFor="is_preview" className="text-sm text-gray-700 dark:text-text-dark-secondary cursor-pointer transition-colors">
            Make this lesson available as a free preview
          </label>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
            {isEditing ? 'Save Changes' : 'Create Lesson'}
          </Button>
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </form>
  );
}
