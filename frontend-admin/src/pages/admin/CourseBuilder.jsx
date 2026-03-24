import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { adminCoursesAPI, modulesAPI, contentsAPI } from '../../lib/api';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  Save,
  Eye,
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  Video,
  FileText,
  File,
  GripVertical,
  ArrowUp,
  ArrowDown,
  Play
} from 'lucide-react';
import { Container } from '../../components/layout';
import { Button, Input, Spinner, Badge, Modal } from '../../components/ui';
import { cn } from '../../utils/cn';
import CloudinaryUpload from '../../components/common/CloudinaryUpload';

export default function CourseBuilder() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // State
  const [course, setCourse] = useState(null);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedModules, setExpandedModules] = useState(new Set());

  // Modal states
  const [isAddModuleOpen, setIsAddModuleOpen] = useState(false);
  const [isEditModuleOpen, setIsEditModuleOpen] = useState(false);
  const [isAddContentOpen, setIsAddContentOpen] = useState(false);
  const [isEditContentOpen, setIsEditContentOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Selected items
  const [selectedModule, setSelectedModule] = useState(null);
  const [selectedContent, setSelectedContent] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Forms
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [contentForm, setContentForm] = useState({
    title: '',
    description: '',
    content_type: 'video',
    youtube_url: '',
    youtube_video_id: '',
    document_url: '',
    document_type: '',
    article_content: '',
    duration_minutes: '',
    is_preview: false,
    unlock_date: '',
    unlock_after_days: '',
  });

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [courseRes, modulesRes] = await Promise.all([
        adminCoursesAPI.getById(courseId),
        modulesAPI.getCourseModules(courseId)
      ]);

      setCourse(courseRes.data.data.course);
      setModules(modulesRes.data.data.modules || []);

      // Expand all modules by default
      const allModuleIds = new Set((modulesRes.data.data.modules || []).map(m => m.id));
      setExpandedModules(allModuleIds);
    } catch (error) {
      console.error('Error fetching course data:', error);
      showToast('Failed to load course data', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Toggle module expansion
  const toggleModule = (moduleId) => {
    setExpandedModules(prev => {
      const newSet = new Set(prev);
      if (newSet.has(moduleId)) {
        newSet.delete(moduleId);
      } else {
        newSet.add(moduleId);
      }
      return newSet;
    });
  };

  // Module CRUD
  const handleAddModule = async () => {
    if (!moduleForm.title.trim()) {
      showToast('Module title is required', 'error');
      return;
    }

    try {
      setSaving(true);
      const orderIndex = modules.length + 1;
      await modulesAPI.create(courseId, {
        ...moduleForm,
        order_index: orderIndex
      });

      showToast('Module added successfully', 'success');
      setIsAddModuleOpen(false);
      setModuleForm({ title: '', description: '' });
      fetchCourseData();
    } catch (error) {
      console.error('Error adding module:', error);
      showToast(error.response?.data?.message || 'Failed to add module', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!selectedModule || !moduleForm.title.trim()) {
      showToast('Module title is required', 'error');
      return;
    }

    try {
      setSaving(true);
      await modulesAPI.update(selectedModule.id, moduleForm);

      showToast('Module updated successfully', 'success');
      setIsEditModuleOpen(false);
      setSelectedModule(null);
      setModuleForm({ title: '', description: '' });
      fetchCourseData();
    } catch (error) {
      console.error('Error updating module:', error);
      showToast(error.response?.data?.message || 'Failed to update module', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (module) => {
    setDeleteTarget({ type: 'module', item: module });
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      setSaving(true);
      if (deleteTarget.type === 'module') {
        await modulesAPI.delete(deleteTarget.item.id);
        showToast('Module deleted successfully', 'success');
      } else if (deleteTarget.type === 'content') {
        await contentsAPI.delete(deleteTarget.item.id);
        showToast('Lesson deleted successfully', 'success');
      }

      setIsDeleteConfirmOpen(false);
      setDeleteTarget(null);
      fetchCourseData();
    } catch (error) {
      console.error('Error deleting:', error);
      showToast(error.response?.data?.message || 'Failed to delete', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Content CRUD
  const parseYouTubeUrl = (url) => {
    if (!url) return null;

    // Handle various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/ // Just the ID
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    return null;
  };

  const handleAddContent = async (moduleId) => {
    setSelectedModule(modules.find(m => m.id === moduleId));
    setContentForm({
      title: '',
      description: '',
      content_type: 'video',
      youtube_url: '',
      youtube_video_id: '',
      document_url: '',
      document_type: '',
      article_content: '',
      duration_minutes: '',
      is_preview: false,
      unlock_date: '',
      unlock_after_days: '',
    });
    setIsAddContentOpen(true);
  };

  const handleEditContent = (module, content) => {
    setSelectedModule(module);
    setSelectedContent(content);
    setContentForm({
      title: content.title || '',
      description: content.description || '',
      content_type: content.content_type || 'video',
      youtube_url: content.youtube_url || '',
      youtube_video_id: content.youtube_video_id || '',
      document_url: content.document_url || '',
      document_type: content.document_type || '',
      article_content: content.article_content || '',
      duration_minutes: content.duration_minutes || '',
      is_preview: content.is_preview || false,
      unlock_date: content.unlock_date || '',
      unlock_after_days: content.unlock_after_days || '',
    });
    setIsEditContentOpen(true);
  };

  const handleSaveContent = async () => {
    if (!contentForm.title.trim()) {
      showToast('Lesson title is required', 'error');
      return;
    }

    // Validate based on content type
    if (contentForm.content_type === 'video' && !contentForm.youtube_url && !contentForm.youtube_video_id) {
      showToast('YouTube URL or Video ID is required for video lessons', 'error');
      return;
    }

    if (contentForm.content_type === 'document' && !contentForm.document_url) {
      showToast('Document URL is required for document lessons', 'error');
      return;
    }

    if (contentForm.content_type === 'article' && !contentForm.article_content.trim()) {
      showToast('Article content is required', 'error');
      return;
    }

    try {
      setSaving(true);

      const contentData = {
        title: contentForm.title,
        description: contentForm.description,
        content_type: contentForm.content_type,
        is_preview: contentForm.is_preview,
        unlock_date: contentForm.unlock_date || null,
        unlock_after_days: contentForm.unlock_after_days ? parseInt(contentForm.unlock_after_days) : null,
        order_index: selectedModule.contents ? selectedModule.contents.length + 1 : 1
      };

      if (contentForm.content_type === 'video') {
        const url = contentForm.youtube_url.trim();
        const isYouTube = /(?:youtube\.com|youtu\.be)/i.test(url);
        const ytId = isYouTube ? parseYouTubeUrl(url) : null;
        contentData.youtube_url = url;
        contentData.youtube_video_id = ytId || null;
        if (contentForm.duration_minutes) {
          contentData.duration_minutes = parseInt(contentForm.duration_minutes);
        }
      } else if (contentForm.content_type === 'document') {
        contentData.document_url = contentForm.document_url;
        contentData.document_type = contentForm.document_type || 'pdf';
      } else if (contentForm.content_type === 'article') {
        contentData.article_content = contentForm.article_content;
      }

      if (selectedContent) {
        // Update
        await contentsAPI.update(selectedContent.id, contentData);
        showToast('Lesson updated successfully', 'success');
        setIsEditContentOpen(false);
      } else {
        // Create
        await contentsAPI.create(selectedModule.id, contentData);
        showToast('Lesson added successfully', 'success');
        setIsAddContentOpen(false);
      }

      setSelectedContent(null);
      setContentForm({
        title: '',
        description: '',
        content_type: 'video',
        youtube_url: '',
        youtube_video_id: '',
        document_url: '',
        document_type: '',
        article_content: '',
        duration_minutes: '',
        is_preview: false
      });
      fetchCourseData();
    } catch (error) {
      console.error('Error saving content:', error);
      showToast(error.response?.data?.message || 'Failed to save lesson', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteContent = (content) => {
    setDeleteTarget({ type: 'content', item: content });
    setIsDeleteConfirmOpen(true);
  };

  // Move module up/down
  const handleMoveModule = async (module, direction) => {
    const currentIndex = modules.findIndex(m => m.id === module.id);
    if (
      (direction === 'up' && currentIndex === 0) ||
      (direction === 'down' && currentIndex === modules.length - 1)
    ) {
      return;
    }

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const otherModule = modules[newIndex];

    try {
      setSaving(true);
      await Promise.all([
        modulesAPI.update(module.id, { order_index: newIndex + 1 }),
        modulesAPI.update(otherModule.id, { order_index: currentIndex + 1 })
      ]);

      fetchCourseData();
    } catch (error) {
      console.error('Error reordering modules:', error);
      showToast('Failed to reorder modules', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Calculate course stats
  const getCourseStats = () => {
    const totalLessons = modules.reduce((acc, mod) => acc + (mod.contents?.length || 0), 0);
    const totalDuration = modules.reduce((acc, mod) => {
      return acc + (mod.contents?.reduce((sum, c) => sum + (c.duration_minutes || 0), 0) || 0);
    }, 0);

    const hours = Math.floor(totalDuration / 60);
    const minutes = totalDuration % 60;

    return {
      modules: modules.length,
      lessons: totalLessons,
      duration: hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
    };
  };

  const stats = getCourseStats();
  const completeness = modules.length > 0 && stats.lessons > 0 ?
    Math.min(100, (stats.lessons / (modules.length * 3)) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!course) {
    return (
      <Container className="py-8">
        <div className="text-center">
          <p className="text-gray-500">Course not found</p>
          <Button onClick={() => navigate('/admin/courses')} className="mt-4">
            Back to Courses
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="relative z-10 py-8">
          <Container>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  onClick={() => navigate('/admin/courses')}
                  className="text-white hover:bg-white/20"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <div>
                  <h1 className="text-3xl font-bold text-white">
                    {course.title}
                  </h1>
                  <p className="text-white/90 mt-1">Course Builder</p>
                </div>
              </div>
              <Button
                onClick={() => setIsPreviewOpen(true)}
                variant="ghost"
                className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
              >
                <Eye className="w-4 h-4 mr-2" />
                Preview
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="bg-white/20 backdrop-blur-sm rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-white font-medium">Course Progress</span>
                <span className="text-sm text-white">{Math.round(completeness)}% Complete</span>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div
                  className="bg-white h-2 rounded-full transition-all"
                  style={{ width: `${completeness}%` }}
                />
              </div>
              <div className="flex gap-6 mt-3 text-sm text-white">
                <span>{stats.modules} modules</span>
                <span>•</span>
                <span>{stats.lessons} lessons</span>
                <span>•</span>
                <span>{stats.duration} total</span>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Add Module Button */}
        <Button
          onClick={() => {
            setModuleForm({ title: '', description: '' });
            setIsAddModuleOpen(true);
          }}
          className="mb-6 w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Module
        </Button>

        {/* Modules List */}
        {modules.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No modules yet
            </h3>
            <p className="text-gray-500 dark:text-text-dark-secondary mb-6">
              Start building your course by adding your first module
            </p>
            <Button onClick={() => setIsAddModuleOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add First Module
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {modules.map((module, idx) => (
              <div
                key={module.id}
                className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden"
              >
                {/* Module Header */}
                <div className="p-4 bg-gray-50 dark:bg-dark-700 flex items-center gap-3">
                  <button
                    onClick={() => toggleModule(module.id)}
                    className="text-gray-500 hover:text-gray-700 dark:text-text-dark-secondary dark:hover:text-white"
                  >
                    {expandedModules.has(module.id) ? (
                      <ChevronDown className="w-5 h-5" />
                    ) : (
                      <ChevronRight className="w-5 h-5" />
                    )}
                  </button>

                  <BookOpen className="w-5 h-5 text-brand-blue" />

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        Module {idx + 1}: {module.title}
                      </h3>
                      {module.contents && module.contents.length > 0 && (
                        <Badge variant="default" size="sm">
                          {module.contents.length} {module.contents.length === 1 ? 'lesson' : 'lessons'}
                        </Badge>
                      )}
                    </div>
                    {module.description && (
                      <p className="text-sm text-gray-600 dark:text-text-dark-secondary mt-1">
                        {module.description}
                      </p>
                    )}
                  </div>

                  {/* Module Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveModule(module, 'up')}
                      disabled={idx === 0 || saving}
                      title="Move Up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleMoveModule(module, 'down')}
                      disabled={idx === modules.length - 1 || saving}
                      title="Move Down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedModule(module);
                        setModuleForm({
                          title: module.title,
                          description: module.description || ''
                        });
                        setIsEditModuleOpen(true);
                      }}
                      title="Edit Module"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteModule(module)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Delete Module"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Module Contents */}
                {expandedModules.has(module.id) && (
                  <div className="p-4">
                    {module.contents && module.contents.length > 0 ? (
                      <div className="space-y-2 mb-4">
                        {module.contents.map((content, contentIdx) => (
                          <div
                            key={content.id}
                            className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
                          >
                            <GripVertical className="w-4 h-4 text-gray-400" />

                            {content.content_type === 'video' && <Video className="w-4 h-4 text-blue-500" />}
                            {content.content_type === 'document' && <File className="w-4 h-4 text-green-500" />}
                            {content.content_type === 'article' && <FileText className="w-4 h-4 text-purple-500" />}

                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-gray-900 dark:text-white">
                                  {content.title}
                                </span>
                                {content.is_preview && (
                                  <Badge variant="success" size="sm">Preview</Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-text-dark-secondary mt-1">
                                <span className="capitalize">{content.content_type}</span>
                                {content.duration_minutes > 0 && (
                                  <>
                                    <span>•</span>
                                    <span>{content.duration_minutes} min</span>
                                  </>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditContent(module, content)}
                                title="Edit Lesson"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteContent(content)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                title="Delete Lesson"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500 dark:text-text-dark-secondary mb-4">
                        <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No lessons in this module yet</p>
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddContent(module.id)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Lesson
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Add Module Modal */}
      <Modal
        isOpen={isAddModuleOpen}
        onClose={() => setIsAddModuleOpen(false)}
        title="Add New Module"
      >
        <div className="space-y-4">
          <Input
            label="Module Title"
            value={moduleForm.title}
            onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
            placeholder="e.g., Introduction to Python"
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Description (Optional)
            </label>
            <textarea
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              rows="3"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
              placeholder="Brief description of what this module covers"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setIsAddModuleOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddModule} isLoading={saving}>
              <Plus className="w-4 h-4 mr-2" />
              Add Module
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Module Modal */}
      <Modal
        isOpen={isEditModuleOpen}
        onClose={() => {
          setIsEditModuleOpen(false);
          setSelectedModule(null);
        }}
        title="Edit Module"
      >
        <div className="space-y-4">
          <Input
            label="Module Title"
            value={moduleForm.title}
            onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
            required
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Description (Optional)
            </label>
            <textarea
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              rows="3"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditModuleOpen(false);
                setSelectedModule(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateModule} isLoading={saving}>
              <Save className="w-4 h-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Add/Edit Content Modal */}
      <Modal
        isOpen={isAddContentOpen || isEditContentOpen}
        onClose={() => {
          setIsAddContentOpen(false);
          setIsEditContentOpen(false);
          setSelectedContent(null);
        }}
        title={selectedContent ? 'Edit Lesson' : 'Add New Lesson'}
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Lesson Title"
            value={contentForm.title}
            onChange={(e) => setContentForm({ ...contentForm, title: e.target.value })}
            placeholder="e.g., Introduction to Variables"
            required
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Description (Optional)
            </label>
            <textarea
              value={contentForm.description}
              onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })}
              rows="2"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
              placeholder="Brief description of what this lesson covers"
            />
          </div>

          {/* Content Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Lesson Type
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['video', 'document', 'article'].map((type) => (
                <button
                  key={type}
                  onClick={() => setContentForm({ ...contentForm, content_type: type })}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all text-center',
                    contentForm.content_type === type
                      ? 'border-brand-blue bg-brand-blue/10'
                      : 'border-gray-200 dark:border-border-dark hover:border-brand-blue/50'
                  )}
                >
                  {type === 'video' && <Video className="w-6 h-6 mx-auto mb-1 text-gray-700 dark:text-white" />}
                  {type === 'document' && <File className="w-6 h-6 mx-auto mb-1 text-gray-700 dark:text-white" />}
                  {type === 'article' && <FileText className="w-6 h-6 mx-auto mb-1 text-gray-700 dark:text-white" />}
                  <span className="text-sm capitalize text-gray-700 dark:text-white">{type}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Video Fields */}
          {contentForm.content_type === 'video' && (
            <>
              <Input
                label="Video URL"
                value={contentForm.youtube_url}
                onChange={(e) => setContentForm({ ...contentForm, youtube_url: e.target.value })}
                placeholder="YouTube, Google Drive, or any video URL"
                required
              />
              <Input
                label="Duration (minutes)"
                type="number"
                value={contentForm.duration_minutes}
                onChange={(e) => setContentForm({ ...contentForm, duration_minutes: e.target.value })}
                placeholder="15"
              />
              {contentForm.youtube_url && (
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {/(?:youtube\.com|youtu\.be)/i.test(contentForm.youtube_url) && parseYouTubeUrl(contentForm.youtube_url)
                    ? '✓ YouTube video detected'
                    : /drive\.google\.com/i.test(contentForm.youtube_url)
                    ? '✓ Google Drive video detected'
                    : '✓ Video URL saved'}
                </div>
              )}
            </>
          )}

          {/* Document Fields */}
          {contentForm.content_type === 'document' && (
            <>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Upload Document *
              </label>
              <CloudinaryUpload
                acceptedTypes="document"
                maxSizeMB={10}
                currentFile={contentForm.document_url || null}
                uploadEndpoint="/api/upload/course-document"
                onUploadSuccess={(url) => {
                  const ext = url ? url.split('.').pop().split('?')[0].toLowerCase() : '';
                  setContentForm({ ...contentForm, document_url: url || '', document_type: ext });
                }}
                onUploadError={(err) => showToast(err, 'error')}
              />
            </>
          )}

          {/* Article Fields */}
          {contentForm.content_type === 'article' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Article Content
              </label>
              <textarea
                value={contentForm.article_content}
                onChange={(e) => setContentForm({ ...contentForm, article_content: e.target.value })}
                rows="10"
                className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none font-mono text-sm"
                placeholder="Write your article content here (supports HTML)"
                required
              />
            </div>
          )}

          {/* Preview Option */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={contentForm.is_preview}
              onChange={(e) => setContentForm({ ...contentForm, is_preview: e.target.checked })}
              className="rounded border-gray-300 dark:border-border-dark"
            />
            <span className="text-sm text-gray-700 dark:text-white">
              Mark as preview (students can view without enrolling)
            </span>
          </label>

          {/* Drip Scheduling */}
          <div className="border border-gray-200 dark:border-border-dark rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-gray-700 dark:text-white">Drip Scheduling (optional)</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">Set one of the below to control when enrolled students can access this lesson.</p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Unlock on specific date
                </label>
                <input
                  type="date"
                  value={contentForm.unlock_date || ''}
                  onChange={(e) => setContentForm({ ...contentForm, unlock_date: e.target.value || null, unlock_after_days: '' })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-border-dark rounded-lg text-sm dark:bg-dark-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Unlock after N days from enrollment
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 7"
                  value={contentForm.unlock_after_days || ''}
                  onChange={(e) => setContentForm({ ...contentForm, unlock_after_days: e.target.value || null, unlock_date: '' })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-border-dark rounded-lg text-sm dark:bg-dark-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-border-dark">
            <Button
              variant="outline"
              onClick={() => {
                setIsAddContentOpen(false);
                setIsEditContentOpen(false);
                setSelectedContent(null);
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveContent} isLoading={saving}>
              <Save className="w-4 h-4 mr-2" />
              {selectedContent ? 'Save Changes' : 'Add Lesson'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteConfirmOpen}
        onClose={() => {
          setIsDeleteConfirmOpen(false);
          setDeleteTarget(null);
        }}
        title="Confirm Delete"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Are you sure you want to delete this {deleteTarget?.type}? This action cannot be undone.
          {deleteTarget?.type === 'module' && ' All lessons in this module will also be deleted.'}
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setIsDeleteConfirmOpen(false);
              setDeleteTarget(null);
            }}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={confirmDelete}
            isLoading={saving}
          >
            Delete {deleteTarget?.type === 'module' ? 'Module' : 'Lesson'}
          </Button>
        </div>
      </Modal>

      {/* Preview Modal */}
      <Modal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        title="Course Preview"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-dark-700 p-4 rounded-lg">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {course.title}
            </h2>
            <p className="text-gray-600 dark:text-text-dark-secondary mb-4">
              {course.description}
            </p>
            <div className="flex gap-4 text-sm text-gray-600 dark:text-text-dark-secondary">
              <span>{stats.modules} modules</span>
              <span>•</span>
              <span>{stats.lessons} lessons</span>
              <span>•</span>
              <span>{stats.duration}</span>
            </div>
          </div>

          {modules.map((module, idx) => (
            <div key={module.id} className="border border-gray-200 dark:border-border-dark rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                Module {idx + 1}: {module.title}
              </h3>
              {module.contents && module.contents.length > 0 && (
                <div className="space-y-2">
                  {module.contents.map((content) => (
                    <div key={content.id} className="flex items-center gap-2 text-sm text-gray-600 dark:text-text-dark-secondary">
                      {content.content_type === 'video' && <Play className="w-4 h-4" />}
                      {content.content_type === 'document' && <File className="w-4 h-4" />}
                      {content.content_type === 'article' && <FileText className="w-4 h-4" />}
                      <span>{content.title}</span>
                      {content.duration_minutes > 0 && (
                        <span className="text-gray-400">({content.duration_minutes} min)</span>
                      )}
                      {content.is_preview && (
                        <Badge variant="success" size="sm">Free</Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}

          <div className="flex justify-end pt-4">
            <Button onClick={() => setIsPreviewOpen(false)}>
              Close Preview
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
