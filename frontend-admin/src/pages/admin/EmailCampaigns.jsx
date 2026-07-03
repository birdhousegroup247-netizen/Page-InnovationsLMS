import { useState, useEffect } from 'react';
import { adminEmailCampaignsAPI, adminCoursesAPI } from '../../lib/api';
import {
  Mail, Plus, Send, Clock, CheckCircle, XCircle, RefreshCw, Trash2,
  Users, GraduationCap, User, Package, UserPlus, AlertCircle,
} from 'lucide-react';
import { Button, Input, Select, Badge, Spinner, Modal } from '../../components/ui';
import Container from '../../components/layout/Container';
import { PageHeader } from '../../components/layout';
import { useToast } from '../../components/ui/Toast';

const BLANK = {
  title: '',
  subject: '',
  header_title: '',
  body_html: '',
  cta_text: '',
  cta_url: '',
  segment: 'all_students',
  segment_course_id: '',
  scheduled_at: '',
};

const SEGMENT_LABELS = {
  all_students: { label: 'All students', icon: <GraduationCap className="w-3.5 h-3.5" /> },
  all_instructors: { label: 'All instructors', icon: <User className="w-3.5 h-3.5" /> },
  all_users: { label: 'Everyone', icon: <Users className="w-3.5 h-3.5" /> },
  enrolled_in_course: { label: 'Enrolled in course', icon: <Package className="w-3.5 h-3.5" /> },
  leads_not_converted: { label: 'Leads (not yet paid)', icon: <UserPlus className="w-3.5 h-3.5" /> },
};

const STATUS_BADGE = {
  draft:     { label: 'Draft',     variant: 'gray',   icon: <Clock className="w-3 h-3" /> },
  scheduled: { label: 'Scheduled', variant: 'blue',   icon: <Clock className="w-3 h-3" /> },
  sending:   { label: 'Sending',   variant: 'yellow', icon: <RefreshCw className="w-3 h-3 animate-spin" /> },
  sent:      { label: 'Sent',      variant: 'green',  icon: <CheckCircle className="w-3 h-3" /> },
  failed:    { label: 'Failed',    variant: 'red',    icon: <XCircle className="w-3 h-3" /> },
};

