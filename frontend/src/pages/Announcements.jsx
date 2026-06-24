import { useEffect, useMemo, useState } from 'react';
import { announcementsAPI } from '../lib/api';
import { Megaphone, BookOpen, Eye, Pin, Star, Paperclip } from 'lucide-react';
import { cn } from '../utils/cn';
import ReactionsBar from '../components/announcements/ReactionsBar';

/**
 * Student Announcements — unified feed of admin broadcasts targeted
 * at this student (all_users, all_students, or course-targeted on
 * their enrollments) plus course announcements from instructors of
 * courses they're enrolled in. Backed by GET /api/announcements/feed
 * which scopes everything server-side based on role + enrollments.
 */
export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');

  useEffect(() => {
    announcementsAPI
      .getFeed()
      .then((res) => setAnnouncements(res.data?.data?.announcements || []))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load announcements'))
      .finally(() => setLoading(false));
  }, []);

  // Filter chips + counts.
  const counts = useMemo(() => ({
    all: announcements.length,
    admin: announcements.filter((a) => a.source === 'admin').length,
    course: announcements.filter((a) => a.source !== 'admin').length,
  }), [announcements]);

  const visible = useMemo(() => announcements.filter((a) => {
    if (sourceFilter === 'admin')  return a.source === 'admin';
    if (sourceFilter === 'course') return a.source !== 'admin';
    return true;
  }), [announcements, sourceFilter]);

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
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-brand-blue" />
          Announcements
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Updates from TekyPro and your instructors.
        </p>
      </div>

      {/* Filter chips */}
      {!loading && !error && announcements.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-5">
          {[
            { id: 'all',    label: 'All',             count: counts.all },
            { id: 'admin',  label: 'From TekyPro',    count: counts.admin },
            { id: 'course', label: 'From my courses', count: counts.course },
          ].map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setSourceFilter(chip.id)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                sourceFilter === chip.id
                  ? 'bg-brand-blue text-white border-brand-blue'
                  : 'bg-white dark:bg-dark-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-dark-700 hover:border-brand-blue/40'
              )}
            >
              {chip.label} <span className="opacity-70">· {chip.count}</span>
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="p-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
        </div>
      ) : error ? (
        <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl">
          <Megaphone className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No announcements yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            When TekyPro or your instructors post updates, they'll show up here.
          </p>
        </div>
      ) : visible.length === 0 ? (
        <div className="p-10 text-center bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium mb-1">
            No announcements match this filter
          </p>
          <button
            type="button"
            onClick={() => setSourceFilter('all')}
            className="text-xs text-brand-blue hover:underline"
          >
            Show all announcements
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {visible.map((a) => {
            const isAdminSrc = a.source === 'admin';
            const sourceBg = isAdminSrc
              ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-200/60 dark:border-purple-800/60 text-purple-700 dark:text-purple-400'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200/60 dark:border-blue-800/60 text-blue-700 dark:text-blue-400';
            const sourceLabel = isAdminSrc ? 'TekyPro' : 'Instructor';
            const body = a.message || a.content || '';
            return (
              <div
                key={`${a.source}-${a.id}`}
                className="group relative bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 p-5 transition-all hover:border-brand-blue/40 hover:shadow-md"
              >
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
                  </div>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    {formatRelative(a.scheduled_at || a.created_at)}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-gray-900 dark:text-white leading-snug mb-2">
                  {a.title}
                </h3>

                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-4 whitespace-pre-wrap mb-3">
                  {body}
                </p>

                {a.attachment_url && (
                  <a
                    href={a.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-3 py-1.5 mb-3 rounded-lg border border-gray-200 dark:border-dark-700 bg-gray-50 dark:bg-dark-700 text-xs text-gray-700 dark:text-gray-300 hover:border-brand-blue/40 transition-colors max-w-full"
                  >
                    <Paperclip className="w-3.5 h-3.5 text-brand-blue shrink-0" />
                    <span className="truncate">{a.attachment_name || 'Attachment'}</span>
                  </a>
                )}

                <div className="mb-3">
                  <ReactionsBar
                    source={a.source === 'admin' ? 'admin' : 'course'}
                    announcementId={a.id}
                    initialTally={a.reactions || {}}
                    initialMine={a.my_reactions || []}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-3 border-t border-gray-100 dark:border-dark-700">
                  <div className="flex items-center gap-2 min-w-0">
                    {a.author_avatar ? (
                      <img src={a.author_avatar} alt={a.author_name} className="w-5 h-5 rounded-full object-cover shrink-0" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple text-white text-[10px] font-semibold flex items-center justify-center shrink-0">
                        {(a.author_name || (isAdminSrc ? 'T' : '?')).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="truncate">{a.author_name || (isAdminSrc ? 'TekyPro' : 'Instructor')}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {a.course?.title && (
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        <span className="truncate max-w-[10rem]">{a.course.title}</span>
                      </span>
                    )}
                    {typeof a.view_count === 'number' && (
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        {a.view_count}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
