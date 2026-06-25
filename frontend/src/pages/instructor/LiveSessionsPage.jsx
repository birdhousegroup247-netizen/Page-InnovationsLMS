import { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams, Link, useNavigate } from 'react-router-dom';
import {
  Video, Plus, Edit2, Trash2, Radio, ArrowLeft, Play,
} from 'lucide-react';
import { liveSessionsAPI, coursesAPI, instructorAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner, Alert, Modal, Tooltip } from '../../components/ui';
import { cn } from '../../utils/cn';
import { ensureAbsoluteUrl as absUrl } from '../../utils/videoEmbed';

// One unified page for live sessions, served at three URLs:
//
//   /instructor/live-sessions                   — global, pick a course
//   /instructor/live-sessions?course=:id        — preselected via query
//   /instructor/courses/:courseId/sessions      — preselected via path
//                                                 (course card "Sessions" lands here)
//
// Scoped mode shows only that course's sessions and locks the course
// field in the Create modal. Unscoped mode lists every session across
// every course the instructor teaches, with a Course chip filter and
// a required course selector inside the Create modal. Same component,
// same look — only preselection differs. This is the architecture
// the user asked for: "if clicked from the course it auto-picks; if
// from the menu, you select the course".

const PLATFORMS = ['zoom', 'google_meet', 'other'];
const STATUS_DOT = {
  scheduled: 'bg-blue-500',
  live: 'bg-red-500 animate-pulse',
  ended: 'bg-gray-400 dark:bg-gray-600',
};
const PLATFORM_LABEL = { zoom: 'Zoom', google_meet: 'Google Meet', custom: 'Custom' };