export default function EmailCampaigns() {
  const { showToast } = useToast();
  const [campaigns, setCampaigns] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [detailFor, setDetailFor] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  useEffect(() => {
    fetchCampaigns();
    // Course list needed for the enrolled_in_course segment picker.
    adminCoursesAPI.getAll({ limit: 200 }).then((r) => {
      setCourses(r.data.data?.courses || []);
    }).catch(() => {});
  }, []);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const r = await adminEmailCampaignsAPI.list();
      setCampaigns(r.data.data.campaigns || []);
    } catch {
      showToast('Failed to load campaigns', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditing(null);
    setForm(BLANK);
    setShowModal(true);
  };

  const openEdit = (c) => {
    setEditing(c);
    setForm({
      title: c.title || '',
      subject: c.subject || '',
      header_title: c.header_title || '',
      body_html: c.body_html || '',
      cta_text: c.cta_text || '',
      cta_url: c.cta_url || '',
      segment: c.segment || 'all_students',
      segment_course_id: c.segment_course_id || '',
      scheduled_at: c.scheduled_at ? new Date(c.scheduled_at).toISOString().slice(0, 16) : '',
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.title || !form.subject || !form.body_html) {
      showToast('Title, subject and body are required', 'error');
      return;
    }
    if (form.segment === 'enrolled_in_course' && !form.segment_course_id) {
      showToast('Pick a course for the "Enrolled in course" segment', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...form,
        segment_course_id: form.segment === 'enrolled_in_course' ? parseInt(form.segment_course_id) : null,
        scheduled_at: form.scheduled_at ? new Date(form.scheduled_at).toISOString() : null,
      };
      if (editing) {
        await adminEmailCampaignsAPI.update(editing.id, payload);
      } else {
        await adminEmailCampaignsAPI.create(payload);
      }
      showToast(editing ? 'Campaign updated' : 'Campaign created (draft)', 'success');
      setShowModal(false);
      fetchCampaigns();
    } catch (e) {
      showToast(e.response?.data?.message || 'Save failed', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async (c) => {
    if (!window.confirm(`Send "${c.title}" to the ${SEGMENT_LABELS[c.segment]?.label || c.segment} segment now? This can't be undone.`)) return;
    try {
      await adminEmailCampaignsAPI.sendNow(c.id);
      showToast('Campaign queued — worker picks it up on the next tick', 'success');
      fetchCampaigns();
    } catch (e) {
      showToast(e.response?.data?.message || 'Send failed', 'error');
    }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Delete "${c.title}"? This can't be undone.`)) return;
    try {
      await adminEmailCampaignsAPI.remove(c.id);
      showToast('Campaign deleted', 'success');
      fetchCampaigns();
    } catch (e) {
      showToast(e.response?.data?.message || 'Delete failed', 'error');
    }
  };

  const openDetail = async (c) => {
    setDetailFor(c);
    setDetail(null);
    setDetailLoading(true);
    try {
      const r = await adminEmailCampaignsAPI.getById(c.id);
      setDetail(r.data.data);
    } catch {
      showToast('Failed to load campaign detail', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        icon={<Mail className="w-6 h-6" />}
        title="Email Campaigns"
        subtitle="Compose and send broadcast emails to student / instructor / lead segments."
      >
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> New Campaign
        </Button>
      </PageHeader>

      <Container>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner /></div>
        ) : campaigns.length === 0 ? (
          <div className="text-center py-16 text-gray-500 dark:text-gray-400">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-40" />
            <p className="text-sm">No campaigns yet — click "New Campaign" to compose one.</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700 text-xs uppercase text-gray-500 dark:text-gray-400">
                <tr>
                  <th className="text-left px-4 py-3">Title</th>
                  <th className="text-left px-4 py-3 hidden sm:table-cell">Segment</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3 hidden md:table-cell">Delivered</th>
                  <th className="text-right px-4 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                {campaigns.map((c) => {
                  const seg = SEGMENT_LABELS[c.segment] || { label: c.segment, icon: null };
                  const s = STATUS_BADGE[c.status] || { label: c.status, variant: 'gray' };
                  return (
                    <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => openDetail(c)}
                          className="text-left text-sm font-medium text-gray-900 dark:text-white hover:text-brand-blue"
                        >
                          {c.title}
                        </button>
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">{c.subject}</p>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full">
                          {seg.icon}{seg.label}
                        </span>
                        {c.segment === 'enrolled_in_course' && c.segment_course && (
                          <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{c.segment_course.title}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={s.variant}>
                          <span className="inline-flex items-center gap-1">{s.icon}{s.label}</span>
                        </Badge>
                        {c.scheduled_at && c.status === 'scheduled' && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {new Date(c.scheduled_at).toLocaleString()}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <p className="text-sm text-gray-900 dark:text-white">{c.delivered_count || 0}</p>
                        {(c.failed_count > 0 || c.skipped_count > 0) && (
                          <p className="text-xs text-gray-500">
                            {c.failed_count > 0 && <span className="text-red-500">{c.failed_count} failed</span>}
                            {c.failed_count > 0 && c.skipped_count > 0 && ' · '}
                            {c.skipped_count > 0 && <span>{c.skipped_count} opted out</span>}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1">
                          {c.status === 'draft' && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openEdit(c)}>Edit</Button>
                              <Button size="sm" onClick={() => handleSendNow(c)}>
                                <Send className="w-3.5 h-3.5 mr-1" /> Send
                              </Button>
                            </>
                          )}
                          {(c.status === 'draft' || c.status === 'failed') && (
                            <button
                              onClick={() => handleDelete(c)}
                              className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Container>

      {/* Compose modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit campaign' : 'New campaign'}
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Internal title</label>
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Q3 2026 – Oracle course launch"
            />
            <p className="text-xs text-gray-500 mt-1">Only visible to admins.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Subject line</label>
            <Input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Recipients see this in their inbox"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Header title (optional)</label>
            <Input
              value={form.header_title}
              onChange={(e) => setForm({ ...form, header_title: e.target.value })}
              placeholder="Defaults to the subject line"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Body (HTML supported)</label>
            <textarea
              value={form.body_html}
              onChange={(e) => setForm({ ...form, body_html: e.target.value })}
              rows={8}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="<p>Hi <strong>{{name}}</strong>,</p><p>We just launched…</p>"
            />
            <p className="text-xs text-gray-500 mt-1">Wrapped in the standard Page Innovation shell at send time — no need to write &lt;html&gt;.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Button text</label>
              <Input
                value={form.cta_text}
                onChange={(e) => setForm({ ...form, cta_text: e.target.value })}
                placeholder="Optional"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Button URL</label>
              <Input
                value={form.cta_url}
                onChange={(e) => setForm({ ...form, cta_url: e.target.value })}
                placeholder="https://…"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Send to</label>
              <Select
                value={form.segment}
                onChange={(e) => setForm({ ...form, segment: e.target.value })}
              >
                {Object.entries(SEGMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v.label}</option>
                ))}
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Schedule (optional)</label>
              <Input
                type="datetime-local"
                value={form.scheduled_at}
                onChange={(e) => setForm({ ...form, scheduled_at: e.target.value })}
              />
              <p className="text-xs text-gray-500 mt-1">Leave blank to send from the list with the Send button.</p>
            </div>
          </div>

          {form.segment === 'enrolled_in_course' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Course</label>
              <Select
                value={form.segment_course_id}
                onChange={(e) => setForm({ ...form, segment_course_id: e.target.value })}
              >
                <option value="">Pick a course…</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </Select>
            </div>
          )}

          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-xs text-blue-700 dark:text-blue-300">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <p>Recipients who unsubscribed will be automatically skipped and shown as "opted out" in the delivery report.</p>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>Cancel</Button>
            <Button onClick={handleSave} isLoading={saving}>
              {editing ? 'Save changes' : 'Save as draft'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Detail modal */}
      <Modal
        isOpen={!!detailFor}
        onClose={() => { setDetailFor(null); setDetail(null); }}
        title={detailFor?.title || 'Campaign detail'}
        size="lg"
      >
        {detailLoading || !detail ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : (
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Subject</p>
                <p className="text-gray-900 dark:text-white">{detail.campaign.subject}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Segment</p>
                <p className="text-gray-900 dark:text-white">{SEGMENT_LABELS[detail.campaign.segment]?.label || detail.campaign.segment}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Status</p>
                <p className="text-gray-900 dark:text-white">{detail.campaign.status}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Sent at</p>
                <p className="text-gray-900 dark:text-white">
                  {detail.campaign.sent_at ? new Date(detail.campaign.sent_at).toLocaleString() : '—'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-3">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
                <p className="text-xs text-green-700 dark:text-green-400">Delivered</p>
                <p className="text-lg font-semibold text-green-800 dark:text-green-300">{detail.deliveries.totals?.delivered || 0}</p>
              </div>
              <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-lg font-semibold text-gray-800 dark:text-gray-200">{detail.deliveries.totals?.pending || 0}</p>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3">
                <p className="text-xs text-yellow-700 dark:text-yellow-400">Opted out</p>
                <p className="text-lg font-semibold text-yellow-800 dark:text-yellow-300">{detail.deliveries.totals?.skipped || 0}</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
                <p className="text-xs text-red-700 dark:text-red-400">Failed</p>
                <p className="text-lg font-semibold text-red-800 dark:text-red-300">{detail.deliveries.totals?.failed || 0}</p>
              </div>
            </div>

            {detail.deliveries.failure_sample?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Recent failures</p>
                <div className="border border-gray-200 dark:border-border-dark rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 dark:bg-dark-700">
                      <tr>
                        <th className="text-left px-3 py-1.5">Email</th>
                        <th className="text-left px-3 py-1.5">Error</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                      {detail.deliveries.failure_sample.map((f, i) => (
                        <tr key={i}>
                          <td className="px-3 py-1.5">{f.email}</td>
                          <td className="px-3 py-1.5 text-red-600 dark:text-red-400 truncate max-w-md">{f.error}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
