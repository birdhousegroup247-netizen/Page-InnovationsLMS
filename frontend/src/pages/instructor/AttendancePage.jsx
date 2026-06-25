import { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  UserCheck, RefreshCw, Copy, Check, Users, ChevronRight, ArrowLeft, BookOpen, Calendar,
} from 'lucide-react';
import { instructorAPI, attendanceAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner, Alert, Badge, Tooltip } from '../../components/ui';
import { cn } from '../../utils/cn';

// Single component, two URLs:
//   /instructor/attendance                            — list every session, click one to manage
//   /instructor/sessions/:sessionId/attendance        — manage a specific session
//
// On the list view, the instructor sees their live + recent sessions
// with attendance totals. On the detail view they see:
//   - Generate / copy / countdown of the active code
//   - Full roster (every enrolled student) with per-row status chip + override
//   - Counts: present / late / absent / excused / unmarked
//
// Sharing-the-code mitigations baked into the backend:
//   - Enrollment check (a non-enrolled student can't check in)
//   - Audit log on every check-in (ip + user-agent)
// The UI doesn't surface the audit log by default; it's there if the
// instructor ever asks "who's cheating."

const STATUS_PILL = {
  present: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
  late:    'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  absent:  'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',
  excused: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',
  unmarked: 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400',
};

function fmtWhen(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

// ─── List view: pick a session ──────────────────────────────────────────────

function SessionList() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    instructorAPI.getMyLiveSessions({ status: 'all', limit: 100 })
      .then((r) => { if (alive) setSessions(r.data?.data?.sessions || []); })
      .catch((e) => { if (alive) setError(e?.response?.data?.message || 'Failed to load sessions'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  // Show live first, then upcoming (scheduled), then past.
  const ordered = useMemo(() => {
    const rank = (s) => (s.status === 'live' ? 0 : s.status === 'scheduled' ? 1 : 2);
    return [...sessions].sort((a, b) => {
      const r = rank(a) - rank(b);
      if (r !== 0) return r;
      return new Date(b.scheduled_at) - new Date(a.scheduled_at);
    });
  }, [sessions]);

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red py-10">
        <Container>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Attendance</h1>
              <p className="text-white/85 text-sm mt-1">
                Pick a session to take or review attendance. Generate a code for students to check in.
              </p>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : ordered.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl">
            <UserCheck className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">No live sessions yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Schedule a session from the Live Sessions tab to take attendance.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {ordered.map((s) => (
              <Link
                key={s.id}
                to={`/instructor/sessions/${s.id}/attendance`}
                className="group bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl px-4 py-3 flex items-center gap-3 hover:border-brand-blue/40 transition-colors"
              >
                <span className={cn(
                  'w-2.5 h-2.5 rounded-full shrink-0',
                  s.status === 'live' ? 'bg-red-500 animate-pulse' : s.status === 'scheduled' ? 'bg-blue-500' : 'bg-gray-400'
                )} />
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.title || 'Untitled session'}</h3>
                  <p className="text-xs text-gray-500 dark:text-text-dark-muted truncate flex items-center gap-2">
                    <span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> {fmtWhen(s.scheduled_at)}</span>
                    {s.course?.title && (
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="w-3 h-3" /> <span className="truncate max-w-[10rem]">{s.course.title}</span>
                      </span>
                    )}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </Container>
    </>
  );
}

// ─── Detail view: manage one session's attendance ───────────────────────────

function CountdownBadge({ expiresAt }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, new Date(expiresAt) - Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      setRemaining(Math.max(0, new Date(expiresAt) - Date.now()));
    }, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);
  if (remaining <= 0) return <Badge variant="danger">Expired</Badge>;
  const m = Math.floor(remaining / 60000);
  const sec = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
  return <Badge variant="info">{m}:{sec} left</Badge>;
}

