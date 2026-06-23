import { useState, useEffect } from 'react';
import { Lock, Unlock, X, UserMinus, Flag, Loader2, Megaphone, ShieldAlert } from 'lucide-react';
import { chatAPI } from '../../lib/api';
import Modal from '../ui/Modal';
import Tooltip from '../ui/Tooltip';

/**
 * RoomSettingsPanel — instructor moderation drawer for a course room.
 *
 * Features:
 *   - Member list (with instructor / muted badges)
 *   - Lock toggle (read-only mode)
 *   - Per-member Remove (deletes membership; rejoinable while enrolled)
 *   - Per-member Report (mutes + pings every admin for review)
 *
 * Renders as a right-side drawer. Confirmations use the shared <Modal>
 * (not browser confirm()). Icon buttons get hover <Tooltip>s.
 */
export default function RoomSettingsPanel({ roomId, isOpen, onClose }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [members, setMembers] = useState([]);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [actionId, setActionId] = useState(null);
  const [actionKind, setActionKind] = useState(null);
  // Pending confirmation state — { kind: 'remove'|'report'|'unmute'|'lock', userId?, name? }
  const [confirming, setConfirming] = useState(null);

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

  /* ── Actions ────────────────────────────────────────────────────────── */

  const performLockToggle = async () => {
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
      setConfirming(null);
    }
  };

  const performRemove = async (userId) => {
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
      setConfirming(null);
    }
  };

  const performReport = async (userId, currentlyMuted) => {
    const kind = currentlyMuted ? 'unmute' : 'report';
    setActionKind(kind);
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
      setConfirming(null);
    }
  };

  /* ── Confirm modal copy ─────────────────────────────────────────────── */

  const confirmCopy = (() => {
    if (!confirming) return null;
    if (confirming.kind === 'lock') {
      return {
        title: isReadOnly ? 'Unlock this room?' : 'Lock this room?',
        body: isReadOnly
          ? 'Members will be able to post messages again.'
          : 'Students will be able to read history but won\'t be able to post. Only you can post while it\'s locked.',
        cta: isReadOnly ? 'Unlock' : 'Lock',
        ctaVariant: isReadOnly ? 'primary' : 'warning',
      };
    }
    if (confirming.kind === 'remove') {
      return {
        title: `Remove ${confirming.name}?`,
        body: 'They\'ll be kicked from the room immediately. If they\'re still enrolled in the course they can rejoin themselves.',
        cta: 'Remove',
        ctaVariant: 'danger',
      };
    }
    if (confirming.kind === 'report') {
      return {
        title: `Report ${confirming.name}?`,
        body: 'Their messages will be hidden from the room feed and they won\'t be able to send new ones. Every admin will be notified to review the report.',
        cta: 'Report & Mute',
        ctaVariant: 'danger',
      };
    }
    if (confirming.kind === 'unmute') {
      return {
        title: `Unmute ${confirming.name}?`,
        body: 'Their messages will become visible again and they\'ll be able to send new ones.',
        cta: 'Unmute',
        ctaVariant: 'primary',
      };
    }
    return null;
  })();

  const handleConfirm = () => {
    if (!confirming) return;
    if (confirming.kind === 'lock') return performLockToggle();
    if (confirming.kind === 'remove') return performRemove(confirming.userId);
    if (confirming.kind === 'report') return performReport(confirming.userId, false);
    if (confirming.kind === 'unmute') return performReport(confirming.userId, true);
  };

  /* ── Render ─────────────────────────────────────────────────────────── */

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />

      <div className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-white dark:bg-dark-800 z-50 shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-dark-700">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Room settings</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Manage members and posting permissions</p>
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
        <div className="flex-1 overflow-y-auto">
          {/* Lock card */}
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
                onClick={() => setConfirming({ kind: 'lock' })}
                disabled={actionKind === 'lock'}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors disabled:opacity-50 ${
                  isReadOnly
                    ? 'bg-brand-blue text-white hover:bg-brand-blue-600'
                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-200'
                }`}
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
                          {muted && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-semibold uppercase tracking-wider">
                              Muted
                            </span>
                          )}
                        </div>
                      </div>

                      {!isInstructorMember && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Tooltip content={muted ? 'Unmute member' : 'Report — mute and notify admin'} position="top">
                            <button
                              onClick={() => setConfirming({
                                kind: muted ? 'unmute' : 'report',
                                userId: m.id,
                                name: m.full_name,
                              })}
                              disabled={busy}
                              aria-label={muted ? 'Unmute' : 'Report'}
                              className={`p-2 rounded-lg transition-colors disabled:opacity-30 ${
                                muted
                                  ? 'text-green-600 hover:bg-green-100 dark:text-green-400 dark:hover:bg-green-900/20'
                                  : 'text-amber-600 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/20'
                              }`}
                            >
                              {busy && (actionKind === 'report' || actionKind === 'unmute') ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : muted ? (
                                <ShieldAlert className="w-4 h-4" />
                              ) : (
                                <Flag className="w-4 h-4" />
                              )}
                            </button>
                          </Tooltip>

                          <Tooltip content="Remove from room" position="top">
                            <button
                              onClick={() => setConfirming({ kind: 'remove', userId: m.id, name: m.full_name })}
                              disabled={busy}
                              aria-label="Remove"
                              className="p-2 rounded-lg text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900/20 disabled:opacity-30 transition-colors"
                            >
                              {busy && actionKind === 'remove' ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <UserMinus className="w-4 h-4" />
                              )}
                            </button>
                          </Tooltip>
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

      {/* Confirmation modal — replaces browser confirm() for a real UX */}
      <Modal isOpen={!!confirming} onClose={() => setConfirming(null)} size="sm" title={confirmCopy?.title}>
        {confirmCopy && (
          <div className="space-y-5">
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{confirmCopy.body}</p>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!!actionId}
                className={`px-4 py-2 text-sm font-semibold rounded-lg text-white transition-colors disabled:opacity-60 ${
                  confirmCopy.ctaVariant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : confirmCopy.ctaVariant === 'warning'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-brand-blue hover:bg-brand-blue-600'
                }`}
              >
                {actionId ? 'Working…' : confirmCopy.cta}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
