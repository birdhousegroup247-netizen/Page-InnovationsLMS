import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Megaphone,
  Plus,
  Edit,
  Trash2,
  Eye,
  Calendar,
  BookOpen,
  Users,
  AlertCircle,
  Pin,
  Star,
  Clock,
  Paperclip,
} from 'lucide-react';
import { announcementsAPI, coursesAPI } from '../../lib/api';
import { Container, EmptyState } from '../../components/layout';
import { Button, Spinner, Alert, Modal } from '../../components/ui';
import CloudinaryUpload from '../../components/common/CloudinaryUpload';
import ReactionsBar from '../../components/announcements/ReactionsBar';
import emptyAnnouncements from '../../assets/empty-announcements.svg';
import { cn } from '../../utils/cn';

export default function Announcements() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters — source chip (all/admin/mine) + per-course narrow.
  const [sourceFilter, setSourceFilter] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    course_id: '',
    scheduled_at: '', // empty = publish now
    is_important: false,
    is_pinned: false,
    attachment_url: '',
    attachment_type: '',
    attachment_name: '',
  });
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  // Delete confirmation
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // The new /feed endpoint returns the unified list (admin/platform
      // broadcasts + course announcements on every course I teach).
      // Courses are still loaded separately for the Create dropdown and
      // the per-course filter chips.
      const [coursesResponse, feedResponse] = await Promise.all([
        coursesAPI.getInstructorCourses(),
        announcementsAPI.getFeed(),
      ]);
      const coursesData = coursesResponse.data.data.courses || [];
      setCourses(coursesData);

      // Feed rows already carry source + author info from the backend.
      // No fan-out / merge needed on the client.
      const merged = feedResponse.data.data.announcements || [];
      setAnnouncements(merged);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  const blankForm = (courseId = '') => ({
    title: '',
    content: '',
    course_id: courseId,
    scheduled_at: '',
    is_important: false,
    is_pinned: false,
    attachment_url: '',
    attachment_type: '',
    attachment_name: '',
  });

  const handleOpenModal = (announcement = null) => {
    if (announcement) {
      setEditingAnnouncement(announcement);
      setFormData({
        title: announcement.title,
        content: announcement.message || announcement.content || '',
        course_id: announcement.course_id,
        scheduled_at: announcement.scheduled_at
          ? new Date(announcement.scheduled_at).toISOString().slice(0, 16)
          : '',
        is_important: !!announcement.is_important,
        is_pinned: !!announcement.is_pinned,
        attachment_url: announcement.attachment_url || '',
        attachment_type: announcement.attachment_type || '',
        attachment_name: announcement.attachment_name || '',
      });
    } else {
      setEditingAnnouncement(null);
      setFormData(blankForm(courses[0]?.id || ''));
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
    setFormData(blankForm());
    setFormErrors({});
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) errors.title = 'Title is required';
    if (!formData.content.trim()) errors.content = 'Content is required';
    if (!formData.course_id) errors.course_id = 'Please select a course';
    return errors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const errors = validateForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    try {
      setSubmitting(true);
      setError('');

      const payload = {
        title: formData.title,
        message: formData.content,
        scheduled_at: formData.scheduled_at || null,
        is_important: !!formData.is_important,
        is_pinned: !!formData.is_pinned,
        attachment_url:  formData.attachment_url  || null,
        attachment_type: formData.attachment_type || null,
        attachment_name: formData.attachment_name || null,
      };
      if (editingAnnouncement) {
        await announcementsAPI.update(editingAnnouncement.id, payload);
        setSuccess('Announcement updated successfully!');
      } else {
        await announcementsAPI.createAnnouncement(formData.course_id, payload);
        setSuccess('Announcement created successfully!');
      }

      handleCloseModal();
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error saving announcement:', err);
      setError(err.response?.data?.message || 'Failed to save announcement');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (announcementId) => {
    try {
      setError('');
      await announcementsAPI.delete(announcementId);
      setSuccess('Announcement deleted successfully!');
      setDeleteConfirm(null);
      fetchData();
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      console.error('Error deleting announcement:', err);
      setError(err.response?.data?.message || 'Failed to delete announcement');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Apply source + course filters to the merged feed.
  const filteredAnnouncements = announcements.filter((a) => {
    if (sourceFilter === 'admin' && a.source !== 'admin') return false;
    if (sourceFilter === 'mine' && a.source !== 'mine') return false;
    if (selectedCourse !== 'all' && selectedCourse) {
      if (String(a.course_id) !== String(selectedCourse)) return false;
    }
    return true;
  });

  const counts = {
    all: announcements.length,
    admin: announcements.filter((a) => a.source === 'admin').length,
    mine: announcements.filter((a) => a.source === 'mine').length,
  };

  const formatRelative = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    const ms = Date.now() - d.getTime();
    const min = Math.floor(ms / 60000);
    if (min < 1) return 'just now';
    if (min < 60) return `${min}m ago`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h}h ago`;
    const days = Math.floor(h / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <Megaphone className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                    Announcements
                  </h1>
                  <p className="text-lg text-white/90">
                    Create and manage course announcements
                  </p>
                </div>
              </div>

              <Button
                variant="outline"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={() => handleOpenModal()}
                className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20"
                disabled={courses.length === 0}
              >
                New Announcement
              </Button>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary">
              Loading announcements...
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* Success/Error Messages */}
            {success && (
              <div className="mb-6">
                <Alert variant="success" onClose={() => setSuccess('')}>
                  {success}
                </Alert>
              </div>
            )}

            {error && (
              <div className="mb-6">
                <Alert variant="danger" onClose={() => setError('')}>
                  {error}
                </Alert>
              </div>
            )}

            {/* Filter chips — Source on top, Course narrow underneath
                (only when the instructor teaches more than one course). */}
            <div className="bg-white dark:bg-dark-800 rounded-xl p-4 border border-gray-200 dark:border-border-dark mb-6 transition-colors space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'all',   label: 'All',                count: counts.all },
                  { id: 'admin', label: 'From Page Innovations',       count: counts.admin },
                  { id: 'mine',  label: 'My announcements',   count: counts.mine },
                ].map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSourceFilter(chip.id)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                      sourceFilter === chip.id
                        ? 'bg-brand-blue text-white border-brand-blue'
                        : 'bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-text-dark-secondary border-gray-200 dark:border-border-dark hover:border-brand-blue/40'
                    )}
                  >
                    {chip.label} <span className="opacity-70">· {chip.count}</span>
                  </button>
                ))}
              </div>
              {courses.length > 1 && (
                <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-border-dark">
                  <BookOpen className="w-4 h-4 text-gray-400 dark:text-text-dark-muted shrink-0" />
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                  >
                    <option value="all">Any course</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Announcements List */}
            {filteredAnnouncements.length === 0 ? (
              <EmptyState
                image={emptyAnnouncements}
                icon={<Megaphone className="w-16 h-16" />}
                title={
                  announcements.length === 0
                    ? (courses.length === 0 ? 'No courses yet' : 'No announcements yet')
                    : 'No announcements match this filter'
                }
                description={
                  announcements.length === 0
                    ? (courses.length === 0
                        ? 'Create a course first before making announcements.'
                        : 'Start engaging with your students by creating your first announcement.')
                    : 'Try switching the chip above or pick a different course.'
                }
                action={
                  courses.length > 0 && announcements.length === 0 && (
                    <Button
                      onClick={() => handleOpenModal()}
                      leftIcon={<Plus className="w-4 h-4" />}
                    >
                      Create Announcement
                    </Button>
                  )
                }
              />
            ) : (
              <div className="flex flex-col gap-4">
                {filteredAnnouncements.map((a) => {
                  const isAdminSrc = a.source === 'admin';
                  const sourceBg =
                    isAdminSrc
                      ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200/60 dark:border-purple-800/60 text-purple-700 dark:text-purple-400'
                      : a.source === 'mine'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200/60 dark:border-green-800/60 text-green-700 dark:text-green-400'
                      : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-400';
                  const sourceLabel = isAdminSrc ? 'Page Innovations' : (a.source === 'mine' ? 'You posted this' : 'Course');
                  const body = a.message || a.content || '';
                  return (
                    <div
                      key={`${a.source}-${a.id}`}
                      className="group relative bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-5 transition-all hover:border-brand-blue/40 hover:shadow-md"
                    >
                      {/* Top row: source pill + status pills + actions */}
                      <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border ${sourceBg}`}>
                            <Megaphone className="w-3 h-3" />
                            {sourceLabel}
                          </span>
                          {a.is_pinned && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border bg-purple-50 dark:bg-purple-900/20 border-purple-200/60 dark:border-purple-800/60 text-purple-700 dark:text-purple-400">
                              <Pin className="w-2.5 h-2.5" />
                              Pinned
                            </span>
                          )}
                          {a.is_important && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/60 text-amber-700 dark:text-amber-400">
                              <Star className="w-2.5 h-2.5" />
                              Important
                            </span>
                          )}
                          {a.scheduled_at && new Date(a.scheduled_at).getTime() > Date.now() && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium border bg-blue-50 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-400">
                              <Clock className="w-2.5 h-2.5" />
                              Scheduled
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-gray-500 dark:text-text-dark-muted">
                            {formatRelative(a.scheduled_at || a.created_at)}
                          </span>
                          {a.can_edit && (
                            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                aria-label="Edit announcement"
                                onClick={() => handleOpenModal(a)}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                aria-label="Delete announcement"
                                onClick={() => setDeleteConfirm(a)}
                                className="p-1.5 rounded-lg text-gray-500 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white line-clamp-2 leading-snug mb-2">
                        {a.title}
                      </h3>

                      {/* Body — clamp generously since we now have room */}
                      <p className="text-sm text-gray-700 dark:text-text-dark-secondary whitespace-pre-wrap leading-relaxed mb-4">
                        {body}
                      </p>

                      {/* Attachment chip */}
                      {a.attachment_url && (
                        <a
                          href={a.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 px-3 py-1.5 mb-4 rounded-lg border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-dark-700 text-xs text-gray-700 dark:text-text-dark-secondary hover:border-brand-blue/40 transition-colors max-w-full"
                        >
                          <Paperclip className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                          <span className="truncate">{a.attachment_name || 'Attachment'}</span>
                        </a>
                      )}

                      {/* Footer row: author + course + view count on the left,
                          quiet reactions bar on the right. Single horizontal
                          line separates the body from the meta strip so the
                          card reads like a message, not a stack of widgets. */}
                      <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-border-dark">
                        <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-text-dark-muted min-w-0 flex-1">
                          {a.author_avatar ? (
                            <img src={a.author_avatar} alt={a.author_name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                              {(a.author_name || '?').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <span className="truncate">{a.author_name}</span>
                          {a.course?.title && (
                            <span className="hidden sm:inline-flex items-center gap-1 ml-2 pl-2 border-l border-gray-200 dark:border-border-dark">
                              <BookOpen className="w-3 h-3" />
                              <span className="truncate max-w-[10rem]">{a.course.title}</span>
                            </span>
                          )}
                          {typeof a.view_count === 'number' && (
                            <span className="hidden sm:inline-flex items-center gap-1 ml-2">
                              <Eye className="w-3 h-3" />
                              {a.view_count}
                            </span>
                          )}
                        </div>
                        <ReactionsBar
                          source={a.source === 'admin' ? 'admin' : 'course'}
                          announcementId={a.id}
                          initialTally={a.reactions || {}}
                          initialMine={a.my_reactions || []}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </Container>

      {/* Create/Edit Modal */}
      {showModal && (
        <Modal
          isOpen={showModal}
          onClose={handleCloseModal}
          title={editingAnnouncement ? 'Edit Announcement' : 'Create Announcement'}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Course Selection (only for new announcements) */}
            {!editingAnnouncement && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">
                  Course *
                </label>
                <select
                  value={formData.course_id}
                  onChange={(e) => {
                    setFormData({ ...formData, course_id: e.target.value });
                    setFormErrors({ ...formErrors, course_id: '' });
                  }}
                  className={cn(
                    'w-full px-4 py-2 border rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors',
                    formErrors.course_id ? 'border-red-500' : 'border-gray-300 dark:border-border-dark'
                  )}
                >
                  <option value="">Select a course</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.title}
                    </option>
                  ))}
                </select>
                {formErrors.course_id && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">{formErrors.course_id}</p>
                )}
              </div>
            )}

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">
                Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => {
                  setFormData({ ...formData, title: e.target.value });
                  setFormErrors({ ...formErrors, title: '' });
                }}
                className={cn(
                  'w-full px-4 py-2 border rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors',
                  formErrors.title ? 'border-red-500' : 'border-gray-300 dark:border-border-dark'
                )}
                placeholder="Enter announcement title"
              />
              {formErrors.title && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{formErrors.title}</p>
              )}
            </div>

            {/* Content */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">
                Content *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => {
                  setFormData({ ...formData, content: e.target.value });
                  setFormErrors({ ...formErrors, content: '' });
                }}
                rows={6}
                className={cn(
                  'w-full px-4 py-2 border rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors resize-none',
                  formErrors.content ? 'border-red-500' : 'border-gray-300 dark:border-border-dark'
                )}
                placeholder="Write your announcement message..."
              />
              {formErrors.content && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{formErrors.content}</p>
              )}
            </div>

            {/* Publish at (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">
                Publish at <span className="text-gray-400 dark:text-text-dark-muted text-xs font-normal">(optional)</span>
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-full px-4 py-2 border rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border-gray-300 dark:border-border-dark focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
              />
              <p className="text-xs text-gray-500 dark:text-text-dark-muted mt-1">
                Leave empty to publish immediately. Future dates hide the announcement from students until then and the notification fires at the scheduled time.
              </p>
            </div>

            {/* Important / Pinned toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-border-dark cursor-pointer hover:border-brand-blue/40 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_important}
                  onChange={(e) => setFormData({ ...formData, is_important: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-brand-blue rounded"
                />
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500" />
                    Mark as important
                  </p>
                  <p className="text-xs text-gray-500 dark:text-text-dark-muted">Adds a highlighted badge so students notice it.</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-border-dark cursor-pointer hover:border-brand-blue/40 transition-colors">
                <input
                  type="checkbox"
                  checked={formData.is_pinned}
                  onChange={(e) => setFormData({ ...formData, is_pinned: e.target.checked })}
                  className="mt-0.5 w-4 h-4 text-brand-blue rounded"
                />
                <div className="text-sm">
                  <p className="font-medium text-gray-900 dark:text-white flex items-center gap-1.5">
                    <Pin className="w-3.5 h-3.5 text-brand-purple" />
                    Pin to top
                  </p>
                  <p className="text-xs text-gray-500 dark:text-text-dark-muted">Stays at the top of the feed regardless of date.</p>
                </div>
              </label>
            </div>

            {/* Attachment (image or doc) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">
                Attachment <span className="text-gray-400 dark:text-text-dark-muted text-xs font-normal">(optional — image or document)</span>
              </label>
              {formData.attachment_url ? (
                <div className="flex items-center justify-between gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-border-dark">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="w-4 h-4 text-brand-blue shrink-0" />
                    <span className="text-sm text-gray-800 dark:text-text-dark-primary truncate">
                      {formData.attachment_name || formData.attachment_url}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFormData((p) => ({ ...p, attachment_url: '', attachment_type: '', attachment_name: '' }))}
                    className="text-xs text-red-600 hover:underline shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <CloudinaryUpload
                  onUploadSuccess={(url, meta) => {
                    if (!url) return;
                    setFormData((p) => ({
                      ...p,
                      attachment_url: url,
                      attachment_type: meta?.type || (url.match(/\.(png|jpe?g|gif|webp|svg)$/i) ? 'image' : 'document'),
                      attachment_name: meta?.name || url.split('/').pop(),
                    }));
                  }}
                  onUploadError={(err) => setError(err || 'Upload failed')}
                  acceptedTypes="any"
                  maxSizeMB={10}
                  currentFile={null}
                  uploadEndpoint="/api/upload/announcement-attachment"
                  folder="pageinnovationlms/announcements"
                />
              )}
            </div>

            {/* Recipients note */}
            <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                This announcement will be sent to every student currently enrolled in the selected course only.
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving...' : editingAnnouncement ? 'Update' : 'Create'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <Modal
          isOpen={!!deleteConfirm}
          onClose={() => setDeleteConfirm(null)}
          title="Delete Announcement"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-900 dark:text-red-400 font-medium mb-1">
                  Are you sure you want to delete this announcement?
                </p>
                <p className="text-sm text-red-700 dark:text-red-500">
                  This action cannot be undone. The announcement will be permanently removed.
                </p>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
              <p className="font-medium text-gray-900 dark:text-text-dark-primary mb-1">
                {deleteConfirm.title}
              </p>
              <p className="text-sm text-gray-600 dark:text-text-dark-muted line-clamp-2">
                {deleteConfirm.content}
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(null)}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(deleteConfirm.id)}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete Announcement
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
