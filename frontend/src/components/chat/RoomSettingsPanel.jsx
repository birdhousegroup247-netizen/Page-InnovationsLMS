import { useState, useEffect } from 'react';
import { Lock, Unlock, X, UserMinus, Flag, Loader2, Megaphone, ShieldAlert } from 'lucide-react';
import { chatAPI } from '../../lib/api';

/**
 * RoomSettingsPanel — instructor-only moderation drawer for a course room.
 *
 * Features:
 *   - List approved members (with badge for instructor / muted state)
 *   - Lock toggle (read-only mode — students can read, can't post)
 *   - Per-member Remove (deletes membership row; student can rejoin if
 *     still enrolled in the course)
 *   - Per-member Report (mutes them + pings every admin for review)
 *
 * Renders as a right-side drawer over the chat. Closes on overlay click
 * or the X button.
 */
export default function RoomSettingsPanel({ roomId, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [actionId, setActionId] = useState(null); // userId currently being acted on
  const [actionKind, setActionKind] = useState(null);

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
        setIsReadOnly(!!r.data?.data?.room?.is_read_only);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.response?.data?.message || 'Failed to load members');
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [isOpen, roomId]);

  const handleToggleLock = async () => {
    setActionKind('lock');
    setActionId('room');
    try {
      const r = await chatAPI.toggleLockRoom(roomId);
      setIsReadOnly(!!r.data?.data?.room?.is_read_only);
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to toggle lock');
    } finally {
      setActionId(null);
      setActionKind(null);
    }
  };

  const handleRemove = async (userId) => {
    if (!confirm('Remove this member from the room? They can rejoin if still enrolled.')) return;
    setActionKind('remove');
    setActionId(userId);
    try {
      await chatAPI.removeMember(roomId, userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to remove member');
    } finally {
      setActionId(null);
      setActionKind(null);
    }
  };

  const handleReport = async (userId, currentlyMuted) => {
    const action = currentlyMuted ? 'unmute' : 'report';
    const confirmMsg = currentlyMuted
      ? 'Unmute this member? Their messages will become visible again.'
      : 'Report this member? Their messages will be hidden and an admin will review.';
    if (!confirm(confirmMsg)) return;

    setActionKind(action);
    setActionId(userId);
    try {
      if (currentlyMuted) {
        await chatAPI.unmuteMember(roomId, userId);
      } else {
        await chatAPI.muteMember(roomId, userId, '');
      }
      setMembers((prev) =>
        prev.map((m) =>
          m.id === userId ? { ...m, muted_at: currentlyMuted ? null : new Date().toISOString() } : m
        )
      );
    } catch (e) {
      setError(e.response?.data?.message || 'Action failed');
    } finally {
      setActionId(null);
      setActionKind(null);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black/40 z-40"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white dark:bg-dark-800 z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-dark-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Room settings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Manage members and posting permissions
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 text-gray-500 dark:text-gray-400 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* Lock toggle */}
          <div className="p-5 border-b border-gray-100 dark:border-dark-700/60">
            <div className="flex items-start gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                isReadOnly
                  ? 'bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-dark-700 dark:text-gray-400'
              }`}>
                {isReadOnly ? <Lock className="w-5 h-5" /> : <Unlock className="w-5 h-5" />}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-gray-900 dark:text-white">
                  {isReadOnly ? 'Room is locked' : 'Room is open'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  {isReadOnly
                    ? 'Only you can post. Students can read history but not send messages.'
                    : 'All members can post messages.'}
                </p>
              </div>
              <button
                onClick={handleToggleLock}
                disabled={actionKind === 'lock'}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                  isReadOnly
                    ? 'bg-brand-blue text-white hover:bg-brand-blue-600'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200'
                } disabled:opacity-50`}
              >
                {actionKind === 'lock' ? '…' : isReadOnly ? 'Unlock' : 'Lock'}
              </button>
            </div>
          </div>

          {/* Members */}
          <div className="p-5">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">
              Members ({members.length})
            </h3>

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
              <ul className="space-y-2">
                {members.map((m) => {
                  const isInstructorMember = m.room_role === 'instructor' || m.role === 'instructor';
                  const muted = !!m.muted_at;
                  const busy = actionId === m.id;
                  return (
                    <li
                      key={m.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        muted
                          ? 'bg-red-50/40 dark:bg-red-900/10 border-red-200 dark:border-red-700/50'
                          : 'bg-gray-50 dark:bg-dark-700/50 border-transparent hover:border-gray-200 dark:hover:border-dark-600'
                      }`}
                    >
                      {/* Avatar */}
                      {m.profile_picture ? (
                        <img src={m.profile_picture} alt={m.full_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {(m.full_name || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {m.full_name}
                          </p>
                          {isInstructorMember && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue dark:text-cyan-400 font-semibold uppercase tracking-wider">
                              Instructor
                            </span>
                          )}
                          {muted && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold uppercase tracking-wider">
                              Muted
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions — instructor row gets no action buttons */}
                      {!isInstructorMember && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            onClick={() => handleReport(m.id, muted)}
                            disabled={busy}
                            title={muted ? 'Unmute' : 'Report (mute + notify admin)'}
                            className={`p-2 rounded-lg transition-colors ${
                              muted
                                ? 'text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/20'
                                : 'text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/20'
                            } disabled:opacity-30`}
                          >
                            {busy && (actionKind === 'report' || actionKind === 'unmute') ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : muted ? (
                              <ShieldAlert className="w-4 h-4" />
                            ) : (
                              <Flag className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleRemove(m.id)}
                            disabled={busy}
                            title="Remove from room"
                            className="p-2 rounded-lg text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
                          >
                            {busy && actionKind === 'remove' ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <UserMinus className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Help text */}
          <div className="p-5 pt-0">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-lg flex items-start gap-2">
              <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                <strong>Remove</strong> kicks the member out but they can rejoin if still enrolled.{' '}
                <strong>Report</strong> mutes them and notifies admins to review.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
