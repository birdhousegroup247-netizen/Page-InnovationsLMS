import { useState, useEffect, useRef } from 'react';
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
  Paperclip,
  X,
  FileText,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';
import { Container, PageHeader } from '../../components/layout';
import { Button, Input, Select, Badge, Spinner, Modal } from '../../components/ui';

const TARGET_OPTIONS = [
  { value: 'all_users', label: 'All Users', icon: Globe, description: 'Every active user on the platform' },
  { value: 'all_students', label: 'All Students', icon: GraduationCap, description: 'Every user with student role' },
  { value: 'all_instructors', label: 'All Instructors', icon: Users, description: 'All instructors and admins' },
  { value: 'course', label: 'Specific Course', icon: BookOpen, description: 'All students enrolled in a course' },
];

const ACCEPT =
  'image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain';

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
    attachment_url: '',
    attachment_type: '',
    attachment_name: '',
  });
  const [recipientCount, setRecipientCount] = useState(null);
  const [countLoading, setCountLoading] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Attachment upload state
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchCourses();
  }, []);

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
    } catch {
      showToast('Failed to load announcement history', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await adminCoursesAPI.getAll({ status: 'published', limit: 500 });
      setCourses(response.data.data?.courses || []);
    } catch (e) {
      console.error('Failed to fetch courses:', e);
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
    } catch {
      setRecipientCount(null);
    } finally {
      setCountLoading(false);
    }
  };

  const uploadAttachment = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      showToast('File too large (max 10 MB)', 'error');
      return;
    }
    setUploading(true);
    setUploadProgress(0);
    try {
      const res = await adminAnnouncementsAPI.uploadAttachment(file, (evt) => {
        if (evt.total) setUploadProgress(Math.round((evt.loaded / evt.total) * 100));
      });
      const data = res.data.data;
      setForm((prev) => ({
        ...prev,
        attachment_url: data.url,
        attachment_type: data.type,
        attachment_name: data.name,
      }));
      showToast('Attachment uploaded', 'success');
    } catch (e) {
      showToast(e.response?.data?.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (file) uploadAttachment(file);
    e.target.value = ''; // allow re-picking the same file
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) uploadAttachment(file);
  };

  const clearAttachment = () =>
    setForm((prev) => ({ ...prev, attachment_url: '', attachment_type: '', attachment_name: '' }));

  const handleSend = () => {
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
      setForm({
        title: '', message: '', target: 'all_students', course_id: '', link: '',
        attachment_url: '', attachment_type: '', attachment_name: '',
      });
      setConfirmOpen(false);
      setRecipientCount(null);
      fetchAnnouncements();
    } catch (e) {
      showToast(e.response?.data?.message || 'Failed to send announcement', 'error');
    } finally {
      setSendLoading(false);
    }
  };

  const targetLabel = (t) => TARGET_OPTIONS.find((o) => o.value === t)?.label || t;
  const targetBadgeVariant = (t) => ({ all_users: 'default', all_students: 'info', all_instructors: 'warning', course: 'success' }[t] || 'default');

  return (
    <>
      <PageHeader
        icon={Megaphone}
        title="Announcements"
        subtitle="Send messages to users — they appear in the notification bell"
      />

      <Container className="py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Compose Panel */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-4 sm:p-5 lg:sticky lg:top-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Compose</h2>
              </div>

              <div className="space-y-4">
                <Input
                  label="Title"
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g. System Maintenance Tonight"
                  maxLength={100}
                />

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Message <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={form.message}
                    onChange={(e) => setForm((prev) => ({ ...prev, message: e.target.value }))}
                    rows={4}
                    className="w-full px-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                    placeholder="Write your announcement here..."
                  />
                </div>

                {/* Audience — compact 2-col grid on mobile, 1-col list on lg */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Audience</label>
                  <div className="grid grid-cols-2 lg:grid-cols-1 gap-2">
                    {TARGET_OPTIONS.map(({ value, label, icon: Icon, description }) => {
                      const selected = form.target === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, target: value, course_id: '' }))}
                          className={`text-left flex items-start gap-2 p-2.5 rounded-lg border transition-all ${
                            selected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 ${
                            selected ? 'bg-blue-500 text-white' : 'bg-gray-100 dark:bg-dark-700 text-gray-500 dark:text-gray-400'
                          }`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{label}</p>
                            <p className="hidden lg:block text-xs text-gray-500 dark:text-gray-400">{description}</p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {form.target === 'course' && (
                  <Select
                    label="Select Course"
                    value={form.course_id}
                    onChange={(e) => setForm((prev) => ({ ...prev, course_id: e.target.value }))}
                    options={[
                      { value: '', label: 'Choose a course...' },
                      ...courses.map((c) => ({ value: c.id, label: c.title })),
                    ]}
                  />
                )}

                {/* Attachment */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Attachment <span className="text-xs font-normal text-gray-400">(optional, max 10 MB)</span>
                  </label>

                  {form.attachment_url ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-700">
                      {form.attachment_type === 'image' ? (
                        <img src={form.attachment_url} alt="" className="w-12 h-12 object-cover rounded" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{form.attachment_name}</p>
                        <a href={form.attachment_url} target="_blank" rel="noreferrer" className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline">
                          View
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={clearAttachment}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={handleDrop}
                      className={`border-2 border-dashed rounded-lg p-3 cursor-pointer text-center transition-colors ${
                        dragOver
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/10'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-400 dark:hover:border-blue-500'
                      }`}
                    >
                      {uploading ? (
                        <div className="flex items-center justify-center gap-2 py-1.5">
                          <Spinner size="sm" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">Uploading {uploadProgress}%</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2 text-xs text-gray-500 dark:text-gray-400 py-1.5">
                          <Paperclip className="w-3.5 h-3.5" />
                          <span><span className="text-blue-600 dark:text-blue-400 font-medium">Choose a file</span> or drag here</span>
                        </div>
                      )}
                      <p className="text-[10px] text-gray-400 mt-1">JPG, PNG, GIF, PDF, DOCX, PPTX, XLSX, TXT</p>
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    onChange={handleFilePick}
                    className="hidden"
                  />
                </div>

                {/* Link */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Link <span className="text-xs font-normal text-gray-400">(optional)</span>
                  </label>
                  <div className="relative">
                    <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                    <input
                      type="text"
                      value={form.link}
                      onChange={(e) => setForm((prev) => ({ ...prev, link: e.target.value }))}
                      placeholder="/courses or https://..."
                      className="w-full pl-9 pr-3 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </div>
                </div>

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

                <Button
                  onClick={handleSend}
                  className="w-full"
                  disabled={!form.title || !form.message || uploading}
                  leftIcon={<Send className="w-4 h-4" />}
                >
                  Send Announcement
                </Button>
              </div>
            </div>
          </div>

          {/* History */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-4 border-b border-gray-200 dark:border-border-dark">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Announcement History</h2>
                <Button variant="ghost" size="sm" onClick={fetchAnnouncements} leftIcon={<RefreshCw className="w-4 h-4" />}>
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
              </div>

              {loading ? (
                <div className="p-10 flex justify-center"><Spinner /></div>
              ) : announcements.length === 0 ? (
                <div className="p-10 text-center text-gray-400">
                  <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">No announcements sent yet</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-border-dark">
                  {announcements.map((ann) => (
                    <div key={ann.id} className="p-4 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white">{ann.title}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2 break-words">{ann.message}</p>
                        </div>
                        <Badge variant={targetBadgeVariant(ann.target)}>
                          {targetLabel(ann.target)}
                        </Badge>
                      </div>

                      {/* Attachment preview chip */}
                      {ann.attachment_url && (
                        <a
                          href={ann.attachment_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 mt-1 mb-2 px-2 py-1 rounded-md bg-gray-100 dark:bg-dark-700 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors max-w-full"
                        >
                          {ann.attachment_type === 'image' ? (
                            <ImageIcon className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" />
                          ) : (
                            <FileText className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                          )}
                          <span className="truncate">{ann.attachment_name || 'Attachment'}</span>
                        </a>
                      )}

                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-400">
                        <span>{ann.recipient_count} recipients</span>
                        <span>by {ann.admin?.full_name || 'Admin'}</span>
                        <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                        {ann.course && <span className="text-blue-500 truncate">→ {ann.course.title}</span>}
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
          {form.attachment_url && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Attachment: <span className="text-gray-700 dark:text-gray-300">{form.attachment_name}</span>
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)} disabled={sendLoading}>Cancel</Button>
            <Button size="sm" onClick={confirmSend} isLoading={sendLoading} leftIcon={<Send className="w-4 h-4" />}>
              Send Now
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
