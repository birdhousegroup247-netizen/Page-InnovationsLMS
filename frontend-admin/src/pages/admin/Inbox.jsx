import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Search,
  Plus,
  X,
  ArrowLeft,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { chatAPI } from '../../lib/api';
import { getSocket, connectSocket } from '../../lib/socket';
import { tokenStorage } from '../../utils/tokenStorage';
import { Container, PageHeader } from '../../components/layout';
import { Button, Spinner } from '../../components/ui';
import { cn } from '../../utils/cn';

/**
 * Admin Inbox — direct messages between an admin and any
 * instructor / student. Uses the same /api/chat endpoints the student app
 * does. Course-room chat moderation is a separate page (/chat).
 *
 * Layout: two-column on desktop (threads left, conversation right), single
 * pane on mobile (list collapses when a thread is open, back button returns).
 */

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Avatar({ name, picture, size = 'md' }) {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  const initials = name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?';
  if (picture) {
    return <img src={picture} alt={name} className={cn('rounded-full object-cover flex-shrink-0', s)} />;
  }
  return (
    <div className={cn('rounded-full bg-brand-blue text-white flex items-center justify-center font-semibold flex-shrink-0', s)}>
      {initials}
    </div>
  );
}

function roleLabel(role) {
  if (role === 'instructor') return 'Instructor';
  if (role === 'student') return 'Student';
  if (role === 'admin' || role === 'super_admin') return 'Admin';
  return role || '';
}

