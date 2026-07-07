import { useState, useEffect } from 'react';
import { chatAPI } from '../../lib/api';
import { Spinner } from '../../components/ui';
import { cn } from '../../utils/cn';
import {
  MessageSquare, Users, BookOpen, ToggleLeft, ToggleRight,
  Trash2, ChevronLeft, AlertCircle, RefreshCw,
} from 'lucide-react';

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

function RoomRow({ room, onToggle, onView }) {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(room.id);
    setToggling(false);
  };

  return (
    <tr className="border-b border-gray-100 dark:border-border-dark hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
      <td className="px-4 py-3">
        <div>
          <p className="font-medium text-sm text-gray-900 dark:text-white">{room.course?.title}</p>
          <p className="text-xs text-gray-500">Instructor: {room.course?.instructor?.full_name || '—'}</p>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <Users className="w-3.5 h-3.5" /> {room.member_count}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className="inline-flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400">
          <MessageSquare className="w-3.5 h-3.5" /> {room.message_count}
        </span>
      </td>
      <td className="px-4 py-3 text-center text-xs text-gray-500">{formatDate(room.created_at)}</td>
      <td className="px-4 py-3 text-center">
        <span className={cn(
          'px-2 py-0.5 rounded-full text-[11px] font-semibold',
          room.is_active
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
            : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
        )}>
          {room.is_active ? 'Active' : 'Disabled'}
        </span>
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => onView(room)}
            className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-dark-500 transition-colors"
          >
            Messages
          </button>
          <button
            onClick={handleToggle}
            disabled={toggling}
            className={cn(
              'text-xs px-2.5 py-1 rounded-lg font-medium transition-colors disabled:opacity-50',
              room.is_active
                ? 'bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400'
                : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
            )}
          >
            {room.is_active ? 'Disable' : 'Enable'}
          </button>
        </div>
      </td>
    </tr>
  );
}

function MessageRow({ msg, onDelete }) {
  const [deleting, setDeleting] = useState(false);
  const isDeleted = !!msg.deleted_at;

  const handleDelete = async () => {
    if (isDeleted) return;
    setDeleting(true);
    await onDelete(msg.id);
    setDeleting(false);
  };

  return (
    <div className={cn('flex items-start gap-3 px-4 py-3 border-b border-gray-100 dark:border-border-dark', isDeleted && 'opacity-50')}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-white">{msg.sender?.full_name}</span>
          <span className="text-[11px] text-gray-400">{new Date(msg.created_at).toLocaleString()}</span>
          {isDeleted && <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Deleted</span>}
        </div>
        {msg.body && <p className="text-sm text-gray-600 dark:text-gray-400 break-words">{msg.body}</p>}
        {msg.attachment_url && (
          <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-brand-blue underline">View attachment</a>
        )}
      </div>
      {!isDeleted && (
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors disabled:opacity-50 flex-shrink-0"
        >
          {deleting ? <Spinner className="w-3.5 h-3.5" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

export default function AdminChatModeration() {
  const [rooms, setRooms]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [viewRoom, setViewRoom] = useState(null);  // room being inspected
  const [messages, setMessages] = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);

  const loadRooms = async (p = 1) => {
    setLoading(true);
    setError(null);
    try {
      const r = await chatAPI.adminGetRooms({ page: p, limit: 20 });
      setRooms(r.data?.data?.rooms || []);
      setTotal(r.data?.data?.total || 0);
      setPage(p);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (room) => {
    setViewRoom(room);
    setMsgLoading(true);
    try {
      const r = await chatAPI.adminGetRoomMessages(room.id);
      setMessages(r.data?.data?.messages || []);
    } catch { setMessages([]); } finally {
      setMsgLoading(false);
    }
  };

  const handleToggle = async (roomId) => {
    try {
      await chatAPI.toggleRoom(roomId);
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, is_active: !r.is_active } : r));
    } catch { /* silent */ }
  };

  const handleDelete = async (msgId) => {
    try {
      await chatAPI.deleteMessage(msgId);
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, deleted_at: new Date().toISOString() } : m));
    } catch { /* silent */ }
  };

  useEffect(() => { loadRooms(); }, []);

  if (viewRoom) {
    return (
      <div className="p-6">
        <button onClick={() => setViewRoom(null)} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors">
          <ChevronLeft className="w-4 h-4" />
          Back to rooms
        </button>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-1">{viewRoom.course?.title}</h1>
        <p className="text-sm text-gray-500 mb-6">All messages · Admin view</p>

        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-border-dark overflow-hidden">
          {msgLoading && <div className="flex justify-center py-10"><Spinner /></div>}
          {!msgLoading && messages.length === 0 && (
            <p className="text-center text-gray-400 py-10 text-sm">No messages</p>
          )}
          {messages.map((msg) => (
            <MessageRow key={msg.id} msg={msg} onDelete={handleDelete} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-brand-blue" />
            Chat Moderation
          </h1>
          <p className="text-sm text-gray-500 mt-1">{total} course chat rooms total</p>
        </div>
        <button onClick={() => loadRooms(page)} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-300 text-sm hover:bg-gray-200 transition-colors">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-500 bg-red-50 dark:bg-red-900/10 rounded-lg px-4 py-3 mb-4 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-100 dark:border-border-dark overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner /></div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Members</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Messages</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <RoomRow key={room.id} room={room} onToggle={handleToggle} onView={loadMessages} />
              ))}
              {rooms.length === 0 && (
                <tr><td colSpan={6} className="py-12 text-center text-gray-400 text-sm">No chat rooms yet</td></tr>
              )}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2 mt-4">
          <button disabled={page === 1} onClick={() => loadRooms(page - 1)}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-dark-700 disabled:opacity-40 hover:bg-gray-200 transition-colors">
            Prev
          </button>
          <span className="text-sm text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
          <button disabled={page >= Math.ceil(total / 20)} onClick={() => loadRooms(page + 1)}
            className="px-3 py-1.5 rounded-lg text-sm bg-gray-100 dark:bg-dark-700 disabled:opacity-40 hover:bg-gray-200 transition-colors">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