function SessionDetail({ sessionId }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [code, setCode] = useState(null); // { code, expires_at }
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [savingFor, setSavingFor] = useState({}); // { [studentId]: bool }

  const fetchRoster = async () => {
    setLoading(true);
    try {
      const res = await attendanceAPI.getRoster(sessionId);
      setData(res.data?.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load roster');
    } finally {
      setLoading(false);
    }
  };
  const fetchActiveCode = async () => {
    try {
      const res = await attendanceAPI.getActiveCode(sessionId);
      setCode(res.data?.data?.code ? res.data.data : null);
    } catch {
      // Quietly ignore — no code is a fine state
      setCode(null);
    }
  };
  useEffect(() => {
    fetchRoster();
    fetchActiveCode();
    // Keep the roster fresh while the panel is open — students are
    // checking in right now during a live session.
    const t = setInterval(() => { fetchRoster(); }, 15 * 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  const generate = async () => {
    if (generating) return;
    setGenerating(true);
    setError('');
    try {
      const res = await attendanceAPI.generateCode(sessionId);
      setCode(res.data?.data);
      setSuccess('New code generated. Display it to your students.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to generate code');
    } finally {
      setGenerating(false);
    }
  };

  const copyCode = async () => {
    if (!code?.code) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Browser refused — ignore, the code is on screen anyway.
    }
  };

  const setStatus = async (studentId, status) => {
    setSavingFor((m) => ({ ...m, [studentId]: true }));
    try {
      await attendanceAPI.setStatus(sessionId, studentId, { status });
      fetchRoster();
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to update');
    } finally {
      setSavingFor((m) => ({ ...m, [studentId]: false }));
    }
  };

  // Bulk actions. "Mark all unmarked as absent" is the common end-of-
  // class cleanup; "Mark all present" is the verbal-roll-call path.
  const [bulkSaving, setBulkSaving] = useState(false);
  const runBulk = async (status, scope) => {
    if (bulkSaving) return;
    const label = scope === 'all' ? 'every student' : 'unmarked students';
    if (!window.confirm(`Mark ${label} as ${status}?`)) return;
    setBulkSaving(true);
    setError('');
    try {
      const res = await attendanceAPI.bulkSet(sessionId, { status, scope });
      setSuccess(`Updated ${res.data?.data?.updated ?? 0} student(s).`);
      setTimeout(() => setSuccess(''), 3000);
      fetchRoster();
    } catch (err) {
      setError(err?.response?.data?.message || 'Bulk update failed');
    } finally {
      setBulkSaving(false);
    }
  };

  const session = data?.session;
  const totals = data?.totals;
  const roster = data?.roster || [];
  const filtered = roster.filter((r) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'unmarked') return !r.attendance;
    return r.attendance?.status === statusFilter;
  });

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red py-8">
        <Container>
          <button onClick={() => navigate('/instructor/attendance')} className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex items-start gap-3">
            <UserCheck className="w-8 h-8 text-white shrink-0 mt-0.5" />
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold text-white truncate">
                {session?.title || 'Attendance'}
              </h1>
              <p className="text-white/80 text-sm mt-1 flex flex-wrap items-center gap-3">
                {session?.course?.title && (
                  <span className="inline-flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" /> {session.course.title}</span>
                )}
                <span className="inline-flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {fmtWhen(session?.scheduled_at)}</span>
                {totals && <span>{totals.enrolled} enrolled</span>}
              </p>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-6 space-y-5">
        {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {/* Code generator card */}
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">Attendance code</h3>
              {code ? (
                <>
                  <p className="text-xs text-gray-500 dark:text-text-dark-muted">
                    Display this code to your students. It expires after 10 minutes.
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <div className="text-4xl sm:text-5xl font-mono font-bold tracking-widest text-gray-900 dark:text-white bg-gray-50 dark:bg-dark-700 px-5 py-3 rounded-lg">
                      {code.code}
                    </div>
                    <CountdownBadge expiresAt={code.expires_at} />
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
                  No active code. Hit Generate to start taking attendance.
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {code && (
                <Tooltip content="Copy code">
                  <button
                    type="button"
                    onClick={copyCode}
                    aria-label="Copy code"
                    className="p-2 rounded-lg border border-gray-200 dark:border-border-dark hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4 text-gray-500" />}
                  </button>
                </Tooltip>
              )}
              <Button onClick={generate} loading={generating}>
                <RefreshCw className="w-4 h-4 mr-1.5" /> {code ? 'New code' : 'Generate code'}
              </Button>
            </div>
          </div>
        </div>

        {/* Totals */}
        {totals && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { label: 'Present',  value: totals.present,  cls: 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' },
              { label: 'Late',     value: totals.late,     cls: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300' },
              { label: 'Absent',   value: totals.absent,   cls: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' },
              { label: 'Excused',  value: totals.excused,  cls: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300' },
              { label: 'Unmarked', value: totals.unmarked, cls: 'bg-gray-50 dark:bg-dark-700 text-gray-700 dark:text-gray-300' },
            ].map((s) => (
              <div key={s.label} className={cn('rounded-lg p-3', s.cls)}>
                <p className="text-2xl font-bold">{s.value}</p>
                <p className="text-xs font-medium opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Roster */}
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl">
          <div className="px-5 py-3 border-b border-gray-200 dark:border-border-dark flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'all', label: 'All' },
                { id: 'present', label: 'Present' },
                { id: 'late', label: 'Late' },
                { id: 'absent', label: 'Absent' },
                { id: 'excused', label: 'Excused' },
                { id: 'unmarked', label: 'Unmarked' },
              ].map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setStatusFilter(c.id)}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-medium border transition-colors',
                    statusFilter === c.id
                      ? 'bg-brand-blue text-white border-brand-blue'
                      : 'bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-700 hover:border-brand-blue/40'
                  )}
                >
                  {c.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-text-dark-muted">
              <Users className="w-3.5 h-3.5" /> {filtered.length} of {roster.length}
            </div>
          </div>

          {/* Bulk actions — saves grinding through the per-row dropdown
              at the end of class. Confirm dialog before each, so a fat
              finger doesn't nuke a manually-curated roster. */}
          {roster.length > 0 && (
            <div className="px-5 py-3 border-b border-gray-200 dark:border-border-dark flex items-center gap-2 flex-wrap text-xs text-gray-600 dark:text-text-dark-secondary">
              <span className="font-medium">Bulk:</span>
              <button
                type="button"
                disabled={bulkSaving || (totals && totals.unmarked === 0)}
                onClick={() => runBulk('absent', 'unmarked')}
                className="px-3 py-1 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark unmarked as absent
              </button>
              <button
                type="button"
                disabled={bulkSaving}
                onClick={() => runBulk('present', 'all')}
                className="px-3 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Mark everyone present
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center text-sm text-gray-500 dark:text-text-dark-muted py-10">
              No students match this filter.
            </div>
          ) : (
            <ul className="divide-y divide-gray-100 dark:divide-border-dark">
              {filtered.map((row) => {
                const att = row.attendance;
                const status = att?.status || 'unmarked';
                const isAuto = att?.source === 'auto';
                const initials = (row.student.full_name || '?').split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase();
                return (
                  <li key={row.student.id} className="px-5 py-3 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-brand-blue/10 dark:bg-brand-blue/20 flex items-center justify-center text-sm font-medium text-brand-blue shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {row.student.full_name || 'Student'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-text-dark-muted truncate">
                        {row.student.email || '—'}
                        {att?.checked_in_at && (
                          <> · Checked in {new Date(att.checked_in_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</>
                        )}
                        {isAuto && <> · auto</>}
                      </p>
                    </div>
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize', STATUS_PILL[status])}>
                      {status}
                    </span>
                    <select
                      value={status === 'unmarked' ? '' : status}
                      onChange={(e) => setStatus(row.student.id, e.target.value)}
                      disabled={savingFor[row.student.id]}
                      className="ml-1 text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    >
                      <option value="" disabled>Set…</option>
                      <option value="present">Present</option>
                      <option value="late">Late</option>
                      <option value="absent">Absent</option>
                      <option value="excused">Excused</option>
                    </select>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </Container>
    </>
  );
}

export default function AttendancePage() {
  const { sessionId } = useParams();
  return sessionId ? <SessionDetail sessionId={sessionId} /> : <SessionList />;
}