export default function Inbox() {
  const { user: me } = useAuth();
  const myId = me?.id;

  const [conversations, setConversations] = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const messagesEndRef = useRef(null);
  // Conversation ids currently in the sidebar — lets the socket effect
  // detect brand-new threads without depending on `conversations` state.
  const knownConvIds = useRef(new Set());

  // Helper: derive "the other person" from a conversation row
  const otherUser = useCallback(
    (conv) => (conv?.participant_a?.id === myId ? conv?.participant_b : conv?.participant_a),
    [myId]
  );

  const selectedConv = conversations.find((c) => c.id === selectedId);
  const selectedOther = selectedConv ? otherUser(selectedConv) : null;

  // ─── Threads list ────────────────────────────────────────────────────────
  const loadConversations = useCallback(async () => {
    setLoadingThreads(true);
    try {
      const r = await chatAPI.getConversations();
      const list = r.data?.data?.conversations || [];
      setConversations(list);
      knownConvIds.current = new Set(list.map((c) => Number(c.id)));
    } catch { /* silent */ }
    setLoadingThreads(false);
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // ─── Messages for the selected thread ────────────────────────────────────
  const loadMessages = useCallback(async (convId) => {
    if (!convId) return;
    setLoadingMessages(true);
    try {
      const r = await chatAPI.getConversationMessages(convId);
      setMessages(r.data?.data?.messages || []);
      // Mark read so the unread badge clears
      chatAPI.markConversationRead(convId).catch(() => {});
      // Optimistically zero the unread count in the list
      setConversations((prev) => prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c)));
    } catch { /* silent */ }
    setLoadingMessages(false);
  }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
  }, [selectedId, loadMessages]);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [messages.length]);

  // ─── Real-time: incoming student messages ────────────────────────────────
  // The Inbox had no socket at all — an admin sitting on a conversation
  // never saw the student's replies until they reloaded.
  useEffect(() => {
    const socket = getSocket() || connectSocket(tokenStorage.get('accessToken'));
    if (!socket) return;

    const joinChannel = () => {
      if (selectedId) socket.emit('join:conversation', selectedId);
    };
    joinChannel();
    // Server-side channel membership dies with the socket session — after
    // any reconnect we must re-join or the live feed silently stops.
    socket.on('connect', joinChannel);

    const onMessage = ({ message, conversationId }) => {
      if (!conversationId || !message) return;
      if (Number(conversationId) === Number(selectedId)) {
        setMessages((prev) => (prev.find((m) => m.id === message.id) ? prev : [...prev, message]));
        if (message.sender_id !== myId) {
          chatAPI.markConversationRead(selectedId).catch(() => {});
        }
      }
      // Bump the thread in the list either way
      setConversations((prev) =>
        prev.map((c) => (c.id === Number(conversationId)
          ? {
              ...c,
              last_message_at: message.created_at,
              unread_count: Number(conversationId) === Number(selectedId) ? 0 : (c.unread_count || 0) + 1,
            }
          : c))
      );
    };

    // A DM in a conversation not yet in the sidebar (brand-new thread).
    // Uses the ref (not state) so this effect doesn't depend on
    // `conversations` and churn leave/join on every message.
    const onNewDm = ({ conversationId }) => {
      if (!knownConvIds.current.has(Number(conversationId))) {
        loadConversations();
      }
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:new_dm', onNewDm);

    return () => {
      if (selectedId) socket.emit('leave:conversation', selectedId);
      socket.off('connect', joinChannel);
      socket.off('chat:message', onMessage);
      socket.off('chat:new_dm', onNewDm);
    };
  }, [selectedId, myId, loadConversations]);

  // ─── Send ────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const trimmed = body.trim();
    if (!trimmed || !selectedId || sending) return;
    setSending(true);
    try {
      const r = await chatAPI.sendMessage(selectedId, trimmed);
      const msg = r.data?.data?.message;
      if (msg) setMessages((prev) => [...prev, msg]);
      setBody('');
      // Bump the thread to the top of the list
      setConversations((prev) => {
        const conv = prev.find((c) => c.id === selectedId);
        if (!conv) return prev;
        const updated = { ...conv, last_message_at: new Date().toISOString() };
        return [updated, ...prev.filter((c) => c.id !== selectedId)];
      });
    } catch { /* silent */ }
    setSending(false);
  };

  const onComposerKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Start new conversation ──────────────────────────────────────────────
  const handleStartConversation = async (targetUser) => {
    try {
      const r = await chatAPI.getOrCreateConversation(targetUser.id);
      const conv = r.data?.data?.conversation;
      if (!conv) return;
      // If it's already in the list, just select; otherwise prepend
      setConversations((prev) => {
        const exists = prev.find((c) => c.id === conv.id);
        if (exists) return prev;
        // Build a list-shaped row from the returned conv + the user we picked
        const myParticipant = { id: myId, full_name: me?.full_name, profile_picture: me?.profile_picture, role: me?.role };
        const hydrated = {
          ...conv,
          participant_a: conv.user_a === myId ? myParticipant : targetUser,
          participant_b: conv.user_b === myId ? myParticipant : targetUser,
          unread_count: 0,
        };
        return [hydrated, ...prev];
      });
      setSelectedId(conv.id);
      setNewDialogOpen(false);
    } catch { /* silent */ }
  };

  return (
    <>
      <PageHeader
        icon={MessageSquare}
        title="Inbox"
        subtitle="Direct messages with instructors and students"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNewDialogOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
          >
            New message
          </Button>
        }
      />

      <Container className="py-6">
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden grid grid-cols-1 md:grid-cols-[320px_1fr] min-h-[60vh] md:h-[70vh]">
          {/* Threads list */}
          <aside
            className={cn(
              'border-r border-gray-200 dark:border-dark-700 flex flex-col',
              selectedId ? 'hidden md:flex' : 'flex'
            )}
          >
            <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-700 flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Conversations</h2>
              <span className="text-xs text-gray-500 dark:text-gray-400">{conversations.length}</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingThreads ? (
                <div className="p-8 flex justify-center"><Spinner /></div>
              ) : conversations.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500 dark:text-gray-400">
                  No conversations yet.
                  <button
                    onClick={() => setNewDialogOpen(true)}
                    className="block mt-3 mx-auto text-brand-blue hover:underline"
                  >
                    Start one
                  </button>
                </div>
              ) : (
                <ul>
                  {conversations.map((conv) => {
                    const other = otherUser(conv);
                    const active = selectedId === conv.id;
                    return (
                      <li key={conv.id}>
                        <button
                          onClick={() => setSelectedId(conv.id)}
                          className={cn(
                            'w-full text-left px-4 py-3 flex items-start gap-3 border-b border-gray-100 dark:border-dark-700 transition-colors',
                            active
                              ? 'bg-blue-50 dark:bg-blue-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-dark-700/50'
                          )}
                        >
                          <Avatar name={other?.full_name} picture={other?.profile_picture} size="md" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {other?.full_name || 'Unknown'}
                              </p>
                              {conv.last_message_at && (
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 flex-shrink-0">
                                  {formatTime(conv.last_message_at)}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between gap-2 mt-0.5">
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {roleLabel(other?.role)}
                              </p>
                              {conv.unread_count > 0 && (
                                <span className="bg-brand-blue text-white text-[10px] font-semibold rounded-full px-1.5 py-0.5 min-w-[18px] text-center flex-shrink-0">
                                  {conv.unread_count}
                                </span>
                              )}
                            </div>
                          </div>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </aside>

          {/* Conversation pane */}
          <section className={cn('flex flex-col min-h-0', selectedId ? 'flex' : 'hidden md:flex')}>
            {selectedId && selectedOther ? (
              <>
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 dark:border-dark-700 flex items-center gap-3">
                  <button
                    onClick={() => setSelectedId(null)}
                    className="md:hidden p-1 -ml-1 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    aria-label="Back to conversations"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <Avatar name={selectedOther.full_name} picture={selectedOther.profile_picture} size="sm" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                      {selectedOther.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {roleLabel(selectedOther.role)}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50 dark:bg-dark-900/40">
                  {loadingMessages ? (
                    <div className="flex justify-center py-8"><Spinner /></div>
                  ) : messages.length === 0 ? (
                    <div className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                      No messages yet. Say hello.
                    </div>
                  ) : (
                    messages.map((m) => {
                      const mine = m.sender_id === myId;
                      return (
                        <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                          <div
                            className={cn(
                              'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                              mine
                                ? 'bg-brand-blue text-white rounded-br-md'
                                : 'bg-white dark:bg-dark-700 text-gray-900 dark:text-white border border-gray-200 dark:border-dark-600 rounded-bl-md'
                            )}
                          >
                            <p className="whitespace-pre-wrap break-words">{m.body}</p>
                            <p className={cn('text-[10px] mt-1', mine ? 'text-white/70' : 'text-gray-400 dark:text-gray-500')}>
                              {formatTime(m.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Composer */}
                <div className="border-t border-gray-200 dark:border-dark-700 p-3 flex gap-2">
                  <textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    onKeyDown={onComposerKeyDown}
                    placeholder="Write a message…"
                    rows={1}
                    className="flex-1 resize-none px-3 py-2 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 text-gray-900 dark:text-white rounded-lg text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                  <button
                    onClick={handleSend}
                    disabled={!body.trim() || sending}
                    className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-light text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 flex-shrink-0"
                  >
                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    <span className="hidden sm:inline">Send</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <MessageSquare className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-3" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Pick a conversation, or start a new one.
                </p>
                <Button
                  className="mt-4"
                  onClick={() => setNewDialogOpen(true)}
                  leftIcon={<Plus className="w-4 h-4" />}
                >
                  New message
                </Button>
              </div>
            )}
          </section>
        </div>
      </Container>

      {newDialogOpen && (
        <NewMessageDialog
          onClose={() => setNewDialogOpen(false)}
          onPick={handleStartConversation}
        />
      )}
    </>
  );
}

// ─── New message dialog ───────────────────────────────────────────────────────

function NewMessageDialog({ onClose, onPick }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search
  useEffect(() => {
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await chatAPI.searchUsers(q);
        if (!cancelled) setResults(r.data?.data?.users || []);
      } catch {
        if (!cancelled) setResults([]);
      }
      if (!cancelled) setSearching(false);
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q]);

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-start sm:items-center justify-center p-4">
      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-dark-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">New message</h2>
          <button
            onClick={onClose}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-3 border-b border-gray-200 dark:border-dark-700">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name or email…"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 text-gray-900 dark:text-white rounded-lg text-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {searching ? (
            <div className="p-6 flex justify-center"><Spinner /></div>
          ) : results.length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
              No matches.
            </div>
          ) : (
            <ul>
              {results.map((u) => (
                <li key={u.id}>
                  <button
                    onClick={() => onPick(u)}
                    className="w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors border-b border-gray-100 dark:border-dark-700"
                  >
                    <Avatar name={u.full_name} picture={u.profile_picture} size="sm" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.full_name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {roleLabel(u.role)} · {u.email}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
