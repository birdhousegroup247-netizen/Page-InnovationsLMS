import { useState, useEffect } from 'react';
import { chatAPI } from '../../lib/api';
import { useToast } from '../../components/ui/Toast';
import {
  Button,
  Badge,
  Spinner,
  StatsCard,
} from '../../components/ui';
import { SimplePagination } from '../../components/ui/Pagination';
import { Container } from '../../components/layout';
import { cn } from '../../utils/cn';
import {
  MessageSquare,
  Users,
  Trash2,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  ShieldCheck,
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
      <td className="px-6 py-4">
        <div>
          <p className="font-medium text-sm text-gray-900 dark:text-text-dark-primary">{room.course?.title}</p>
          <p className="text-xs text-gray-500 dark:text-text-dark-secondary mt-0.5">
            Instructor: {room.course?.instructor?.full_name || '—'}
          </p>
        </div>
      </td>
      <td className="px-6 py-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-text-dark-secondary">
          <Users className="w-3.5 h-3.5" />
          {room.member_count}
        </span>
      </td>
      <td className="px-6 py-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-sm text-gray-600 dark:text-text-dark-secondary">
          <MessageSquare className="w-3.5 h-3.5" />
          {room.message_count}
        </span>
      </td>
      <td className="px-6 py-4 text-center text-sm text-gray-500 dark:text-text-dark-secondary">
        {formatDate(room.created_at)}
      </td>
      <td className="px-6 py-4 text-center">
        <Badge variant={room.is_active ? 'success' : 'danger'} size="sm">
          {room.is_active ? 'Active' : 'Disabled'}
        </Badge>
      </td>
      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onView(room)}
          >
            Messages
          </Button>
          <Button
            variant={room.is_active ? 'danger' : 'success'}
            size="sm"
            onClick={handleToggle}
            isLoading={toggling}
          >
            {room.is_active ? 'Disable' : 'Enable'}
          </Button>
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
    <div className={cn(
      'flex items-start gap-3 px-6 py-4 border-b border-gray-100 dark:border-border-dark',
      isDeleted && 'opacity-50'
    )}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900 dark:text-text-dark-primary">
            {msg.sender?.full_name}
          </span>
          <span className="text-xs text-gray-400 dark:text-text-dark-muted">
            {new Date(msg.created_at).toLocaleString()}
          </span>
          {isDeleted && (
            <Badge variant="danger" size="sm">Deleted</Badge>
          )}
        </div>
        {msg.body && (
          <p className="text-sm text-gray-600 dark:text-text-dark-secondary break-words">{msg.body}</p>
        )}
        {msg.attachment_url && (
          <a
            href={msg.attachment_url}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-brand-blue underline"
          >
            View attachment
          </a>
        )}
      </div>
      {!isDeleted && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDelete}
          isLoading={deleting}
          title="Delete message"
          className="text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 flex-shrink-0"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
  );
}

export default function ChatModeration() {
  const { showToast } = useToast();
  const [rooms, setRooms]           = useState([]);
  const [total, setTotal]           = useState(0);
  const [page, setPage]             = useState(1);
  const [loading, setLoading]       = useState(true);
  const [viewRoom, setViewRoom]     = useState(null);
  const [messages, setMessages]     = useState([]);
  const [msgLoading, setMsgLoading] = useState(false);

  const loadRooms = async (p = 1) => {
    setLoading(true);
    try {
      const r = await chatAPI.adminGetRooms({ page: p, limit: 20 });
      setRooms(r.data?.data?.rooms || []);
      setTotal(r.data?.data?.total || 0);
      setPage(p);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to load rooms', 'error');
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
    } catch {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  };

  const handleToggle = async (roomId) => {
    try {
      await chatAPI.toggleRoom(roomId);
      setRooms((prev) => prev.map((r) => r.id === roomId ? { ...r, is_active: !r.is_active } : r));
    } catch {
      showToast('Failed to update room status', 'error');
    }
  };

  const handleDelete = async (msgId) => {
    try {
      await chatAPI.deleteMessage(msgId);
      setMessages((prev) => prev.map((m) => m.id === msgId ? { ...m, deleted_at: new Date().toISOString() } : m));
    } catch {
      showToast('Failed to delete message', 'error');
    }
  };

  useEffect(() => { loadRooms(); }, []);

  const totalPages = Math.ceil(total / 20);
  const activeRooms = rooms.filter(r => r.is_active).length;
  const totalMessages = rooms.reduce((sum, r) => sum + (r.message_count || 0), 0);

  // ── Messages drill-down view ────────────────────────────────────────────────
  if (viewRoom) {
    return (
      <>
        <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
          <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />
          <div className="relative z-10 py-12 sm:py-16">
            <Container>
              <Button
                variant="ghost"
                onClick={() => setViewRoom(null)}
                className="!text-white !bg-white/10 !border !border-white/20 hover:!bg-white/20 mb-4"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back to rooms
              </Button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">
                    {viewRoom.course?.title}
                  </h1>
                  <p className="text-white/90 mt-1">
                    {messages.length} message{messages.length !== 1 ? 's' : ''} · Admin view
                  </p>
                </div>
              </div>
            </Container>
          </div>
        </div>

        <Container className="py-8">
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
            {msgLoading ? (
              <div className="flex justify-center py-12">
                <Spinner size="lg" />
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-text-dark-secondary text-sm">No messages in this room</p>
              </div>
            ) : (
              messages.map((msg) => (
                <MessageRow key={msg.id} msg={msg} onDelete={handleDelete} />
              ))
            )}
          </div>
        </Container>
      </>
    );
  }

  // ── Rooms list view ─────────────────────────────────────────────────────────
  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />
        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                    Chat Moderation
                  </h1>
                  <p className="text-lg text-white/90 animate-fade-in mt-1">
                    Monitor and manage all course chat rooms
                  </p>
                </div>
              </div>
              <Button
                onClick={() => loadRooms(page)}
                variant="ghost"
                className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <StatsCard
            title="Total Rooms"
            value={total}
            icon={MessageSquare}
            iconColor="bg-blue-100 dark:bg-blue-900/30"
            description="Course chat rooms"
          />
          <StatsCard
            title="Active Rooms"
            value={activeRooms}
            icon={CheckCircle}
            iconColor="bg-green-100 dark:bg-green-900/30"
            description="Currently enabled"
          />
          <StatsCard
            title="Total Messages"
            value={totalMessages}
            icon={Users}
            iconColor="bg-purple-100 dark:bg-purple-900/30"
            description="Across all rooms"
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
          {loading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-border-dark">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Course</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Members</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Messages</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Created</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-border-dark">
                {rooms.map((room) => (
                  <RoomRow key={room.id} room={room} onToggle={handleToggle} onView={loadMessages} />
                ))}
                {rooms.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-16 text-center">
                      <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                      <p className="text-gray-500 dark:text-text-dark-secondary text-sm">No chat rooms yet</p>
                      <p className="text-gray-400 dark:text-text-dark-muted text-xs mt-1">
                        Chat rooms are created automatically when students enroll in courses
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6">
            <SimplePagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={loadRooms}
            />
          </div>
        )}
      </Container>
    </>
  );
}
