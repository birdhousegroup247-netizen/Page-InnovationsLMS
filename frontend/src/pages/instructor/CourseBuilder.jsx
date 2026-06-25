import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { coursesAPI, modulesAPI, contentsAPI } from '../../lib/api';
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
  Play,
  Radio,
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
  // Read-only "watch what students see" preview drawer.
  const [previewContent, setPreviewContent] = useState(null);
  // Drag-and-drop state for lesson reordering. Tracks the row being
  // dragged so we know what to move on drop.
  const [dragLesson, setDragLesson] = useState(null);

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
    recording_url: '',
    duration_minutes: '',
    is_preview: false
  });

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      const [courseRes, modulesRes] = await Promise.all([
        coursesAPI.getById(courseId),
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
      recording_url: '',
      duration_minutes: '',
      is_preview: false
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
      recording_url: content.recording_url || '',
      duration_minutes: content.duration_minutes || '',
      is_preview: content.is_preview || false
    });
    setIsEditContentOpen(true);
  };

  const handleSaveContent = async () => {
    if (!contentForm.title.trim()) {
      showToast('Lesson title is required', 'error');
      return;
    }

    // Validate based on content type
    if (contentForm.content_type === 'video' && !contentForm.youtube_url.trim()) {
      showToast('Video URL is required for video lessons', 'error');
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

    if (contentForm.content_type === 'recorded_class' && !contentForm.recording_url.trim()) {
      showToast('Recording link is required for recorded classes', 'error');
      return;
    }

    try {
      setSaving(true);

      const contentData = {
        title: contentForm.title,
        description: contentForm.description,
        content_type: contentForm.content_type,
        is_preview: contentForm.is_preview,
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
      } else if (contentForm.content_type === 'recorded_class') {
        contentData.recording_url = contentForm.recording_url.trim();
        if (contentForm.duration_minutes) {
          contentData.duration_minutes = parseInt(contentForm.duration_minutes);
        }
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
        recording_url: '',
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

  /**
   * Extract a YouTube video id from any URL format we might see.
   * Handles:
   *   • youtube.com/watch?v=ID  / &v=ID
   *   • youtu.be/ID
   *   • youtube.com/embed/ID
   *   • youtube.com/shorts/ID
   *   • Google search URLs with `vid:ID` (the page that links to YouTube)
   *   • A bare 11-char video id
   * Returns null if nothing matches.
   */
  const extractYouTubeId = (urlOrId) => {
    if (!urlOrId) return null;
    const s = String(urlOrId).trim();
    if (/^[\w-]{11}$/.test(s)) return s;
    const m = s.match(
      /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/|[?&]v=|vid:)([\w-]{11})/
    );
    return m ? m[1] : null;
  };

  /**
   * Lesson drag-and-drop reorder. Native HTML5 DnD — no external lib.
   * On drop, recompute order_indexes for the whole module and POST a
   * single batch reorder call.
   */
  const handleLessonDrop = async (moduleId, droppedOnContentId) => {
    if (!dragLesson || dragLesson.module_id !== moduleId) {
      setDragLesson(null);
      return;
    }
    if (dragLesson.id === droppedOnContentId) {
      setDragLesson(null);
      return;
    }
    const module = modules.find((m) => m.id === moduleId);
    if (!module?.contents) return;

    const fromIdx = module.contents.findIndex((c) => c.id === dragLesson.id);
    const toIdx = module.contents.findIndex((c) => c.id === droppedOnContentId);
    if (fromIdx === -1 || toIdx === -1) return;

    const next = [...module.contents];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);

    // Optimistic UI update first.
    const optimistic = next.map((c, i) => ({ ...c, order_index: i + 1 }));
    setModules((prev) =>
      prev.map((m) => (m.id === moduleId ? { ...m, contents: optimistic } : m))
    );
    setDragLesson(null);

    try {
      await contentsAPI.reorder(
        moduleId,
        optimistic.map((c) => ({ id: c.id, order_index: c.order_index }))
      );
    } catch (error) {
      console.error('Reorder failed:', error);
      showToast('Failed to reorder lessons', 'error');
      fetchCourseData(); // re-sync on failure
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
          <Button onClick={() => navigate('/instructor/courses')} className="mt-4">
            Back to Dashboard
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
                  onClick={() => navigate('/instructor/courses')}
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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-2">
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
                    className="text-gray-500 hover:text-gray-700 dark:text-text-dark-secondary dark:hover:text-text-dark-primary"
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
                      <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary">
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
                        {module.contents.map((content) => {
                          const isDragging = dragLesson?.id === content.id;
                          return (
                            <div
                              key={content.id}
                              draggable
                              onDragStart={() => setDragLesson({ id: content.id, module_id: module.id })}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                e.preventDefault();
                                handleLessonDrop(module.id, content.id);
                              }}
                              onDragEnd={() => setDragLesson(null)}
                              onClick={(e) => {
                                // Don't open preview when clicking action buttons inside the row.
                                if (e.target.closest('button')) return;
                                setPreviewContent(content);
                              }}
                              role="button"
                              tabIndex={0}
                              className={cn(
                                'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all',
                                'bg-gray-50 dark:bg-dark-700 hover:bg-brand-blue/5 dark:hover:bg-brand-blue/10',
                                'hover:border-brand-blue/30 border border-transparent',
                                isDragging && 'opacity-40'
                              )}
                            >
                              <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />

                              {content.content_type === 'video' && <Video className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                              {content.content_type === 'document' && <File className="w-4 h-4 text-green-500 flex-shrink-0" />}
                              {content.content_type === 'article' && <FileText className="w-4 h-4 text-purple-500 flex-shrink-0" />}
                              {content.content_type === 'recorded_class' && <Radio className="w-4 h-4 text-red-500 flex-shrink-0" />}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-text-dark-primary truncate">
                                    {content.title}
                                  </span>
                                  {content.is_preview && <Badge variant="success" size="sm">Preview</Badge>}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-text-dark-secondary mt-1">
                                  <span className="capitalize">{content.content_type}</span>
                                  {content.duration_minutes > 0 && (
                                    <>
                                      <span>•</span>
                                      <span>{content.duration_minutes} min</span>
                                    </>
                                  )}
                                  <span>•</span>
                                  <span className="text-brand-blue dark:text-cyan-400 font-medium">Click to preview</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleEditContent(module, content); }}
                                  title="Edit lesson"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => { e.stopPropagation(); handleDeleteContent(content); }}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  title="Delete lesson"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          );
                        })}
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
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
              Description (Optional)
            </label>
            <textarea
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              rows="3"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
              Description (Optional)
            </label>
            <textarea
              value={moduleForm.description}
              onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
              rows="3"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
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
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
              Description (Optional)
            </label>
            <textarea
              value={contentForm.description}
              onChange={(e) => setContentForm({ ...contentForm, description: e.target.value })}
              rows="2"
              className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
              placeholder="Brief description of what this lesson covers"
            />
          </div>

          {/* Content Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
              Lesson Type
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { id: 'video',           label: 'Video',          icon: Video },
                { id: 'document',        label: 'Document',       icon: File },
                { id: 'article',         label: 'Article',        icon: FileText },
                { id: 'recorded_class',  label: 'Recorded Class', icon: Radio },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setContentForm({ ...contentForm, content_type: id })}
                  className={cn(
                    'p-3 rounded-lg border-2 transition-all text-center',
                    contentForm.content_type === id
                      ? 'border-brand-blue bg-brand-blue/10'
                      : 'border-gray-200 dark:border-border-dark hover:border-brand-blue/50'
                  )}
                >
                  <Icon className="w-6 h-6 mx-auto mb-1 text-gray-700 dark:text-white" />
                  <span className="text-sm text-gray-700 dark:text-white">{label}</span>
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
                <div className="text-sm text-gray-500 dark:text-text-dark-muted">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2 transition-colors">
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
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
                Article Content
              </label>
              <textarea
                value={contentForm.article_content}
                onChange={(e) => setContentForm({ ...contentForm, article_content: e.target.value })}
                rows="10"
                className="w-full px-4 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none font-mono text-sm"
                placeholder="Write your article content here (supports HTML)"
                required
              />
            </div>
          )}

          {/* Recorded Class Fields — instructor pastes a Drive /
              YouTube / Vimeo / Loom / direct mp4 link. Players are
              detected on the student side. Friendly hint about Drive
              sharing is shown so the no-download embed actually
              behaves. */}
          {contentForm.content_type === 'recorded_class' && (
            <>
              <Input
                label="Recording link"
                value={contentForm.recording_url}
                onChange={(e) => setContentForm({ ...contentForm, recording_url: e.target.value })}
                placeholder="Paste Drive, YouTube, Vimeo, Loom or direct video URL"
                required
              />
              <Input
                label="Duration (minutes)"
                type="number"
                value={contentForm.duration_minutes}
                onChange={(e) => setContentForm({ ...contentForm, duration_minutes: e.target.value })}
                placeholder="60"
              />
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/50 text-xs text-amber-800 dark:text-amber-300">
                <p className="font-medium mb-1">If you're using Google Drive:</p>
                <ul className="list-disc pl-5 space-y-0.5">
                  <li>Set sharing to <strong>Anyone with the link → Viewer</strong>.</li>
                  <li>In Drive share settings, enable <strong>"Disable options to download, print, and copy for commenters and viewers"</strong>.</li>
                </ul>
                <p className="mt-2">Students will watch the recording inside the app. Download buttons are removed where the provider supports it.</p>
              </div>
            </>
          )}

          {/* Preview Option */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={contentForm.is_preview}
              onChange={(e) => setContentForm({ ...contentForm, is_preview: e.target.checked })}
              className="rounded border-gray-300 dark:border-border-dark"
            />
            <span className="text-sm text-gray-700 dark:text-text-dark-primary">
              Mark as preview (students can view without enrolling)
            </span>
          </label>

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
            <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-2">
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
              <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-2">
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

      {/* Lesson Preview — opened by clicking a lesson row */}
      <Modal
        isOpen={!!previewContent}
        onClose={() => setPreviewContent(null)}
        title={previewContent?.title || 'Lesson preview'}
        size="lg"
      >
        {previewContent && (
          <div className="space-y-4">
            {previewContent.description && (
              <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
                {previewContent.description}
              </p>
            )}

            {previewContent.content_type === 'video' && (() => {
              // Resolve the video id from any URL the instructor may have
              // saved — including Google search pages with vid:ID.
              const videoId = extractYouTubeId(
                previewContent.youtube_video_id || previewContent.youtube_url
              );
              if (videoId) {
                return (
                  <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${videoId}`}
                      title={previewContent.title}
                      className="absolute inset-0 w-full h-full rounded-lg"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                );
              }
              return (
                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg space-y-2">
                  <p className="text-sm text-amber-800 dark:text-amber-300">
                    This lesson doesn't have a valid YouTube link. Paste a watch URL
                    (e.g. https://www.youtube.com/watch?v=…) or a youtu.be link.
                  </p>
                  {previewContent.youtube_url && (
                    <a href={previewContent.youtube_url} target="_blank" rel="noreferrer"
                      className="text-sm text-brand-blue underline break-all">
                      Open current URL in new tab
                    </a>
                  )}
                </div>
              );
            })()}

            {previewContent.content_type === 'document' && (() => {
              const url = previewContent.document_url;
              if (!url) {
                return <p className="text-sm text-gray-500">No document uploaded for this lesson.</p>;
              }
              const isPdf = url.toLowerCase().split('?')[0].endsWith('.pdf');
              // Cloudinary raw PDFs on free plans return HTTP 401 — the
              // backend upload pipeline now stores PDFs via resource_type
              // 'image' so this works for fresh uploads. For older URLs
              // we fall through to the Google Docs Viewer which can also
              // render most public documents in an iframe.
              const viewerSrc = isPdf
                ? url
                : `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
              return (
                <div className="space-y-2">
                  <iframe
                    src={viewerSrc}
                    title={previewContent.title}
                    className="w-full h-[60vh] rounded-lg border border-gray-200 dark:border-border-dark bg-white"
                  />
                  <div className="flex items-center justify-between text-xs">
                    <a href={url} target="_blank" rel="noreferrer"
                      className="text-brand-blue underline">
                      Open document in new tab
                    </a>
                    <span className="text-gray-500">
                      If the preview is blank, the file may need to be re-uploaded.
                    </span>
                  </div>
                </div>
              );
            })()}

            {previewContent.content_type === 'article' && (
              previewContent.article_content ? (
                <div
                  className="prose prose-sm dark:prose-invert max-w-none p-4 bg-gray-50 dark:bg-dark-700 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: previewContent.article_content }}
                />
              ) : (
                <p className="text-sm text-gray-500">No article content set for this lesson.</p>
              )
            )}

            <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-border-dark">
              <span className="text-xs text-gray-500 dark:text-text-dark-secondary capitalize">
                {previewContent.content_type}
                {previewContent.duration_minutes > 0 && ` · ${previewContent.duration_minutes} min`}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const mod = modules.find((m) => m.contents?.some((c) => c.id === previewContent.id));
                    setPreviewContent(null);
                    if (mod) handleEditContent(mod, previewContent);
                  }}
                >
                  Edit lesson
                </Button>
                <Button size="sm" onClick={() => setPreviewContent(null)}>Close</Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
