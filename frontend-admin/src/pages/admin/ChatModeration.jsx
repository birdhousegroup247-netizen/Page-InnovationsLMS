import { useState, useEffect, useRef } from 'react';
import { chatAPI } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import {
  Button,
  Badge,
  Spinner,
  StatsCard,
} from '../../components/ui';
import { SimplePagination } from '../../components/ui/Pagination';
import { Container, PageHeader } from '../../components/layout';
import { cn } from '../../utils/cn';
import {
  MessageSquare, Users, Trash2, ChevronLeft, RefreshCw,
  CheckCircle, ShieldCheck, Send, Search, Plus, X, Mail,
} from 'lucide-react';

function formatDate(d) {
  return d ? new Date(d).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
}

// ─── Room Moderation components ───────────────────────────────────────────────

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
          <Button variant="outline" size="sm" onClick={() => onView(room)}>Messages</Button>
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
          {isDeleted && <Badge variant="danger" size="sm">Deleted</Badge>}
        </div>
        {msg.body && (
          <p className="text-sm text-gray-600 dark:text-text-dark-secondary break-words">{msg.body}</p>
        )}
        {msg.attachment_url && (
          <a href={msg.attachment_url} target="_blank" rel="noreferrer" className="text-xs text-brand-blue underline">
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

// ─── Room Moderation tab ──────────────────────────────────────────────────────

function RoomModeration() {
  const { showToast } = useToast();
  const [rooms, setRooms]       = useState([]);
  const [total, setTotal]       = useState(0);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [viewRoom, setViewRoom] = useState(null);
  const [messages, setMessages] = useState([]);
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
  const activeRooms = rooms.filter((r) => r.is_active).length;
  const totalMessages = rooms.reduce((sum, r) => sum + (r.message_count || 0), 0);

  if (viewRoom) {
    return (
      <div className="space-y-4">
        <Button variant="outline" size="sm" onClick={() => setViewRoom(null)}>
          <ChevronLeft className="w-4 h-4 mr-1" />
          Back to rooms
        </Button>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{viewRoom.course?.title}</h2>
            <p className="text-sm text-gray-500">{messages.length} message{messages.length !== 1 ? 's' : ''} · Admin view</p>
          </div>
        </div>
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
          {msgLoading ? (
            <div className="flex justify-center py-12"><Spinner size="lg" /></div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">No messages in this room</p>
            </div>
          ) : (
            messages.map((msg) => <MessageRow key={msg.id} msg={msg} onDelete={handleDelete} />)
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Course Chat Rooms</h2>
          <p className="text-sm text-gray-500 mt-0.5">Monitor and manage all course chat rooms</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => loadRooms(page)}>
          <RefreshCw className="w-4 h-4 mr-2" />Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatsCard title="Total Rooms" value={total} icon={MessageSquare}
          iconColor="bg-blue-100 dark:bg-blue-900/30" description="Course chat rooms" />
        <StatsCard title="Active Rooms" value={activeRooms} icon={CheckCircle}
          iconColor="bg-green-100 dark:bg-green-900/30" description="Currently enabled" />
        <StatsCard title="Total Messages" value={totalMessages} icon={Users}
          iconColor="bg-purple-100 dark:bg-purple-900/30" description="Across all rooms" />
      </div>

      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size="lg" /></div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-border-dark">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Course</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Members</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Messages</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
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
                    <p className="text-gray-500 text-sm">No chat rooms yet</p>
                    <p className="text-gray-400 text-xs mt-1">Chat rooms are created automatically when students enroll</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {totalPages > 1 && (
        <SimplePagination currentPage={page} totalPages={totalPages} onPageChange={loadRooms} />
      )}
    </div>
  );
}

// ─── Support Inbox tab ────────────────────────────────────────────────────────

function SupportInbox() {
  const { user: adminUser } = useAuth();
  const { showToast } = useToast();
  const [conversations, setConversations] = useState([]);
  const [convLoading, setConvLoading]     = useState(true);
  const [activeConv, setActiveConv]       = useState(null);
  const [messages, setMessages]           = useState([]);
  const [msgLoading, setMsgLoading]       = useState(false);
  const [input, setInput]                 = useState('');
  const [sending, setSending]             = useState(false);
  const [search, setSearch]               = useState('');
  const [showNewDM, setShowNewDM]         = useState(false);
  const [dmSearch, setDmSearch]           = useState('');
  const [dmResults, setDmResults]         = useState([]);
  const [dmSearching, setDmSearching]     = useState(false);
  const bottomRef = useRef(null);

  const getOther = (conv) => {
    if (!conv) return null;
    const aIsAdmin = ['admin', 'super_admin'].includes(conv.participant_a?.role);
    return aIsAdmin ? conv.participant_b : conv.participant_a;
  };

  const loadConversations = async () => {
    try {
      const r = await chatAPI.getConversations();
      setConversations(r.data?.data?.conversations || []);
    } catch { /* silent */ } finally {
      setConvLoading(false);
    }
  };

  useEffect(() => { loadConversations(); }, []);

  const openConv = async (conv) => {
    setActiveConv(conv);
    setMsgLoading(true);
    try {
      const r = await chatAPI.getConversationMessages(conv.id);
      setMessages(r.data?.data?.messages || []);
    } catch {
      setMessages([]);
    } finally {
      setMsgLoading(false);
    }
  };

  const refreshMessages = async () => {
    if (!activeConv) return;
    setMsgLoading(true);
    try {
      const r = await chatAPI.getConversationMessages(activeConv.id);
      setMessages(r.data?.data?.messages || []);
    } catch { /* silent */ } finally {
      setMsgLoading(false);
    }
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      const r = await chatAPI.sendMessage(activeConv.id, input.trim());
      const msg = r.data?.data?.message;
      if (msg) {
        setMessages((prev) => [...prev, msg]);
        setConversations((prev) => prev.map((c) =>
          c.id === activeConv.id ? { ...c, last_message_at: msg.created_at } : c
        ));
      }
      setInput('');
    } catch {
      showToast('Failed to send message', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // DM user search with debounce
  useEffect(() => {
    if (!showNewDM || !dmSearch.trim()) { setDmResults([]); setDmSearching(false); return; }
    setDmSearching(true);
    const t = setTimeout(() => {
      chatAPI.searchUsers(dmSearch)
        .then((r) => setDmResults(r.data?.data?.users || []))
        .catch(() => setDmResults([]))
        .finally(() => setDmSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [dmSearch, showNewDM]);

  const startDM = async (targetUser) => {
    try {
      const r = await chatAPI.getOrCreateConversation(targetUser.id);
      const conv = r.data?.data?.conversation;
      if (conv) {
        await loadConversations();
        // Find the full conv with participant data loaded
        const freshConvs = await chatAPI.getConversations();
        const all = freshConvs.data?.data?.conversations || [];
        setConversations(all);
        const found = all.find((c) => c.id === conv.id);
        if (found) openConv(found);
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to start conversation', 'error');
    }
    setShowNewDM(false);
    setDmSearch('');
    setDmResults([]);
  };

  const initials = (name) => name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';

  const filteredConvs = conversations.filter((c) => {
    const other = getOther(c);
    return !search || other?.full_name?.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-260px)] min-h-[480px] md:h-[640px] bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">

      {/* Left: conversation list — full width on mobile when no conv selected,
          hidden when one is open (replaced by the thread). Side panel on md+. */}
      <div
        className={cn(
          'md:w-72 md:flex-shrink-0 border-r border-gray-100 dark:border-border-dark flex-col',
          activeConv ? 'hidden md:flex' : 'flex flex-1 md:flex-initial'
        )}
      >
        <div className="px-4 py-4 border-b border-gray-100 dark:border-border-dark space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">Support Inbox</h3>
            <button
              onClick={() => { setShowNewDM((v) => !v); setDmSearch(''); setDmResults([]); }}
              className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center hover:bg-blue-600 transition-colors"
              title="New message"
            >
              {showNewDM ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name…"
              className="w-full pl-8 pr-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
            />
          </div>
        </div>

        {/* New DM search panel */}
        {showNewDM && (
          <div className="border-b border-gray-100 dark:border-border-dark bg-gray-50 dark:bg-dark-700 px-4 py-3">
            <input
              autoFocus
              value={dmSearch}
              onChange={(e) => setDmSearch(e.target.value)}
              placeholder="Search students or instructors…"
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 dark:border-border-dark bg-white dark:bg-dark-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-brand-blue/30"
            />
            <div className="mt-2 max-h-40 overflow-y-auto space-y-0.5">
              {dmSearching && <p className="text-xs text-gray-400 text-center py-2">Searching…</p>}
              {!dmSearching && !dmSearch && <p className="text-xs text-gray-400 text-center py-2">Type a name to search</p>}
              {!dmSearching && dmSearch && dmResults.length === 0 && <p className="text-xs text-gray-400 text-center py-2">No results</p>}
              {dmResults.map((u) => (
                <button
                  key={u.id}
                  onClick={() => startDM(u)}
                  className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-white dark:hover:bg-dark-600 text-left transition-colors"
                >
                  <div className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {initials(u.full_name)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{u.full_name}</p>
                    <p className="text-[10px] text-gray-400 capitalize">{u.role}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto">
          {convLoading && <div className="flex justify-center py-6"><Spinner /></div>}
          {!convLoading && filteredConvs.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-2">
              <Mail className="w-8 h-8" />
              <p className="text-xs">No conversations yet</p>
              <p className="text-[11px] text-center px-4">Click + to message a student or instructor</p>
            </div>
          )}
          {filteredConvs.map((conv) => {
            const other = getOther(conv);
            const isActive = activeConv?.id === conv.id;
            return (
              <button
                key={conv.id}
                onClick={() => openConv(conv)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors border-b border-gray-50 dark:border-border-dark',
                  isActive && 'bg-blue-50 dark:bg-dark-700 border-l-2 border-l-brand-blue'
                )}
              >
                <div className="w-9 h-9 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-semibold flex-shrink-0">
                  {initials(other?.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{other?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-gray-400 capitalize truncate">{other?.role}</p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="w-5 h-5 bg-brand-blue text-white text-[10px] font-bold rounded-full flex items-center justify-center flex-shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Right: message thread — hidden until a conv is chosen on mobile,
          always visible on md+ (shows empty-state when nothing selected). */}
      <div
        className={cn(
          'flex-1 flex-col overflow-hidden',
          activeConv ? 'flex' : 'hidden md:flex'
        )}
      >
        {activeConv ? (
          <>
            {/* Thread header */}
            {(() => {
              const other = getOther(activeConv);
              return (
                <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-100 dark:border-border-dark flex items-center justify-between bg-white dark:bg-dark-800 flex-shrink-0 gap-2">
                  <div className="flex items-center gap-2 md:gap-3 min-w-0">
                    {/* Mobile back-to-list */}
                    <button
                      onClick={() => setActiveConv(null)}
                      className="md:hidden p-1.5 text-gray-500 dark:text-gray-400 hover:text-brand-blue rounded-lg flex-shrink-0"
                      title="Back to inbox"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="w-9 h-9 rounded-full bg-brand-blue/10 text-brand-blue flex items-center justify-center text-sm font-semibold flex-shrink-0">
                      {initials(other?.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{other?.full_name || 'Unknown'}</p>
                      <p className="text-xs text-gray-400 capitalize truncate">{other?.role}</p>
                    </div>
                  </div>
                  <button
                    onClick={refreshMessages}
                    className="p-1.5 text-gray-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/10 rounded-lg transition-colors flex-shrink-0"
                    title="Refresh"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              );
            })()}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {msgLoading ? (
                <div className="flex justify-center py-8"><Spinner /></div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-2">
                  <MessageSquare className="w-8 h-8" />
                  <p className="text-sm">No messages yet. Start the conversation.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((msg) => {
                    const isOwn = msg.sender_id === adminUser?.id;
                    return (
                      <div key={msg.id} className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}>
                        <div className={cn(
                          'max-w-[72%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
                          isOwn
                            ? 'bg-brand-blue text-white rounded-tr-sm'
                            : 'bg-gray-100 dark:bg-dark-700 text-gray-900 dark:text-white rounded-tl-sm'
                        )}>
                          {!isOwn && (
                            <p className="text-[10px] font-semibold mb-1 opacity-70">{msg.sender?.full_name}</p>
                          )}
                          <p className="whitespace-pre-wrap break-words">{msg.body}</p>
                          {msg.attachment_url && (
                            <a href={msg.attachment_url} target="_blank" rel="noreferrer"
                              className={cn('text-[11px] underline mt-1 block', isOwn ? 'text-white/80' : 'text-brand-blue')}>
                              View attachment
                            </a>
                          )}
                          <p className={cn('text-[10px] mt-1', isOwn ? 'text-white/60' : 'text-gray-400')}>
                            {(() => {
                              const raw = msg.created_at || msg.createdAt;
                              const d = raw ? new Date(raw) : null;
                              return d && !Number.isNaN(d.getTime())
                                ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                                : '';
                            })()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>

            {/* Input */}
            <div className="flex items-end gap-2 px-4 py-4 border-t border-gray-100 dark:border-border-dark bg-white dark:bg-dark-800 flex-shrink-0">
              <textarea
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a message… (Enter to send)"
                className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
                style={{ minHeight: '44px', maxHeight: '120px' }}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || sending}
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
                  input.trim() && !sending
                    ? 'bg-brand-blue text-white hover:bg-blue-600 shadow-sm'
                    : 'bg-gray-100 dark:bg-dark-700 text-gray-400 cursor-not-allowed'
                )}
              >
                {sending ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 gap-3">
            <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
              <Mail className="w-6 h-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">No conversation selected</p>
              <p className="text-xs mt-1">Pick one from the left or click + to start a new message</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ChatModeration() {
  const [tab, setTab] = useState('rooms');

  return (
    <>
      <PageHeader
        icon={ShieldCheck}
        title="Chat Moderation"
        subtitle="Monitor rooms · Moderate messages · Support users"
      />

      <Container className="py-8">
        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-dark-700 rounded-xl w-fit mb-8">
          {[
            { id: 'rooms', label: 'Chat Rooms', icon: MessageSquare },
            { id: 'inbox', label: 'Support Inbox', icon: Mail },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                tab === id
                  ? 'bg-white dark:bg-dark-800 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'rooms' && <RoomModeration />}
        {tab === 'inbox' && <SupportInbox />}
      </Container>
    </>
  );
}
