import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { chatAPI } from '../../lib/api';

/**
 * RoomMembersPanel — read-only course-mates drawer for students.
 *
 * Same drawer format and member-row styling as the instructor's
 * RoomSettingsPanel, with the moderation actions (lock / remove /
 * report) stripped out. Students see who's in the room; they don't
 * manage it.
 */
export default function RoomMembersPanel({ roomId, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);

  useEffect(() => {
    if (!isOpen || !roomId) return;
    let cancelled = false;
    setLoading(true);
    setError('');
    chatAPI
      .getRoomMembers(roomId)
      .then((r) => {
        if (cancelled) return;
        setMembers(r.data?.data?.members || []);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.response?.data?.message || 'Failed to load members');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [isOpen, roomId]);

  if (!isOpen) return null;

  const instructors = members.filter((m) => m.room_role === 'instructor' || m.role === 'instructor');
  const students = members.filter((m) => !(m.room_role === 'instructor' || m.role === 'instructor'));

  const MemberRow = ({ m }) => {
    const isInstructorMember = m.room_role === 'instructor' || m.role === 'instructor';
    return (
      <li className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 dark:bg-dark-700/50 border-transparent hover:border-gray-200 dark:hover:border-dark-600 transition-colors">
        {m.profile_picture ? (
          <img src={m.profile_picture} alt={m.full_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
            {(m.full_name || '?').slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.full_name}</p>
            {isInstructorMember && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue dark:text-cyan-400 font-semibold uppercase tracking-wider">
                Instructor
              </span>
            )}
          </div>
        </div>
      </li>
    );
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white dark:bg-dark-800 z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-dark-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Course mates</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Everyone in this course room</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {error && (
            <div className="mb-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          )}

          {loading ? (
            <div className="py-8 flex items-center justify-center text-gray-400">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : members.length === 0 ? (
            <p className="py-6 text-sm text-gray-500 dark:text-gray-400 text-center">No members yet.</p>
          ) : (
            <>
              {instructors.length > 0 && (
                <>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                    Instructor{instructors.length !== 1 ? 's' : ''} ({instructors.length})
                  </h3>
                  <ul className="space-y-2 mb-6">
                    {instructors.map((m) => <MemberRow key={m.id} m={m} />)}
                  </ul>
                </>
              )}
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
                Students ({students.length})
              </h3>
              <ul className="space-y-2">
                {students.map((m) => <MemberRow key={m.id} m={m} />)}
              </ul>
            </>
          )}
        </div>
      </div>
    </>
  );
}
