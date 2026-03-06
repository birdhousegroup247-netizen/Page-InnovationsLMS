import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  ArrowLeft,
  PlayCircle,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { modulesAPI, coursesAPI } from '../../lib/api';
import { Container, EmptyState } from '../../components/layout';
import { Button, Spinner, Alert, Modal } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function ManageModules() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState(null);

  // Form state for new module
  const [newModule, setNewModule] = useState({
    title: '',
    description: '',
  });

  // Form state for editing module
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
  });

  // Validation errors
  const [validationErrors, setValidationErrors] = useState({});
  const [deleteModuleTarget, setDeleteModuleTarget] = useState(null);

  useEffect(() => {
    fetchCourseAndModules();
  }, [courseId]);

  const fetchCourseAndModules = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch course details
      const courseResponse = await coursesAPI.getById(courseId);
      setCourse(courseResponse.data.data.course);

      // Fetch modules
      const modulesResponse = await modulesAPI.getCourseModules(courseId);
      setModules(modulesResponse.data.data.modules || []);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load course modules');
    } finally {
      setLoading(false);
    }
  };

  const validateModule = (data) => {
    const errors = {};

    if (!data.title || data.title.trim().length < 3) {
      errors.title = 'Title must be at least 3 characters';
    }
    if (data.title && data.title.length > 255) {
      errors.title = 'Title must be less than 255 characters';
    }

    return errors;
  };

  const handleAddModule = async (e) => {
    e.preventDefault();

    const errors = validateModule(newModule);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      const order_index = modules.length + 1;
      await modulesAPI.create(courseId, {
        ...newModule,
        order_index,
      });

      // Reset form
      setNewModule({ title: '', description: '' });
      setIsAdding(false);
      setValidationErrors({});

      // Refresh modules
      await fetchCourseAndModules();
      setSuccess('Module added successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error adding module:', err);
      setError(err.response?.data?.message || 'Failed to add module');
    }
  };

  const startEdit = (module) => {
    setEditingModuleId(module.id);
    setEditForm({
      title: module.title,
      description: module.description || '',
    });
    setValidationErrors({});
  };

  const cancelEdit = () => {
    setEditingModuleId(null);
    setEditForm({ title: '', description: '' });
    setValidationErrors({});
  };

  const handleUpdateModule = async (moduleId) => {
    const errors = validateModule(editForm);
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    try {
      await modulesAPI.update(moduleId, editForm);
      setEditingModuleId(null);
      setEditForm({ title: '', description: '' });
      await fetchCourseAndModules();
      setSuccess('Module updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error updating module:', err);
      setError(err.response?.data?.message || 'Failed to update module');
    }
  };

  const handleDeleteModule = (moduleId) => {
    setDeleteModuleTarget(moduleId);
  };

  const confirmDeleteModule = async () => {
    try {
      await modulesAPI.delete(deleteModuleTarget);
      setDeleteModuleTarget(null);
      await fetchCourseAndModules();
      setSuccess('Module deleted successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting module:', err);
      setError(err.response?.data?.message || 'Failed to delete module');
    }
  };

  const moveModule = async (moduleId, direction) => {
    const currentIndex = modules.findIndex((m) => m.id === moduleId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= modules.length) return;

    // Swap modules
    const newModules = [...modules];
    [newModules[currentIndex], newModules[newIndex]] = [
      newModules[newIndex],
      newModules[currentIndex],
    ];

    // Update UI immediately
    setModules(newModules);

    // Update backend
    try {
      await modulesAPI.update(moduleId, {
        order_index: newIndex + 1,
      });
      await fetchCourseAndModules();
    } catch (err) {
      console.error('Error reordering module:', err);
      setError('Failed to reorder module');
      // Revert on error
      await fetchCourseAndModules();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-dark-900 flex items-center justify-center transition-colors">
        <div className="text-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
            Loading modules...
          </p>
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
            <Link
              to="/instructor/courses"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Courses
            </Link>

            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">
                  Manage Modules
                </h1>
                <p className="text-white/80 mt-1">{course?.title}</p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
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

        {/* Add Module Button */}
        <div className="mb-6">
          {!isAdding && (
            <Button
              variant="primary"
              leftIcon={<Plus className="w-5 h-5" />}
              onClick={() => setIsAdding(true)}
            >
              Add New Module
            </Button>
          )}

          {/* Add Module Form */}
          {isAdding && (
            <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark shadow-sm dark:shadow-card animate-slide-up transition-colors">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2 transition-colors">
                <BookOpen className="w-5 h-5 text-brand-blue" />
                New Module
              </h3>
              <form onSubmit={handleAddModule}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                      Module Title <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={newModule.title}
                      onChange={(e) => {
                        setNewModule({ ...newModule, title: e.target.value });
                        setValidationErrors({ ...validationErrors, title: '' });
                      }}
                      className={cn(
                        'w-full px-4 py-2 rounded-lg border transition-colors',
                        validationErrors.title
                          ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                          : 'border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700',
                        'text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent'
                      )}
                      placeholder="e.g., Introduction to React"
                      required
                    />
                    {validationErrors.title && (
                      <p className="text-red-500 dark:text-red-400 text-sm mt-1 transition-colors">
                        {validationErrors.title}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                      Description (Optional)
                    </label>
                    <textarea
                      value={newModule.description}
                      onChange={(e) =>
                        setNewModule({ ...newModule, description: e.target.value })
                      }
                      className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors"
                      rows={3}
                      placeholder="Brief description of what this module covers..."
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button type="submit" variant="primary" leftIcon={<Save className="w-4 h-4" />}>
                      Save Module
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setIsAdding(false);
                        setNewModule({ title: '', description: '' });
                        setValidationErrors({});
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Modules List */}
        <div className="space-y-4">
          {modules.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-16 h-16" />}
              title="No Modules Yet"
              description="Start building your course by adding modules. Each module can contain multiple lessons."
              actionLabel="Add First Module"
              onAction={() => setIsAdding(true)}
            />
          ) : (
            modules.map((module, index) => (
              <div
                key={module.id}
                className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-elevated transition-all animate-slide-up"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                {editingModuleId === module.id ? (
                  // Edit Mode
                  <div className="p-6">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                          Module Title <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={editForm.title}
                          onChange={(e) => {
                            setEditForm({ ...editForm, title: e.target.value });
                            setValidationErrors({ ...validationErrors, title: '' });
                          }}
                          className={cn(
                            'w-full px-4 py-2 rounded-lg border transition-colors',
                            validationErrors.title
                              ? 'border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20'
                              : 'border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700',
                            'text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent'
                          )}
                        />
                        {validationErrors.title && (
                          <p className="text-red-500 dark:text-red-400 text-sm mt-1 transition-colors">
                            {validationErrors.title}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
                          Description (Optional)
                        </label>
                        <textarea
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({ ...editForm, description: e.target.value })
                          }
                          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-colors"
                          rows={3}
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button
                          variant="primary"
                          leftIcon={<Save className="w-4 h-4" />}
                          onClick={() => handleUpdateModule(module.id)}
                        >
                          Save Changes
                        </Button>
                        <Button variant="ghost" onClick={cancelEdit}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  // View Mode
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="flex items-center justify-center w-8 h-8 rounded-full bg-brand-blue/10 text-brand-blue font-medium">
                            {index + 1}
                          </span>
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary transition-colors">
                            {module.title}
                          </h3>
                        </div>
                        {module.description && (
                          <p className="text-gray-600 dark:text-text-dark-secondary text-sm ml-11 transition-colors">
                            {module.description}
                          </p>
                        )}
                        <div className="flex items-center gap-4 mt-3 ml-11">
                          <span className="text-sm text-gray-500 dark:text-text-dark-muted flex items-center gap-1 transition-colors">
                            <PlayCircle className="w-4 h-4" />
                            {module.contents?.length || 0} lessons
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Reorder buttons */}
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => moveModule(module.id, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-500 dark:text-text-dark-muted hover:text-gray-900 dark:hover:text-text-dark-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move up"
                          >
                            <ChevronUp className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => moveModule(module.id, 'down')}
                            disabled={index === modules.length - 1}
                            className="p-1 text-gray-500 dark:text-text-dark-muted hover:text-gray-900 dark:hover:text-text-dark-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            title="Move down"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>

                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => navigate(`/instructor/courses/${courseId}/modules/${module.id}/lessons`)}
                        >
                          Manage Lessons
                        </Button>
                        <button
                          onClick={() => startEdit(module)}
                          className="p-2 text-gray-500 dark:text-text-dark-muted hover:text-brand-blue transition-colors"
                          title="Edit module"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteModule(module.id)}
                          className="p-2 text-gray-500 dark:text-text-dark-muted hover:text-red-500 transition-colors"
                          title="Delete module"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Info Card */}
        {modules.length > 0 && (
          <div className="mt-8 bg-brand-blue/10 dark:bg-brand-blue/5 border border-brand-blue/20 dark:border-brand-blue/10 rounded-xl p-4 transition-colors">
            <div className="flex gap-3">
              <AlertCircle className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-brand-blue font-medium text-sm">Next Steps</p>
                <p className="text-brand-blue/80 text-sm mt-1">
                  Click "Manage Lessons" on each module to add video lessons, articles, quizzes, and other content.
                </p>
              </div>
            </div>
          </div>
        )}
      </Container>

      <Modal
        isOpen={!!deleteModuleTarget}
        onClose={() => setDeleteModuleTarget(null)}
        title="Delete Module"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Are you sure you want to delete this module? All lessons in this module will also be deleted.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteModuleTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteModule}>Delete Module</Button>
        </div>
      </Modal>
    </>
  );
}
