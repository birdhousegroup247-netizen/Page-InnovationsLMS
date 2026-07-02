import { useState, useEffect } from 'react';
import { attendanceAPI } from '../lib/api';
import { getSocket } from '../lib/socket';
import {
  UserCheck, Calendar, Clock, CheckCircle, AlertCircle, X, BookOpen, Radio,
} from 'lucide-react';
import { Container, EmptyState } from '../components/layout';
import { Button, Spinner, Alert, Modal, Badge } from '../components/ui';
import { cn } from '../utils/cn';

// Student attendance page. Shows every live session across enrolled
// courses with the student's status, plus a "Mark attendance" button
// for sessions that are currently live.
//
// The check-in flow is: click Mark → modal → enter the 6-digit code
// the instructor displayed → backend validates (enrollment + code
// not expired) → row appears as Present/Late.

const STATUS_CONFIG = {
  present: { label: 'Present', color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
  late:    { label: 'Late',    color: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400', icon: <Clock className="w-3 h-3" /> },
  absent:  { label: 'Absent',  color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400',         icon: <X className="w-3 h-3" /> },
  excused: { label: 'Excused', color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400',     icon: <CheckCircle className="w-3 h-3" /> },
};

const SESSION_DOT = {
  scheduled: 'bg-blue-500',
  live: 'bg-red-500 animate-pulse',
  ended: 'bg-gray-400 dark:bg-gray-600',
};

function fmtWhen(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

function SessionRow({ session, onCheckIn }) {
  const canCheckIn = session.status === 'live' && !session.attendance;
  const att = session.attendance;
  const conf = att ? STATUS_CONFIG[att.status] : null;

  return (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl px-4 py-3 flex items-center gap-3">
      <span
        className={cn('w-2.5 h-2.5 rounded-full shrink-0', SESSION_DOT[session.status] || SESSION_DOT.ended)}
        aria-label={session.status}
      />
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
          {session.title || 'Untitled session'}
        </h3>
        <p className="text-xs text-gray-500 dark:text-text-dark-muted truncate flex items-center gap-2">
          <span className="inline-flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {fmtWhen(session.scheduled_at)}
          </span>
          {session.course?.title && (
            <span className="inline-flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> <span className="truncate max-w-[10rem]">{session.course.title}</span>
            </span>
          )}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {conf && (
          <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', conf.color)}>
            {conf.icon} {conf.label}
          </span>
        )}
        {canCheckIn && (
          <Button size="sm" onClick={() => onCheckIn(session)} className="bg-green-600 hover:bg-green-700 text-white">
            <Radio className="w-3.5 h-3.5 mr-1" /> Mark attendance
          </Button>
        )}
      </div>
    </div>
  );
}

export default function Attendance() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [picked, setPicked] = useState(null); // session being checked in
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // silent=true refreshes in the background (socket ping / poll) without
  // flashing the loading spinner over the list.
  const fetch = async (silent = false) => {
    if (!silent) {
      setLoading(true);
      setError('');
    }
    try {
      const res = await attendanceAPI.getMyAttendance();
      setSessions(res.data?.data?.sessions || []);
    } catch (err) {
      if (!silent) setError(err?.response?.data?.message || 'Failed to load attendance');
    } finally {
      if (!silent) setLoading(false);
    }
  };
  useEffect(() => { fetch(); }, []);

  // Live refresh: when the instructor generates a code, the backend
  // flips the session to 'live' and pushes an in-app notification.
  // Refetch on that signal so the check-in button appears without a
  // manual reload — plus a slow poll as a fallback for missed events.
  useEffect(() => {
    const socket = getSocket();
    const onNotif = () => fetch(true);
    socket?.on('notification', onNotif);

    const poll = setInterval(() => fetch(true), 60000);
    return () => {
      socket?.off('notification', onNotif);
      clearInterval(poll);
    };
  }, []);

  const openCheckIn = (s) => {
    setPicked(s);
    setCode('');
    setError('');
  };

  const submitCode = async (e) => {
    e?.preventDefault?.();
    if (!picked || submitting) return;
    const trimmed = code.trim();
    if (!/^\d{4,8}$/.test(trimmed)) {
      setError('Enter the digits the instructor showed');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await attendanceAPI.checkIn(picked.id, trimmed);
      const status = res.data?.data?.attendance?.status || 'present';
      setSuccess(status === 'late' ? 'Checked in (marked late)' : 'Checked in — you are marked present');
      setTimeout(() => setSuccess(''), 3000);
      setPicked(null);
      setCode('');
      fetch();
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not check in');
    } finally {
      setSubmitting(false);
    }
  };

  // Group by status of the SESSION (live / upcoming / past) so the
  // student sees the actionable ones first.
  const liveNow  = sessions.filter((s) => s.status === 'live');
  const upcoming = sessions.filter((s) => s.status === 'scheduled');
  const past     = sessions.filter((s) => s.status === 'ended');

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">Attendance</h1>
                <p className="text-white/85 text-sm mt-1">
                  Mark attendance during a live session by entering the code your instructor displays.
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8 space-y-6">
        {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : sessions.length === 0 ? (
          <EmptyState
            icon={<UserCheck className="w-16 h-16" />}
            title="No sessions yet"
            description="When your instructors schedule live sessions, they'll show up here."
          />
        ) : (
          <>
            {liveNow.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-2 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Live now
                </h2>
                <div className="flex flex-col gap-2">
                  {liveNow.map((s) => <SessionRow key={s.id} session={s} onCheckIn={openCheckIn} />)}
                </div>
              </section>
            )}

            {upcoming.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-2">
                  Upcoming
                </h2>
                <div className="flex flex-col gap-2">
                  {upcoming.map((s) => <SessionRow key={s.id} session={s} onCheckIn={openCheckIn} />)}
                </div>
              </section>
            )}

            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-2">
                  Past
                </h2>
                <div className="flex flex-col gap-2">
                  {past.map((s) => <SessionRow key={s.id} session={s} onCheckIn={openCheckIn} />)}
                </div>
              </section>
            )}
          </>
        )}
      </Container>

      <Modal
        isOpen={!!picked}
        onClose={() => { setPicked(null); setCode(''); setError(''); }}
        title="Enter attendance code"
        size="sm"
      >
        {picked && (
          <form onSubmit={submitCode} className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
              Your instructor showed a 6-digit code. Enter it below.
            </p>
            <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-3 text-sm">
              <p className="font-medium text-gray-900 dark:text-white">{picked.title}</p>
              <p className="text-xs text-gray-500 dark:text-text-dark-muted">
                {picked.course?.title} · {fmtWhen(picked.scheduled_at)}
              </p>
            </div>
            <input
              type="text"
              inputMode="numeric"
              autoFocus
              maxLength={8}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
              placeholder="000000"
              className="w-full text-center text-2xl tracking-widest font-mono px-4 py-3 rounded-lg border border-gray-300 dark:border-border-dark bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            {error && <Alert variant="danger" onClose={() => setError('')}>{error}</Alert>}
            <div className="flex items-center justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setPicked(null)} disabled={submitting}>Cancel</Button>
              <Button type="submit" loading={submitting} disabled={!code.trim()}>Check in</Button>
            </div>
          </form>
        )}
      </Modal>
    </>
  );
}
