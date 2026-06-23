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
} from 'lucide-react';
import { announcementsAPI, coursesAPI } from '../../lib/api';
import { Container, EmptyState } from '../../components/layout';
import { Button, Spinner, Alert, Modal } from '../../components/ui';
import emptyAnnouncements from '../../assets/empty-announcements.svg';
import { cn } from '../../utils/cn';

export default function Announcements() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Filters
  const [selectedCourse, setSelectedCourse] = useState('all');

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    course_id: '',
    scheduled_at: '', // empty = publish now
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

      // Fetch instructor's courses
      const coursesResponse = await coursesAPI.getInstructorCourses();
      const coursesData = coursesResponse.data.data.courses || [];
      setCourses(coursesData);

      // Fetch announcements for all courses
      const announcementPromises = coursesData.map((course) =>
        announcementsAPI.getCourseAnnouncements(course.id).catch(() => ({ data: { data: { announcements: [] } } }))
      );
      const announcementResponses = await Promise.all(announcementPromises);

      // Combine and enrich announcements with course info
      const allAnnouncements = [];
      announcementResponses.forEach((response, idx) => {
        const courseAnnouncements = response.data.data.announcements || [];
        courseAnnouncements.forEach((announcement) => {
          allAnnouncements.push({
            ...announcement,
            course: coursesData[idx],
          });
        });
      });

      // Sort by created date (newest first)
      allAnnouncements.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      setAnnouncements(allAnnouncements);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

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
      });
    } else {
      setEditingAnnouncement(null);
      setFormData({
        title: '',
        content: '',
        course_id: courses[0]?.id || '',
        scheduled_at: '',
      });
    }
    setFormErrors({});
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingAnnouncement(null);
    setFormData({ title: '', content: '', course_id: '', scheduled_at: '' });
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

      if (editingAnnouncement) {
        await announcementsAPI.update(editingAnnouncement.id, {
          title: formData.title,
          message: formData.content,
          scheduled_at: formData.scheduled_at || null,
        });
        setSuccess('Announcement updated successfully!');
      } else {
        await announcementsAPI.createAnnouncement(formData.course_id, {
          title: formData.title,
          message: formData.content,
          scheduled_at: formData.scheduled_at || null,
        });
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

  // Filter announcements by selected course
  const filteredAnnouncements = selectedCourse === 'all' || !selectedCourse
    ? announcements
    : announcements.filter((a) => a.course_id === parseInt(selectedCourse, 10));

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

            {/* Filter */}
            {courses.length > 1 && (
              <div className="bg-white dark:bg-dark-800 rounded-xl p-4 border border-gray-200 dark:border-border-dark mb-6 transition-colors">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-gray-400 dark:text-text-dark-muted" />
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                  >
                    <option value="all">All Courses</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Announcements List */}
            {filteredAnnouncements.length === 0 ? (
              <EmptyState
                image={emptyAnnouncements}
                icon={<Megaphone className="w-16 h-16" />}
                title={courses.length === 0 ? 'No courses yet' : 'No announcements yet'}
                description={
                  courses.length === 0
                    ? 'Create a course first before making announcements.'
                    : 'Start engaging with your students by creating your first announcement.'
                }
                action={
                  courses.length > 0 && (
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
              <div className="space-y-4">
                {filteredAnnouncements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-text-dark-primary">
                            {announcement.title}
                          </h3>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-text-dark-muted mb-3">
                          <span className="flex items-center gap-1">
                            <BookOpen className="w-4 h-4" />
                            {announcement.course?.title || 'Unknown Course'}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {/* Prefer scheduled_at when set (the publish date
                                the instructor chose), otherwise show the
                                creation timestamp. Accept both snake and camel
                                casing because the backend Sequelize config
                                doesn't pin which one it serialises with. */}
                            {formatDate(
                              announcement.scheduled_at
                              || announcement.scheduledAt
                              || announcement.created_at
                              || announcement.createdAt
                            )}
                          </span>
                          {announcement.view_count !== undefined && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {announcement.view_count} view{announcement.view_count !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-700 dark:text-text-dark-secondary whitespace-pre-wrap">
                          {announcement.message || announcement.content}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit className="w-4 h-4" />}
                          onClick={() => handleOpenModal(announcement)}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Trash2 className="w-4 h-4" />}
                          onClick={() => setDeleteConfirm(announcement)}
                          className="text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
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
                Leave empty to publish immediately. Future dates hide the announcement from students until then.
              </p>
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
