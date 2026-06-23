import { useState, useEffect } from 'react';
import { announcementsAPI } from '../lib/api';
import { Megaphone, Calendar, BookOpen } from 'lucide-react';

/**
 * Student Announcements — lists announcements posted by instructors on
 * every course the student is enrolled in. Backed by GET /api/announcements/my
 * which already scopes to the caller's enrollments.
 */
export default function Announcements() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    announcementsAPI
      .getMyAnnouncements()
      .then((res) => setAnnouncements(res.data?.data?.announcements || []))
      .catch((err) => setError(err.response?.data?.message || 'Unable to load announcements'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Megaphone className="w-6 h-6 text-brand-blue" />
          Announcements
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Latest updates from your instructors.
        </p>
      </div>

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
            When instructors post updates, they'll show up here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => (
            <div
              key={a.id}
              className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-5"
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <h2 className="text-base font-semibold text-gray-900 dark:text-white">
                  {a.title}
                </h2>
                {a.is_important && (
                  <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-xs font-semibold flex-shrink-0">
                    Important
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {a.message || a.content}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                {a.course?.title && (
                  <span className="inline-flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5" />
                    {a.course.title}
                  </span>
                )}
                {a.created_at && (
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