function SessionForm({ initial, onSubmit, onCancel, loading, courses, lockedCourseId }) {
  const [form, setForm] = useState(initial || {
    title: '', description: '', meeting_url: '', platform: 'zoom',
    scheduled_at: '', duration_minutes: 60,
    course_id: lockedCourseId || '',
  });
  const handle = (e) => setForm({ ...form, [e.target.name]: e.target.value });
  const isZoom = form.platform === 'zoom';
  const isEditingZoom = initial?.zoom_meeting_id;
  const courseLocked = !!lockedCourseId;
  const canSubmit = !!form.title && !!form.scheduled_at && (isZoom || !!form.meeting_url) && !!form.course_id;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Course — only when unscoped, otherwise hidden + preselected */}
        {!courseLocked && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Course *</label>
            <select
              name="course_id"
              value={form.course_id}
              onChange={handle}
              required
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            >
              <option value="">Select a course…</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Title *</label>
          <input name="title" value={form.title} onChange={handle} required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
            placeholder="Session title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Platform</label>
          <select name="platform" value={form.platform} onChange={handle}
            disabled={!!isEditingZoom}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-60">
            {PLATFORMS.map(p => <option key={p} value={p}>{p === 'zoom' ? 'Zoom (auto-create)' : p.replace('_', ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Duration (minutes)</label>
          <input name="duration_minutes" type="number" min="15" value={form.duration_minutes} onChange={handle}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Date & Time *</label>
          <input name="scheduled_at" type="datetime-local" value={form.scheduled_at} onChange={handle} required
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue" />
        </div>

        {!isZoom && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Meeting URL *</label>
            <input name="meeting_url" type="url" value={form.meeting_url} onChange={handle}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue"
              placeholder="https://meet.google.com/..." />
          </div>
        )}
        {isZoom && !isEditingZoom && (
          <div className="md:col-span-2 flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-700 dark:text-blue-300">
            <Video className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>A Zoom meeting will be created automatically when you schedule. Students get the join link immediately.</span>
          </div>
        )}

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-1">Description</label>
          <textarea name="description" value={form.description} onChange={handle} rows={2}
            className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
            placeholder="What will be covered in this session?" />
        </div>
      </div>
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-200 dark:border-border-dark">
        <Button variant="ghost" onClick={onCancel} disabled={loading}>Cancel</Button>
        <Button variant="primary" onClick={() => onSubmit(form)} loading={loading} disabled={loading || !canSubmit}>
          {initial ? 'Update Session' : 'Schedule Session'}
        </Button>
      </div>
    </div>
  );
}

export default function LiveSessionsPage() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams, setSearchParams] = useSearchParams();

  // Course scope: path > query string.
  const scopedCourseId =
    params.courseId ? parseInt(params.courseId, 10) :
    (searchParams.get('course') ? parseInt(searchParams.get('course'), 10) : null);
  const isScoped = !!scopedCourseId;

  const [courses, setCourses] = useState([]);          // instructor's courses (for picker)
  const [sessions, setSessions] = useState([]);
  const [scopedCourse, setScopedCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('upcoming');
  const [courseFilter, setCourseFilter] = useState('all'); // only used when unscoped

  // Modals
  const [showCreate, setShowCreate] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleteSession, setDeleteSession] = useState(null);

  // Load instructor's courses (needed for the picker + course title resolution).
  useEffect(() => {
    coursesAPI.getInstructorCourses()
      .then((r) => setCourses(r.data?.data?.courses || []))
      .catch(() => {});
  }, []);

  // Resolve scoped course's title.
  useEffect(() => {
    if (!isScoped) { setScopedCourse(null); return; }
    coursesAPI.getById(scopedCourseId)
      .then((r) => setScopedCourse(r.data?.data?.course || null))
      .catch(() => {});
  }, [scopedCourseId, isScoped]);

  const fetchSessions = async () => {
    setLoading(true);
    setError('');
    try {
      if (isScoped) {
        const r = await liveSessionsAPI.getByCourse(scopedCourseId);
        setSessions(r.data?.data?.sessions || []);
      } else {
        // Pull every session in this instructor's catalog. Filter
        // chips below narrow the view client-side.
        const r = await instructorAPI.getMyLiveSessions({ status: 'all' });
        setSessions(r.data?.data?.sessions || []);
      }
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { fetchSessions(); /* eslint-disable-next-line */ }, [scopedCourseId]);

  const visible = useMemo(() => {
    const now = Date.now();
    return sessions.filter((s) => {
      // Status chip
      if (filter === 'upcoming') {
        if (s.status === 'ended') return false;
        if (s.status !== 'live' && new Date(s.scheduled_at).getTime() < now) return false;
      } else if (filter === 'past') {
        const past = new Date(s.scheduled_at).getTime() < now;
        if (s.status !== 'ended' && !past) return false;
        if (s.status === 'live') return false;
      }
      // Course chip (only when unscoped)
      if (!isScoped && courseFilter !== 'all' && String(s.course_id) !== String(courseFilter)) {
        return false;
      }
      return true;
    });
  }, [sessions, filter, courseFilter, isScoped]);

  // --- Mutations ---
  const handleCreate = async (form) => {
    setSubmitting(true);
    try {
      const targetCourse = scopedCourseId || parseInt(form.course_id, 10);
      const { course_id, ...payload } = form;
      await liveSessionsAPI.create(targetCourse, payload);
      setShowCreate(false);
      await fetchSessions();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to create session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (form) => {
    setSubmitting(true);
    try {
      const { course_id, ...payload } = form;
      await liveSessionsAPI.update(editSession.id, payload);
      setEditSession(null);
      await fetchSessions();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update session');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await liveSessionsAPI.updateStatus(id, status);
      await fetchSessions();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to update status');
    }
  };

  const confirmDelete = async () => {
    try {
      await liveSessionsAPI.delete(deleteSession.id);
      setDeleteSession(null);
      await fetchSessions();
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to cancel session');
    }
  };

  const fmtWhen = (d) => d
    ? new Date(d).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : '—';

  // Count helpers for chips (work on all rows pre-status filter).
  const counts = useMemo(() => {
    const now = Date.now();
    const visibleAcrossCourse = sessions.filter((s) =>
      isScoped || courseFilter === 'all' || String(s.course_id) === String(courseFilter)
    );
    return {
      upcoming: visibleAcrossCourse.filter((s) =>
        s.status === 'live' || (s.status !== 'ended' && new Date(s.scheduled_at).getTime() >= now)
      ).length,
      past: visibleAcrossCourse.filter((s) => s.status === 'ended' || new Date(s.scheduled_at).getTime() < now && s.status !== 'live').length,
      all: visibleAcrossCourse.length,
    };
  }, [sessions, courseFilter, isScoped]);

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <Container className="py-10 sm:py-12">
          {isScoped && (
            <button onClick={() => navigate(-1)} className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          )}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Video className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Live Sessions</h1>
                <p className="text-white/85 text-sm sm:text-base mt-1">
                  {isScoped
                    ? (scopedCourse?.title || 'Course sessions')
                    : 'Every session across every course you teach.'}
                </p>
              </div>
            </div>
            <Button
              variant="secondary"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setShowCreate(true)}
              className="bg-white text-brand-blue hover:bg-gray-100"
            >
              Schedule Session
            </Button>
          </div>
        </Container>
      </div>

      <Container className="py-8 space-y-4">
        {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'upcoming', label: `Upcoming · ${counts.upcoming}` },
            { id: 'past',     label: `Past · ${counts.past}` },
            { id: 'all',      label: `All · ${counts.all}` },
          ].map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFilter(c.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filter === c.id
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-700 hover:border-brand-blue/40'
              )}
            >
              {c.label}
            </button>
          ))}
          {!isScoped && courses.length > 1 && (
            <select
              value={courseFilter}
              onChange={(e) => setCourseFilter(e.target.value)}
              className="ml-2 px-3 py-1.5 rounded-full text-xs font-medium border bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-700"
            >
              <option value="all">Any course</option>
              {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl">
            <Video className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">No sessions match this view</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {sessions.length === 0
                ? 'Click "Schedule Session" to add your first one.'
                : 'Try a different filter chip above.'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {visible.map((s) => {
              const past = new Date(s.scheduled_at).getTime() < Date.now();
              const joinUrl = s.zoom_start_url || s.meeting_url;
              return (
                <div
                  key={s.id}
                  className="group bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl px-4 py-3 flex items-center gap-3 hover:border-brand-blue/40 transition-colors"
                >
                  {/* Status dot — color-coded, no text badge */}
                  <span
                    className={cn('w-2.5 h-2.5 rounded-full shrink-0', STATUS_DOT[s.status] || STATUS_DOT.ended)}
                    aria-label={s.status}
                  />

                  {/* Title + one-line meta */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {s.title || 'Untitled session'}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-text-dark-muted truncate">
                      {fmtWhen(s.scheduled_at)}
                      {s.duration_minutes ? ` · ${s.duration_minutes} min` : ''}
                      {s.platform ? ` · ${PLATFORM_LABEL[s.platform] || s.platform}` : ''}
                      {!isScoped && s.course?.title ? ` · ${s.course.title}` : ''}
                    </p>
                  </div>

                  {/* Primary action — state-aware */}
                  <div className="flex items-center gap-1 shrink-0">
                    {s.status === 'live' && joinUrl && (
                      <a
                        href={absUrl(joinUrl)} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" /> Open
                      </a>
                    )}
                    {s.status === 'scheduled' && !past && joinUrl && (
                      <a
                        href={absUrl(joinUrl)} target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-blue hover:bg-brand-blue/90 rounded-lg transition-colors"
                      >
                        <Play className="w-3.5 h-3.5" /> Start
                      </a>
                    )}
                    {s.status === 'scheduled' && !past && (
                      <Tooltip content="Mark this session as live now">
                        <button
                          onClick={() => handleStatus(s.id, 'live')}
                          aria-label="Go live"
                          className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        >
                          <Radio className="w-4 h-4 text-red-500" />
                        </button>
                      </Tooltip>
                    )}
                    {s.status === 'live' && (
                      <Tooltip content="End session">
                        <button
                          onClick={() => handleStatus(s.id, 'ended')}
                          aria-label="End session"
                          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors text-xs text-gray-600 dark:text-gray-300 px-2"
                        >
                          End
                        </button>
                      </Tooltip>
                    )}
                    <Tooltip content="Edit session">
                      <button
                        onClick={() => setEditSession(s)}
                        aria-label="Edit session"
                        className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                      >
                        <Edit2 className="w-4 h-4 text-gray-500 dark:text-text-dark-muted" />
                      </button>
                    </Tooltip>
                    <Tooltip content="Delete session">
                      <button
                        onClick={() => setDeleteSession(s)}
                        aria-label="Delete session"
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </button>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>

      {/* Create modal — course preselected via scope, otherwise required */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Schedule Session">
        <SessionForm
          onSubmit={handleCreate}
          onCancel={() => setShowCreate(false)}
          loading={submitting}
          courses={courses}
          lockedCourseId={isScoped ? scopedCourseId : null}
        />
      </Modal>

      {/* Edit modal — course is always locked (you can't move a session
          to a different course) */}
      <Modal isOpen={!!editSession} onClose={() => setEditSession(null)} title="Edit Session">
        {editSession && (
          <SessionForm
            initial={{
              ...editSession,
              scheduled_at: editSession.scheduled_at
                ? new Date(editSession.scheduled_at).toISOString().slice(0, 16)
                : '',
              course_id: editSession.course_id,
            }}
            onSubmit={handleUpdate}
            onCancel={() => setEditSession(null)}
            loading={submitting}
            courses={courses}
            lockedCourseId={editSession.course_id}
          />
        )}
      </Modal>

      {/* Delete confirmation */}
      <Modal isOpen={!!deleteSession} onClose={() => setDeleteSession(null)} title="Cancel Session" size="sm">
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Cancel <strong>{deleteSession?.title}</strong>? Notifications already sent won't be recalled.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteSession(null)}>Keep Session</Button>
          <Button variant="danger" onClick={confirmDelete}>Cancel Session</Button>
        </div>
      </Modal>
    </>
  );
}
