import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { liveSessionsAPI, coursesAPI } from '../../lib/api';
import { Video, Plus, Calendar, Clock, Link as LinkIcon, Edit2, Trash2, Radio } from 'lucide-react';
import { Container } from '../../components/layout';
import { Button, Spinner, Alert, Modal } from '../../components/ui';

const PLATFORMS = ['zoom', 'google_meet', 'other'];

function SessionForm({ initial, onSubmit, onCancel, loading }) {
  const [form, setForm] = useState(initial || {
    title: '', description: '', meeting_url: '', platform: 'zoom',
    scheduled_at: '', duration_minutes: 60,
  });

  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const isZoom = form.platform === 'zoom';
  const isEditingZoom = initial?.zoom_meeting_id; // editing an existing Zoom session

  const canSubmit = form.title && form.scheduled_at && (isZoom || form.meeting_url);

  return (
    <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 space-y-4 transition-colors">
      <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary">{initial ? 'Edit Session' : 'Schedule New Session'}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Title *</label>
          <input name="title" value={form.title} onChange={handle} required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
            placeholder="Session title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Platform</label>
          <select name="platform" value={form.platform} onChange={handle}
            disabled={!!isEditingZoom}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors disabled:opacity-60">
            {PLATFORMS.map(p => <option key={p} value={p}>{p === 'zoom' ? 'Zoom (auto-create)' : p.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Duration (minutes)</label>
          <input name="duration_minutes" type="number" min="15" value={form.duration_minutes} onChange={handle}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Date & Time *</label>
          <input name="scheduled_at" type="datetime-local" value={form.scheduled_at} onChange={handle} required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors" />
        </div>

        {/* Meeting URL — hidden for Zoom (auto-generated) */}
        {!isZoom && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Meeting URL *</label>
            <input name="meeting_url" type="url" value={form.meeting_url} onChange={handle}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
              placeholder="https://meet.google.com/..." />
          </div>
        )}

        {/* Zoom info banner */}
        {isZoom && !isEditingZoom && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <Video className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>A Zoom meeting will be automatically created when you schedule this session. Students will receive the join link immediately.</span>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handle} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors resize-none"
            placeholder="What will be covered in this session?" />
        </div>
      </div>
      <div className="flex gap-3 justify-end">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button variant="primary" onClick={() => onSubmit(form)} loading={loading} disabled={loading || !canSubmit}>
          {initial ? 'Update Session' : 'Schedule Session'}
        </Button>
      </div>
    </div>
  );
}

const STATUS_COLORS = {
  scheduled: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400',
  live: 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400',
  ended: 'text-gray-500 bg-gray-100 dark:bg-dark-700 dark:text-gray-400',
};

export default function LiveSessions() {
  const { courseId } = useParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [courseName, setCourseName] = useState('');
  const [deleteSessionId, setDeleteSessionId] = useState(null);

  useEffect(() => {
    fetchSessions();
    fetchCourse();
  }, [courseId]);

  const fetchCourse = async () => {
    try {
      const res = await coursesAPI.getById(courseId);
      setCourseName(res.data.data.course?.title || '');
    } catch {}
  };

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await liveSessionsAPI.getByCourse(courseId);
      setSessions(res.data.data.sessions || []);
    } catch (err) {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (form) => {
    setSubmitting(true);
    setError('');
    try {
      await liveSessionsAPI.create(courseId, form);
      setShowForm(false);
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (form) => {
    setSubmitting(true);
    setError('');
    try {
      await liveSessionsAPI.update(editSession.id, form);
      setEditSession(null);
      fetchSessions();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (id) => {
    setDeleteSessionId(id);
  };

  const confirmDelete = async () => {
    try {
      await liveSessionsAPI.delete(deleteSessionId);
      setDeleteSessionId(null);
      fetchSessions();
    } catch (err) {
      setError('Failed to cancel session');
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await liveSessionsAPI.updateStatus(id, status);
      fetchSessions();
    } catch (err) {
      setError('Failed to update status');
    }
  };

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red py-10">
        <Container>
          <div className="flex items-center gap-3 mb-1">
            <Video className="w-8 h-8 text-white" />
            <h1 className="text-3xl font-bold text-white">Live Sessions</h1>
          </div>
          {courseName && <p className="text-white/80 text-sm">{courseName}</p>}
        </Container>
      </div>

      <Container className="py-6 space-y-4">
        {error && <Alert variant="danger">{error}</Alert>}

        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary">Sessions</h2>
          {!showForm && !editSession && (
            <Button variant="primary" leftIcon={<Plus className="w-4 h-4" />} onClick={() => setShowForm(true)}>
              Schedule Session
            </Button>
          )}
        </div>

        {showForm && !editSession && (
          <SessionForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} loading={submitting} />
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Spinner size="lg" /></div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-dark-800 rounded-xl shadow-sm transition-colors">
            <Video className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-text-dark-muted">No sessions scheduled yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.map((session) => (
              <div key={session.id}>
                {editSession?.id === session.id ? (
                  <SessionForm
                    initial={{
                      ...session,
                      scheduled_at: new Date(session.scheduled_at).toISOString().slice(0, 16),
                    }}
                    onSubmit={handleUpdate}
                    onCancel={() => setEditSession(null)}
                    loading={submitting}
                  />
                ) : (
                  <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-5 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary">{session.title}</h3>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[session.status]}`}>
                            {session.status}
                          </span>
                          <span className="text-xs text-gray-400 capitalize">{session.platform?.replace('_', ' ')}</span>
                        </div>
                        {session.description && (
                          <p className="text-sm text-gray-500 dark:text-text-dark-muted mb-2">{session.description}</p>
                        )}
                        <div className="flex flex-wrap gap-4 text-sm text-gray-500 dark:text-text-dark-muted">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(session.scheduled_at).toLocaleString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-4 h-4" />
                            {session.duration_minutes} min
                          </span>
                          {/* Zoom: show Start Meeting (host) + Join link */}
                          {session.zoom_meeting_id ? (
                            <>
                              {session.zoom_start_url && (
                                <a href={session.zoom_start_url} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 text-white bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded-lg text-xs font-medium transition-colors">
                                  <Video className="w-3.5 h-3.5" />
                                  Start Meeting
                                </a>
                              )}
                              <a href={session.meeting_url} target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-brand-blue hover:underline">
                                <LinkIcon className="w-4 h-4" />
                                Student Join Link
                              </a>
                            </>
                          ) : (
                            <a href={session.meeting_url} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-brand-blue hover:underline">
                              <LinkIcon className="w-4 h-4" />
                              Meeting Link
                            </a>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {session.status === 'scheduled' && (
                          <button onClick={() => handleStatusChange(session.id, 'live')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors">
                            <Radio className="w-3.5 h-3.5" /> Go Live
                          </button>
                        )}
                        {session.status === 'live' && (
                          <button onClick={() => handleStatusChange(session.id, 'ended')}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 transition-colors">
                            End Session
                          </button>
                        )}
                        <button onClick={() => setEditSession(session)}
                          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
                          <Edit2 className="w-4 h-4 text-gray-500 dark:text-text-dark-muted" />
                        </button>
                        <button onClick={() => handleDelete(session.id)}
                          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Container>

      <Modal
        isOpen={!!deleteSessionId}
        onClose={() => setDeleteSessionId(null)}
        title="Cancel Session"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Are you sure you want to cancel this session? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteSessionId(null)}>Keep Session</Button>
          <Button variant="danger" onClick={confirmDelete}>Cancel Session</Button>
        </div>
      </Modal>
    </>
  );
}
