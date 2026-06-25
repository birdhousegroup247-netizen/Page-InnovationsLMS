import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Video, BookOpen, Calendar, Clock, ExternalLink, Edit3, Play,
} from 'lucide-react';
import { instructorAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner, Alert, Badge } from '../../components/ui';
import { cn } from '../../utils/cn';

// Aggregated view of every live session this instructor has across
// every course they teach. Filter chips switch between upcoming and
// past. Per-course detail (create/edit/start) still happens via the
// existing /instructor/courses/:id/sessions page.

export default function AllLiveSessions() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('upcoming');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    instructorAPI
      .getMyLiveSessions({ status: filter })
      .then((res) => { if (alive) setSessions(res?.data?.data?.sessions || []); })
      .catch((e) => { if (alive) setError(e?.response?.data?.message || 'Failed to load sessions'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [filter]);

  const counts = useMemo(() => ({
    upcoming: sessions.length, // backend already filtered
  }), [sessions]);

  const fmtWhen = (d) => {
    if (!d) return '—';
    const date = new Date(d);
    return date.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
    });
  };

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <Container className="py-12 sm:py-14 relative">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold text-white">Live Sessions</h1>
              <p className="text-white/85 mt-1 text-sm sm:text-base">
                Every session across every course you teach.
              </p>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {[
            { id: 'upcoming', label: 'Upcoming' },
            { id: 'past',     label: 'Past' },
            { id: 'all',      label: 'All' },
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
        </div>

        {error && <Alert variant="danger" className="mb-4" onClose={() => setError('')}>{error}</Alert>}

        {loading ? (
          <div className="flex justify-center py-20"><Spinner size="lg" /></div>
        ) : sessions.length === 0 ? (
          <div className="p-12 text-center bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl">
            <Video className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-700 dark:text-gray-300 font-medium">
              {filter === 'upcoming' ? 'No upcoming sessions yet' : 'Nothing here'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Sessions are created on each course's <em>Sessions</em> tab.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sessions.map((s) => {
              const isLive = s.status === 'live';
              const isPast = !isLive && s.scheduled_at && new Date(s.scheduled_at) < new Date();
              const variant = isLive ? 'danger' : (isPast ? 'secondary' : 'success');
              const label   = isLive ? 'Live now' : (isPast ? 'Ended' : 'Scheduled');
              return (
                <div
                  key={s.id}
                  className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <Badge variant={variant}>{label}</Badge>
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                        {s.title || 'Untitled session'}
                      </h3>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" />
                        {fmtWhen(s.scheduled_at)}
                      </span>
                      {s.duration_minutes && (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {s.duration_minutes} min
                        </span>
                      )}
                      {s.course?.title && (
                        <span className="inline-flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {s.course.title}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {(s.zoom_start_url || s.meeting_url) && (
                      <Button
                        size="sm"
                        variant="primary"
                        leftIcon={<Play className="w-4 h-4" />}
                        onClick={() => window.open(s.zoom_start_url || s.meeting_url, '_blank')}
                      >
                        {isLive ? 'Open' : 'Start'}
                      </Button>
                    )}
                    {s.course_id && (
                      <Link
                        to={`/instructor/courses/${s.course_id}/sessions`}
                        className="inline-flex items-center gap-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg hover:border-brand-blue/40 transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Manage
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </>
  );
}
