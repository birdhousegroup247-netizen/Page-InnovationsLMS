import { useState, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';
import { adminAnnouncementsAPI, adminCoursesAPI } from '../../lib/api';
import {
  Megaphone,
  Send,
  Users,
  BookOpen,
  GraduationCap,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { Container } from '../../components/layout';
import { Button, Input, Select, Badge, Spinner, Modal } from '../../components/ui';

const TARGET_OPTIONS = [
  { value: 'all_users', label: 'All Users', icon: Globe, description: 'Every active user on the platform' },
  { value: 'all_students', label: 'All Students', icon: GraduationCap, description: 'Every user with student role' },
  { value: 'all_instructors', label: 'All Instructors', icon: Users, description: 'All instructors and admins' },
  { value: 'course', label: 'Specific Course', icon: BookOpen, description: 'All students enrolled in a course' },
];

export default function Announcements() {
  const { showToast } = useToast();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);

  const [form, setForm] = useState({
    title: '',
    message: '',
    target: 'all_students',
    course_id: '',
    link: '',
  });
  const [recipientCount, setRecipientCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchCourses();
  }, []);

  // Update recipient count whenever target or course_id changes
  useEffect(() => {
    if (!form.target) return;
    if (form.target === 'course' && !form.course_id) {
      setRecipientCount(null);
      return;
    }
    const timer = setTimeout(() => fetchRecipientCount(), 300);
    return () => clearTimeout(timer);
  }, [form.target, form.course_id]);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const response = await adminAnnouncementsAPI.getAll();
      setAnnouncements(response.data.data.announcements || []);
    } catch (error) {
      showToast('Failed to load announcement history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await adminCoursesAPI.getAll({ status: 'published', limit: 500 });
      setCourses(response.data.data?.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchRecipientCount = async () => {
    try {
      setCountLoading(true);
      const response = await adminAnnouncementsAPI.getRecipientCount(
        form.target,
        form.target === 'course' ? form.course_id : undefined
      );
      setRecipientCount(response.data.data.count);
    } catch (error) {
      setRecipientCount(null);
    } finally {
      setCountLoading(false);
    }
  };

  const handleSend = async () => {
    if (!form.title.trim() || !form.message.trim()) {
      showToast('Title and message are required', 'error');
      return;
    }
    if (form.target === 'course' && !form.course_id) {
      showToast('Select a course', 'error');
      return;
    }
    setConfirmOpen(true);
  };

  const confirmSend = async () => {
    try {
      setSendLoading(true);
      const response = await adminAnnouncementsAPI.send(form);
      const msg = response.data.message || 'Announcement sent';
      showToast(msg, 'success');
      setForm({ title: '', message: '', target: 'all_students', course_id: '', link: '' });
      setConfirmOpen(false);
      setRecipientCount(null);
      fetchAnnouncements();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to send announcement', 'error');
    } finally {
      setSendLoading(false);
    }
  };

  const targetLabel = (t) => TARGET_OPTIONS.find(o => o.value === t)?.label || t;

  const targetBadgeVariant = (t) => {
    const map = { all_users: 'default', all_students: 'info', all_instructors: 'warning', course: 'success' };
    return map[t] || 'default';
  };

  return (
    <>
      <Container>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Announcements</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Send platform-wide messages to users — they appear in the notification bell
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Compose Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-5 sticky top-4">
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Megaphone className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">Compose Announcement</h2>
              </div>

              <div className="space-y-4">
                <Input
                  label="Title"
                  value={form.title}
                  onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. System Maintenance Tonight"
                  maxLength={100}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                    placeholder="Write your announcement here..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audience</label>
                  <div className="space-y-2">
                    {TARGET_OPTIONS.map(({ value, label, icon: Icon, description }) => (
                      <label
                        key={value}
                        className={`flex items-start gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          form.target === value
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                      >
                        <input
                          type="radio"
                          name="target"
                          value={value}
                          checked={form.target === value}
                          onChange={() => setForm(prev => ({ ...prev, target: value, course_id: '' }))}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Icon className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{label}</span>
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {form.target === 'course' && (
                  <Select
                    label="Select Course"
                    value={form.course_id}
                    onChange={(e) => setForm(prev => ({ ...prev, course_id: e.target.value }))}
                    options={[
                      { value: '', label: 'Choose a course...' },
                      ...courses.map(c => ({ value: c.id, label: c.title }))
                    ]}
                  />
                )}

                <Input
                  label="Link (optional)"
                  value={form.link}
                  onChange={(e) => setForm(prev => ({ ...prev, link: e.target.value }))}
                  placeholder="/courses or https://..."
                />

                {/* Recipient preview */}
                <div className={`p-3 rounded-lg text-sm ${recipientCount !== null ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' : 'bg-gray-50 dark:bg-dark-700 text-gray-500'}`}>
                  {countLoading ? (
                    <span className="flex items-center gap-2"><Spinner size="sm" /> Counting recipients...</span>
                  ) : recipientCount !== null ? (
                    <span>This will be sent to <strong>{recipientCount}</strong> user{recipientCount !== 1 ? 's' : ''}</span>
                  ) : (
                    <span>Select an audience to see recipient count</span>
                  )}
                </div>

                <Button onClick={handleSend} className="w-full" disabled={!form.title || !form.message}>
                  <Send className="w-4 h-4 mr-2" />
                  Send Announcement
                </Button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-border-dark">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Announcement History</h2>
                <Button variant="ghost" size="sm" onClick={fetchAnnouncements}>
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {loading ? (
                <div className="p-10 flex justify-center"><Spinner /></div>
              ) : announcements.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>No announcements sent yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-border-dark">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{ann.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{ann.message}</p>
                        </div>
                        <Badge variant={targetBadgeVariant(ann.target)}>
                          {targetLabel(ann.target)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-gray-400">
                        <span>{ann.recipient_count} recipients</span>
                        <span>by {ann.admin?.full_name || 'Admin'}</span>
                        <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                        {ann.course && <span className="text-blue-500">→ {ann.course.title}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>

      {/* Confirm Send Modal */}
      <Modal isOpen={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Announcement" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            You are about to send <strong>"{form.title}"</strong> to{' '}
            <strong>{recipientCount ?? '?'} users</strong> ({targetLabel(form.target)}).
            This will appear in their notification bell immediately.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={sendLoading}>Cancel</Button>
            <Button onClick={confirmSend} isLoading={sendLoading}>
              <Send className="w-4 h-4 mr-2" />
              Send Now
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
