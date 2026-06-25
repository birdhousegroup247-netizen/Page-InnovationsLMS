import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { chatAPI } from '../lib/api';
import { getSocket } from '../lib/socket';
import { Spinner } from '../components/ui';
import { cn } from '../utils/cn';
import RoomSettingsPanel from '../components/chat/RoomSettingsPanel';
import {
  MessageSquare, Send, BookOpen, User, Clock, Users, ChevronRight,
  AlertCircle, Reply, X, AtSign, Paperclip, FileText, Search,
  SmilePlus, Smile, Pin, Forward, BellOff, Bell, CheckCheck, Settings,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  return isToday
    ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function Avatar({ name, picture, size = 'sm', online }) {
  const s = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className="relative flex-shrink-0">
      {picture
        ? <img src={picture} alt={name} className={cn('rounded-full object-cover', s)} />
        : <div className={cn('rounded-full bg-brand-blue text-white flex items-center justify-center font-semibold', s)}>
            {name?.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'}
          </div>
      }
      {online !== undefined && (
        <span className={cn('absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-dark-800',
          online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-dark-500')} />
      )}
    </div>
  );
}

function renderBody(body) {
  if (!body) return null;
  const parts = body.split(/(@\S+)/g);
  return parts.map((part, i) =>
    part.startsWith('@')
      ? <span key={i} className="font-semibold text-blue-400 dark:text-blue-300">{part.replace(/_/g, ' ')}</span>
      : <span key={i}>{part}</span>
  );
}

// ─── Quick emoji picker ────────────────────────────────────────────────────────

const QUICK_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👏'];

function EmojiPicker({ onSelect, onClose, align = 'right' }) {
  // align='right' → picker extends LEFT from the button's right edge
  //                  (good when the button sits at the right side of
  //                  a container — message bubble action row).
  // align='left'  → picker extends RIGHT from the button's left edge
  //                  (good when the button sits at the left side of
  //                  a container — the compose row's Smile button).
  return (
    <div className={cn(
      'absolute bottom-full mb-1 bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl shadow-xl p-2 z-30 flex gap-1',
      align === 'left' ? 'left-0' : 'right-0'
    )}>
      {QUICK_EMOJIS.map((emoji) => (
        <button key={emoji} type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(emoji); onClose(); }}
          className="w-8 h-8 text-lg hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg flex items-center justify-center transition-colors">
          {emoji}
        </button>
      ))}
    </div>
  );
}

// Wraps the picker with an anchor button + outside-click handler so
// it behaves like the announcement reaction tray. Keeps the compose
// row simple.
function ComposerEmojiButton({ open, setOpen, onSelect }) {
  const wrapRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [open, setOpen]);

  return (
    <div className="relative" ref={wrapRef}>
      <button type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        title="Add emoji"
        aria-label="Add emoji"
        aria-expanded={open}
        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors">
        <Smile className="w-4 h-4" />
      </button>
      {open && (
        <EmojiPicker
          align="left"
          onSelect={(emoji) => onSelect(emoji)}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

// ─── Reaction bar ──────────────────────────────────────────────────────────────

function ReactionBar({ reactions, userId, onToggle }) {
  if (!reactions?.length) return null;
  const grouped = reactions.reduce((acc, r) => {
    if (!acc[r.emoji]) acc[r.emoji] = { count: 0, reacted: false };
    acc[r.emoji].count++;
    if (r.user_id === userId) acc[r.emoji].reacted = true;
    return acc;
  }, {});
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {Object.entries(grouped).map(([emoji, { count, reacted }]) => (
        <button key={emoji} onClick={() => onToggle(emoji)}
          className={cn('flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border transition-colors',
            reacted
              ? 'bg-blue-100 dark:bg-blue-900/30 border-brand-blue text-brand-blue'
              : 'bg-gray-100 dark:bg-dark-700 border-gray-200 dark:border-border-dark text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-dark-600')}>
          <span>{emoji}</span><span>{count}</span>
        </button>
      ))}
    </div>
  );
}

// ─── Quoted reply preview ──────────────────────────────────────────────────────

function QuotedMessage({ replyTo, isOwn, onScrollTo }) {
  if (!replyTo) return null;
  const isDeleted = !!replyTo.deleted_at;
  const preview = isDeleted ? 'This message was deleted'
    : (replyTo.body?.length > 80 ? replyTo.body.slice(0, 80) + '…' : replyTo.body);
  return (
    <div onClick={!isDeleted ? () => onScrollTo(replyTo.id) : undefined}
      className={cn('flex gap-2 mb-1.5 px-3 py-2 rounded-lg border-l-2 text-xs',
        isDeleted ? 'opacity-60 cursor-default' : 'cursor-pointer hover:opacity-80 transition-opacity',
        isOwn ? 'bg-white/20 border-white/60' : 'bg-gray-100 dark:bg-dark-600 border-brand-blue')}>
      <div className="flex-1 min-w-0">
        <p className={cn('font-semibold truncate mb-0.5', isOwn ? 'text-white/90' : 'text-brand-blue')}>
          {isDeleted ? 'Deleted message' : (replyTo.sender?.full_name || 'Unknown')}
        </p>
        <p className={cn('truncate', isOwn ? 'text-white/70' : 'text-gray-500 dark:text-gray-400')}>
          {replyTo.attachment_url && !isDeleted ? '📎 Attachment' : renderBody(preview)}
        </p>
      </div>
    </div>
  );
}

// ─── Reply bar ─────────────────────────────────────────────────────────────────

function ReplyBar({ replyTo, onCancel }) {
  const isDeleted = !!replyTo.deleted_at;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 dark:bg-blue-900/10 border-t border-blue-100 dark:border-blue-900/30">
      <Reply className="w-4 h-4 text-brand-blue flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-brand-blue truncate">
          {isDeleted ? 'Deleted message' : `Replying to ${replyTo.sender?.full_name || 'Unknown'}`}
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {isDeleted ? 'This message was deleted' : (replyTo.attachment_url ? '📎 Attachment' : replyTo.body?.slice(0, 80))}
        </p>
      </div>
      <button onClick={onCancel} className="p-1 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/20 transition-colors flex-shrink-0">
        <X className="w-3.5 h-3.5 text-gray-500" />
      </button>
    </div>
  );
}

// ─── @mention dropdown ─────────────────────────────────────────────────────────

function MentionDropdown({ members, query, onSelect }) {
  const filtered = members.filter((m) => m.full_name.toLowerCase().includes(query.toLowerCase()));
  if (!filtered.length) return null;
  return (
    <div className="absolute bottom-full left-0 right-0 mb-1 bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto z-20">
      {filtered.slice(0, 8).map((m) => (
        <button key={m.id} type="button"
          onMouseDown={(e) => { e.preventDefault(); onSelect(m); }}
          className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-dark-700 text-left transition-colors">
          <Avatar name={m.full_name} picture={m.profile_picture} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{m.full_name}</p>
            <p className="text-xs text-gray-500 capitalize">{m.role}</p>
          </div>
          {m.role === 'instructor' && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">Instructor</span>
          )}
        </button>
      ))}
    </div>
  );
}

// ─── Forward modal ─────────────────────────────────────────────────────────────

function ForwardModal({ message, conversations, rooms, userId, onForward, onClose }) {
  const [search, setSearch] = useState('');
  const [forwarding, setForwarding] = useState(null);

  const allTargets = [
    ...rooms.map((r) => ({ id: r.id, type: 'room', label: r.course?.title || 'Course Room', icon: BookOpen })),
    ...conversations.map((c) => {
      const other = c.user_a === userId ? c.participant_b : c.participant_a;
      return { id: c.id, type: 'dm', label: other?.full_name || 'User', icon: User };
    }),
  ].filter((t) => t.label.toLowerCase().includes(search.toLowerCase()));

  const handleForward = async (target) => {
    setForwarding(target.id);
    await onForward(message, target);
    setForwarding(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm bg-white dark:bg-dark-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-border-dark">
          <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
            <Forward className="w-4 h-4 text-brand-blue" /> Forward message
          </h3>
          <button onClick={onClose}><X className="w-5 h-5 text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors" /></button>
        </div>
        <div className="px-4 py-3 border-b border-gray-100 dark:border-border-dark">
          <input value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rooms and people…"
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {allTargets.length === 0 && <p className="text-center text-gray-400 py-6 text-sm">No results</p>}
          {allTargets.map((t) => {
            const Icon = t.icon;
            return (
              <button key={`${t.type}-${t.id}`} onClick={() => handleForward(t)} disabled={forwarding === t.id}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-dark-700 text-left transition-colors disabled:opacity-50">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0',
                  t.type === 'room' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-blue-100 dark:bg-blue-900/30')}>
                  <Icon className={cn('w-4 h-4', t.type === 'room' ? 'text-emerald-600' : 'text-blue-600')} />
                </div>
                <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white truncate">{t.label}</span>
                {forwarding === t.id && <Spinner className="w-4 h-4" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Attachment preview ────────────────────────────────────────────────────────

function AttachmentPreview({ url, type }) {
  if (!url) return null;
  if (type === 'image') {
    return <img src={url} alt="attachment" className="mt-2 rounded-lg max-w-[240px] max-h-[200px] object-cover cursor-pointer" onClick={() => window.open(url, '_blank')} />;
  }
  return (
    <a href={url} target="_blank" rel="noreferrer"
      className="mt-2 flex items-center gap-2 bg-white/10 dark:bg-dark-600 border border-gray-200 dark:border-border-dark rounded-lg px-3 py-2 text-xs hover:bg-white/20 transition-colors">
      <FileText className="w-4 h-4 flex-shrink-0" /><span className="truncate">Document</span>
    </a>
  );
}

// ─── Pinned message banner ─────────────────────────────────────────────────────

function PinnedBanner({ message, onScrollTo }) {
  if (!message) return null;
  return (
    <button onClick={() => onScrollTo(message.id)}
      className="w-full flex items-center gap-2 px-4 py-2 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-100 dark:border-amber-900/20 text-left hover:bg-amber-100 transition-colors">
      <Pin className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 uppercase tracking-wider">Pinned message</p>
        <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{message.body || '📎 Attachment'}</p>
      </div>
    </button>
  );
}

// ─── Typing indicator ──────────────────────────────────────────────────────────

function TypingIndicator({ typers }) {
  if (!typers.length) return null;
  const names = typers.map((t) => t.userName).join(', ');
  return (
    <div className="flex items-center gap-2 px-4 py-1 text-xs text-gray-400">
      <span className="flex gap-0.5">
        {[0, 150, 300].map((d) => (
          <span key={d} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${d}ms` }} />
        ))}
      </span>
      <span>{names} {typers.length === 1 ? 'is' : 'are'} typing…</span>
    </div>
  );
}

// ─── Single message bubble ─────────────────────────────────────────────────────

function MessageBubble({ msg, isOwn, userId, onReply, onRegisterRef, onScrollTo, onReact, onPin, onForward, isLastOwn, seenBy }) {
  const [hovered, setHovered] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const canPin = onPin !== null;

  return (
    <div ref={(el) => onRegisterRef(msg.id, el)}
      className={cn('group flex gap-2 mb-3 rounded-xl px-1', isOwn ? 'flex-row-reverse' : 'flex-row')}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmoji(false); }}>
      {!isOwn && <Avatar name={msg.sender?.full_name} picture={msg.sender?.profile_picture} size="sm" />}

      <div className={cn('max-w-[70%] flex flex-col gap-0.5', isOwn ? 'items-end' : 'items-start')}>
        {!isOwn && (
          <span className="text-[11px] text-gray-500 px-1 flex items-center gap-1">
            {msg.sender?.full_name}
            {msg.sender?.role === 'instructor' && (
              <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-1 rounded">Instructor</span>
            )}
          </span>
        )}
        {msg.is_pinned && <span className="text-[10px] text-amber-600 dark:text-amber-400 flex items-center gap-0.5 px-1"><Pin className="w-2.5 h-2.5" />Pinned</span>}

        <div className={cn('px-4 py-2.5 rounded-2xl text-sm leading-relaxed',
          isOwn ? 'bg-brand-blue text-white rounded-tr-sm' : 'bg-white dark:bg-dark-700 text-gray-900 dark:text-white border border-gray-100 dark:border-border-dark rounded-tl-sm shadow-sm')}>
          {msg.reply_to && <QuotedMessage replyTo={msg.reply_to} isOwn={isOwn} onScrollTo={onScrollTo} />}
          {msg.body && <p className="whitespace-pre-wrap break-words">{renderBody(msg.body)}</p>}
          <AttachmentPreview url={msg.attachment_url} type={msg.attachment_type} />
        </div>

        <ReactionBar reactions={msg.reactions} userId={userId} onToggle={(emoji) => onReact(msg.id, emoji)} />

        <div className={cn('flex items-center gap-2 px-1 relative', isOwn ? 'flex-row-reverse' : 'flex-row')}>
          <span className="text-[10px] text-gray-400">{formatTime(msg.created_at)}</span>
          {isOwn && isLastOwn && seenBy && (
            <span className="text-[10px] text-blue-400 flex items-center gap-0.5"><CheckCheck className="w-3 h-3" />Seen</span>
          )}
          {hovered && (
            <>
              <button onClick={() => onReply(msg)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-brand-blue transition-colors">
                <Reply className="w-3 h-3" />Reply
              </button>
              <button onClick={() => onForward(msg)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-brand-blue transition-colors">
                <Forward className="w-3 h-3" />Forward
              </button>
              {canPin && (
                <button onClick={() => onPin(msg.id)} className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-amber-500 transition-colors">
                  <Pin className="w-3 h-3" />{msg.is_pinned ? 'Unpin' : 'Pin'}
                </button>
              )}
              <div className="relative">
                <button onMouseDown={(e) => { e.preventDefault(); setShowEmoji((v) => !v); }}
                  className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-brand-blue transition-colors">
                  <SmilePlus className="w-3 h-3" />
                </button>
                {showEmoji && <EmojiPicker onSelect={(emoji) => onReact(msg.id, emoji)} onClose={() => setShowEmoji(false)} />}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Chat window ───────────────────────────────────────────────────────────────

const PAGE_SIZE = 50;

function ChatWindow({ type, id, userId, title, subtitle, isInstructor, conversations, rooms, onForwardSent }) {
  const [messages, setMessages]         = useState([]);
  const [input, setInput]               = useState('');
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [hasMore, setHasMore]           = useState(false);
  const [sending, setSending]           = useState(false);
  const [error, setError]               = useState(null);
  const [replyTo, setReplyTo]           = useState(null);
  const [mentionQuery, setMentionQuery] = useState(null);
  const [mentionedUsers, setMentionedUsers] = useState([]);
  const [members, setMembers]           = useState([]);
  const [typers, setTypers]             = useState([]);
  const [attachFile, setAttachFile]     = useState(null);
  const [attachPreview, setAttachPreview] = useState(null);
  const [muted, setMuted]               = useState(false);
  const [pinnedMsg, setPinnedMsg]       = useState(null);
  const [forwardMsg, setForwardMsg]     = useState(null);
  const [seenAt, setSeenAt]             = useState(null); // timestamp when other person read
  const [roomDisabled, setRoomDisabled] = useState(false);
  const [composerEmojiOpen, setComposerEmojiOpen] = useState(false);

  // Insert an emoji at the textarea's caret. Restores focus +
  // caret position right after so the user can keep typing.
  const insertEmojiAtCaret = (emoji) => {
    const el = inputRef.current;
    const pos = el?.selectionStart ?? input.length;
    const next = input.slice(0, pos) + emoji + input.slice(pos);
    setInput(next);
    setTimeout(() => {
      if (!el) return;
      el.focus();
      const newPos = pos + emoji.length;
      el.setSelectionRange(newPos, newPos);
    }, 0);
  };

  const bottomRef    = useRef(null);
  const topRef       = useRef(null);
  const inputRef     = useRef(null);
  const messageRefs  = useRef({});
  const fileInputRef = useRef(null);
  const typingTimer  = useRef(null);
  const isTyping     = useRef(false);

  // ── Fetch initial messages ───────────────────────────────────────────────────
  const fetchMessages = useCallback(async () => {
    try {
      setLoading(true);
      const res = type === 'room'
        ? await chatAPI.getRoomMessages(id, { limit: PAGE_SIZE })
        : await chatAPI.getConversationMessages(id, { limit: PAGE_SIZE });
      const msgs = res.data?.data?.messages || [];
      setMessages(msgs);
      setHasMore(msgs.length === PAGE_SIZE);
      if (type === 'room') {
        const pinned = msgs.find((m) => m.is_pinned);
        setPinnedMsg(pinned || null);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load messages');
    } finally {
      setLoading(false);
    }
  }, [type, id]);

  useEffect(() => { fetchMessages(); }, [fetchMessages]);

  // ── Load older messages (infinite scroll) ────────────────────────────────────
  const loadOlder = useCallback(async () => {
    if (!hasMore || loadingMore || messages.length === 0) return;
    const oldest = messages[0];
    setLoadingMore(true);
    try {
      const res = type === 'room'
        ? await chatAPI.getRoomMessages(id, { limit: PAGE_SIZE, before: oldest.id })
        : await chatAPI.getConversationMessages(id, { limit: PAGE_SIZE, before: oldest.id });
      const older = res.data?.data?.messages || [];
      setMessages((prev) => [...older, ...prev]);
      setHasMore(older.length === PAGE_SIZE);
    } catch { /* silent */ } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, messages, type, id]);

  // IntersectionObserver on top sentinel
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) loadOlder(); }, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [loadOlder]);

  // ── Room members for @mention ────────────────────────────────────────────────
  useEffect(() => {
    if (type === 'room') {
      chatAPI.getRoomMembers(id).then((r) => setMembers(r.data?.data?.members || [])).catch(() => {});
    }
  }, [type, id]);

  // ── Mute status ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = type === 'room' ? { roomId: id } : { conversationId: id };
    chatAPI.getMuteStatus(params).then((r) => setMuted(r.data?.data?.muted || false)).catch(() => {});
  }, [type, id]);

  // ── Socket real-time ─────────────────────────────────────────────────────────
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.emit(type === 'room' ? 'join:room' : 'join:conversation', id);

    const onMessage = ({ message, roomId, conversationId }) => {
      // Loose-compare IDs because the backend may send numbers while
      // activeChat.id can be a string from the URL/state. With ===
      // every payload was rejected and the live feed silently froze
      // (especially noticeable on student↔instructor DMs).
      const matches =
        (type === 'room' && Number(roomId) === Number(id)) ||
        (type === 'dm' && Number(conversationId) === Number(id));
      if (!matches) return;
      setMessages((prev) => prev.find((m) => m.id === message.id) ? prev : [...prev, message]);
      if (message.is_pinned) setPinnedMsg(message);
      // Mark read immediately when the window is already open
      if (type === 'dm' && message.sender_id !== userId) {
        chatAPI.markConversationRead(id).catch(() => {});
        socket.emit('chat:read', { conversationId: id });
      }
    };

    const onReaction = ({ messageId, reactions }) =>
      setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));

    const onRead = ({ conversationId, readBy }) => {
      if (type === 'dm' && Number(conversationId) === Number(id) && readBy !== userId) setSeenAt(new Date());
    };

    const onPin = ({ roomId, messageId, is_pinned }) => {
      if (type === 'room' && Number(roomId) === Number(id)) {
        setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, is_pinned } : m));
        setMessages((prev) => {
          const pinned = prev.find((m) => m.id === messageId && is_pinned);
          if (pinned) setPinnedMsg(pinned);
          else if (!is_pinned) setPinnedMsg(null);
          return prev;
        });
      }
    };

    const onTyping = ({ userId: tid, userName }) =>
      setTypers((prev) => prev.find((t) => t.userId === tid) ? prev : [...prev, { userId: tid, userName }]);
    const onStop = ({ userId: tid }) => setTypers((prev) => prev.filter((t) => t.userId !== tid));
    const onDisabled = () => { setError('This chat room has been disabled by an admin'); setRoomDisabled(true); };
    const onMemberApproved = ({ roomId: rid }) => {
      if (type === 'room' && rid === id) {
        chatAPI.getRoomMembers(id).then((r) => setMembers(r.data?.data?.members || [])).catch(() => {});
      }
    };
    const onMemberRemoved = ({ roomId: rid, userId: uid }) => {
      if (type === 'room' && rid === id) setMembers((prev) => prev.filter((m) => m.id !== uid));
    };

    socket.on('chat:message', onMessage);
    socket.on('chat:reaction', onReaction);
    socket.on('chat:read', onRead);
    socket.on('chat:pin_update', onPin);
    socket.on('user:typing', onTyping);
    socket.on('user:stopped_typing', onStop);
    socket.on('chat:room_disabled', onDisabled);
    socket.on('chat:member_approved', onMemberApproved);
    socket.on('chat:member_removed', onMemberRemoved);

    return () => {
      socket.emit(type === 'room' ? 'leave:room' : 'leave:conversation', id);
      socket.off('chat:message', onMessage);
      socket.off('chat:reaction', onReaction);
      socket.off('chat:read', onRead);
      socket.off('chat:pin_update', onPin);
      socket.off('user:typing', onTyping);
      socket.off('user:stopped_typing', onStop);
      socket.off('chat:room_disabled', onDisabled);
      socket.off('chat:member_approved', onMemberApproved);
      socket.off('chat:member_removed', onMemberRemoved);
    };
  }, [type, id, userId]);

  // ── Scroll to bottom on new messages ────────────────────────────────────────
  useEffect(() => {
    if (!loadingMore) bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loadingMore]);

  // ── Escape ───────────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') { setReplyTo(null); setMentionQuery(null); setAttachFile(null); setAttachPreview(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const registerRef  = useCallback((msgId, el) => { if (el) messageRefs.current[msgId] = el; }, []);
  const scrollToMessage = useCallback((msgId) => {
    const el = messageRefs.current[msgId];
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.style.transition = 'background 0.3s';
    el.style.background = 'rgba(59,130,246,0.12)';
    setTimeout(() => { el.style.background = ''; }, 1200);
  }, []);

  // ── Typing ───────────────────────────────────────────────────────────────────
  const emitTyping = useCallback(() => {
    const socket = getSocket();
    if (!socket) return;
    const payload = type === 'room' ? { roomId: id } : { conversationId: id };
    if (!isTyping.current) { socket.emit('chat:typing', payload); isTyping.current = true; }
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => { socket.emit('chat:stop_typing', payload); isTyping.current = false; }, 2000);
  }, [type, id]);

  // ── @mention ─────────────────────────────────────────────────────────────────
  const handleInputChange = (e) => {
    const val = e.target.value;
    setInput(val);
    emitTyping();
    if (type !== 'room') return;
    const before = val.slice(0, e.target.selectionStart);
    const match = before.match(/(^|\s)@(\S*)$/);
    setMentionQuery(match ? match[2] : null);
    if (!val.trim()) setMentionedUsers([]);
  };

  const selectMention = (member) => {
    const cursor = inputRef.current?.selectionStart ?? input.length;
    const before = input.slice(0, cursor);
    const after  = input.slice(cursor);
    const tag = `@${member.full_name.replace(/\s+/g, '_')}`;
    const newBefore = before.replace(/(^|\s)@\S*$/, (m, prefix) => `${prefix}${tag} `);
    setInput(newBefore + after);
    setMentionedUsers((prev) => prev.find((u) => u.id === member.id) ? prev : [...prev, member]);
    setMentionQuery(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  // ── File attach ───────────────────────────────────────────────────────────────
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => setAttachPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else { setAttachPreview(null); }
  };

  // ── Send ──────────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    const body = input.trim();
    if (!body && !attachFile) return;
    if (sending) return;
    setSending(true);
    try {
      const fd = new FormData();
      if (body) fd.append('body', body);
      if (replyTo?.id) fd.append('reply_to_id', replyTo.id);
      if (attachFile) fd.append('attachment', attachFile);
      if (type === 'room') {
        fd.append('mention_ids', JSON.stringify(mentionedUsers.map((u) => u.id)));
        await chatAPI.sendRoomMessage(id, fd);
      } else {
        await chatAPI.sendDirectMessage(id, fd);
        const socket = getSocket();
        if (socket) socket.emit('chat:read', { conversationId: id });
      }
      setInput(''); setReplyTo(null); setMentionedUsers([]); setMentionQuery(null);
      setAttachFile(null); setAttachPreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      const socket = getSocket();
      if (socket) { const p = type === 'room' ? { roomId: id } : { conversationId: id }; socket.emit('chat:stop_typing', p); isTyping.current = false; }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send message');
    } finally { setSending(false); }
  };

  // ── React ─────────────────────────────────────────────────────────────────────
  const handleReact = async (messageId, emoji) => {
    try {
      const res = await chatAPI.toggleReaction(messageId, emoji);
      const { reactions } = res.data?.data || {};
      if (reactions) setMessages((prev) => prev.map((m) => m.id === messageId ? { ...m, reactions } : m));
    } catch { /* silent */ }
  };

  // ── Pin ───────────────────────────────────────────────────────────────────────
  const handlePin = async (messageId) => {
    try {
      const res = await chatAPI.pinMessage(messageId);
      const updated = res.data?.data?.message;
      if (updated) {
        setMessages((prev) => prev.map((m) => m.id === updated.id ? { ...m, is_pinned: updated.is_pinned } : m));
        setPinnedMsg(updated.is_pinned ? updated : null);
      }
    } catch { /* silent */ }
  };

  // ── Mute toggle ────────────────────────────────────────────────────────────────
  const handleMuteToggle = async () => {
    const payload = type === 'room' ? { roomId: id } : { conversationId: id };
    try {
      const res = await chatAPI.toggleMute(payload);
      setMuted(res.data?.data?.muted || false);
    } catch { /* silent */ }
  };

  // ── Forward ───────────────────────────────────────────────────────────────────
  const handleForwardSend = async (message, target) => {
    const fd = new FormData();
    const prefix = message.sender?.full_name ? `[Forwarded from ${message.sender.full_name}]\n` : '[Forwarded]\n';
    fd.append('body', prefix + (message.body || ''));
    try {
      if (target.type === 'room') await chatAPI.sendRoomMessage(target.id, fd);
      else await chatAPI.sendDirectMessage(target.id, fd);
      if (onForwardSent) onForwardSent();
    } catch { /* silent */ }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') { setReplyTo(null); setMentionQuery(null); setAttachFile(null); setAttachPreview(null); }
  };

  // Determine last own message for "Seen" receipt
  const lastOwnIdx = [...messages].reverse().findIndex((m) => m.sender_id === userId);
  const lastOwnId = lastOwnIdx >= 0 ? messages[messages.length - 1 - lastOwnIdx]?.id : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 dark:border-border-dark bg-white dark:bg-dark-800 flex-shrink-0">
        <div className={cn('w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0',
          type === 'room' ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-blue-100 dark:bg-blue-900/30')}>
          {type === 'room' ? <BookOpen className="w-5 h-5 text-emerald-600" /> : <User className="w-5 h-5 text-blue-600" />}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">{title}</h2>
          {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
        </div>
        <button onClick={handleMuteToggle} title={muted ? 'Unmute' : 'Mute notifications'}
          className="p-2 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors">
          {muted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </button>
      </div>

      {/* Pinned message */}
      {type === 'room' && pinnedMsg && (
        <PinnedBanner message={pinnedMsg} onScrollTo={scrollToMessage} />
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div ref={topRef} className="h-1" />
        {loadingMore && <div className="flex justify-center py-2"><Spinner /></div>}

        {loading && <div className="flex justify-center py-8"><Spinner /></div>}
        {error && !loading && (
          <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 dark:bg-red-900/10 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
          </div>
        )}
        {!loading && !error && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400 py-16">
            <MessageSquare className="w-10 h-10" />
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = msg.sender_id === userId;
          const isLastOwn = isOwn && msg.id === lastOwnId;
          return (
            <MessageBubble
              key={msg.id} msg={msg} isOwn={isOwn} userId={userId}
              onReply={setReplyTo} onRegisterRef={registerRef} onScrollTo={scrollToMessage}
              onReact={handleReact}
              onPin={type === 'room' && isInstructor ? handlePin : null}
              onForward={(m) => setForwardMsg(m)}
              isLastOwn={isLastOwn}
              seenBy={type === 'dm' && seenAt}
            />
          );
        })}

        <TypingIndicator typers={typers.filter((t) => t.userId !== userId)} />
        <div ref={bottomRef} />
      </div>

      {/* Attachment strip */}
      {attachFile && (
        <div className="flex items-center gap-3 px-4 py-2 bg-gray-50 dark:bg-dark-700 border-t border-gray-100 dark:border-border-dark">
          {attachPreview
            ? <img src={attachPreview} alt="preview" className="h-12 w-12 object-cover rounded-lg flex-shrink-0" />
            : <div className="h-12 w-12 bg-gray-200 dark:bg-dark-600 rounded-lg flex items-center justify-center flex-shrink-0"><FileText className="w-5 h-5 text-gray-500" /></div>}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-700 dark:text-gray-300 truncate">{attachFile.name}</p>
            <p className="text-[10px] text-gray-400">{(attachFile.size / 1024).toFixed(0)} KB</p>
          </div>
          <button onClick={() => { setAttachFile(null); setAttachPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}>
            <X className="w-4 h-4 text-gray-400 hover:text-red-500 transition-colors" />
          </button>
        </div>
      )}

      {/* Reply bar */}
      {replyTo && <ReplyBar replyTo={replyTo} onCancel={() => setReplyTo(null)} />}

      {/* Input */}
      <div className="flex items-end gap-2 px-4 py-4 border-t border-gray-100 dark:border-border-dark bg-white dark:bg-dark-800 flex-shrink-0 relative">
        {mentionQuery !== null && members.length > 0 && (
          <MentionDropdown members={members.filter((m) => m.id !== userId)} query={mentionQuery} onSelect={selectMention} />
        )}
        <input ref={fileInputRef} type="file" className="hidden"
          accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt"
          onChange={handleFileSelect} />
        <button type="button" onClick={() => fileInputRef.current?.click()}
          className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors" title="Attach file">
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Compose-emoji button — opens the same QUICK_EMOJIS tray
            used for message reactions and inserts the selected one
            at the textarea's caret. onMouseDown is preventDefault'd
            so the textarea doesn't lose focus before insertEmojiAtCaret
            reads selectionStart. */}
        <ComposerEmojiButton
          open={composerEmojiOpen}
          setOpen={setComposerEmojiOpen}
          onSelect={insertEmojiAtCaret}
        />
        {type === 'room' && (
          <button type="button"
            onClick={() => { const pos = inputRef.current?.selectionStart ?? input.length; setInput(input.slice(0, pos) + '@' + input.slice(pos)); setMentionQuery(''); setTimeout(() => inputRef.current?.focus(), 0); }}
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-gray-400 hover:text-brand-blue hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors" title="Mention someone">
            <AtSign className="w-4 h-4" />
          </button>
        )}
        <textarea ref={inputRef} rows={1} value={input} onChange={handleInputChange} onKeyDown={handleKeyDown}
          disabled={roomDisabled}
          placeholder={roomDisabled ? 'This room has been disabled' : replyTo ? 'Write your reply… (Enter to send, Esc to cancel)' : attachFile ? 'Add a caption…' : 'Type a message… (Enter to send)'}
          className="flex-1 resize-none rounded-xl border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors max-h-32 disabled:opacity-60 disabled:cursor-not-allowed"
          style={{ minHeight: '44px' }} />
        <button onClick={handleSend} disabled={roomDisabled || (!input.trim() && !attachFile) || sending}
          className={cn('w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 transition-all',
            (input.trim() || attachFile) && !sending ? 'bg-brand-blue text-white hover:bg-blue-600 shadow-sm' : 'bg-gray-100 dark:bg-dark-700 text-gray-400 cursor-not-allowed')}>
          {sending ? <Spinner className="w-4 h-4" /> : <Send className="w-4 h-4" />}
        </button>
      </div>

      {/* Forward modal */}
      {forwardMsg && (
        <ForwardModal message={forwardMsg} conversations={conversations} rooms={rooms}
          userId={userId} onForward={handleForwardSend} onClose={() => setForwardMsg(null)} />
      )}
    </div>
  );
}

// ─── Pending Requests Panel ────────────────────────────────────────────────────

function PendingRequests({ roomId, onClose }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [processing, setProcessing] = useState(null);

  useEffect(() => {
    chatAPI.getPendingRequests(roomId)
      .then((r) => setRequests(r.data?.data?.requests || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [roomId]);

  const handle = async (userId, action) => {
    setProcessing(userId);
    try {
      await chatAPI.handleJoinRequest(roomId, userId, action);
      setRequests((prev) => prev.filter((r) => r.user_id !== userId));
    } catch { /* silent */ } finally { setProcessing(null); }
  };

  return (
    <div className="border-t border-gray-100 dark:border-border-dark bg-amber-50 dark:bg-amber-900/10 px-6 py-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-400 flex items-center gap-2">
          <Clock className="w-4 h-4" />Pending Join Requests ({requests.length})
        </h3>
        <button onClick={onClose} className="text-xs text-gray-500 hover:text-gray-700">Hide</button>
      </div>
      {loading && <Spinner />}
      {!loading && requests.length === 0 && <p className="text-xs text-gray-500">No pending requests</p>}
      <div className="space-y-2">
        {requests.map((req) => (
          <div key={req.id} className="flex items-center gap-3 bg-white dark:bg-dark-700 rounded-lg px-3 py-2 shadow-sm">
            <Avatar name={req.user?.full_name} picture={req.user?.profile_picture} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{req.user?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{req.user?.email}</p>
            </div>
            <button disabled={processing === req.user_id} onClick={() => handle(req.user_id, 'approve')}
              className="text-xs font-medium px-3 py-1 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 transition-colors disabled:opacity-50">Approve</button>
            <button disabled={processing === req.user_id} onClick={() => handle(req.user_id, 'reject')}
              className="text-xs font-medium px-3 py-1 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 transition-colors disabled:opacity-50">Reject</button>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sidebar items ─────────────────────────────────────────────────────────────

function ConvItem({ conv, userId, isActive, onClick, onlineUsers }) {
  const other = conv.user_a === userId ? conv.participant_b : conv.participant_a;
  const isOnline = onlineUsers.has(other?.id);
  return (
    <button onClick={onClick} className={cn(
      'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors',
      isActive && 'bg-blue-50 dark:bg-dark-700 border-l-2 border-brand-blue')}>
      <Avatar name={other?.full_name} picture={other?.profile_picture} online={isOnline} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{other?.full_name}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400 truncate capitalize">
          {isOnline ? <span className="text-emerald-500">Online</span> : other?.role}
        </p>
      </div>
      {conv.unread_count > 0 && (
        <span className="bg-brand-blue text-white text-[10px] font-bold rounded-full px-1.5 py-0.5 min-w-[18px] text-center">{conv.unread_count}</span>
      )}
      {conv.last_message_at && <span className="text-[10px] text-gray-400 flex-shrink-0">{formatTime(conv.last_message_at)}</span>}
    </button>
  );
}

function RoomItem({ room, isActive, onClick }) {
  return (
    <button onClick={onClick} className={cn(
      'w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors',
      isActive && 'bg-blue-50 dark:bg-dark-700 border-l-2 border-brand-blue')}>
      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
        <BookOpen className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm text-gray-900 dark:text-white truncate">{room.course?.title}</p>
        <p className="text-xs text-gray-500">{room.members?.length ?? 0} member{room.members?.length !== 1 ? 's' : ''}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────

export default function Messages() {
  const { user } = useAuth();
  const [rooms, setRooms]               = useState([]);
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [activeChat, setActiveChat]     = useState(null);
  const [showRequests, setShowRequests] = useState(false);
  const [showRoomSettings, setShowRoomSettings] = useState(false);
  const [search, setSearch]             = useState('');
  const [onlineUsers, setOnlineUsers]   = useState(new Set());
  const [showNewDM, setShowNewDM]       = useState(false);
  const [dmSearch, setDmSearch]         = useState('');
  const [dmResults, setDmResults]       = useState([]);
  const [dmSearching, setDmSearching]   = useState(false);

  const isInstructor = user?.role === 'instructor';

  // Load rooms + convs
  useEffect(() => {
    chatAPI.getMyRooms()
      .then((r) => setRooms(r.data?.data?.rooms || []))
      .catch(() => {});
    chatAPI.getConversations()
      .then((r) => setConversations(r.data?.data?.conversations || []))
      .catch(() => {})
      .finally(() => setLoadingConvs(false));
  }, []);

  // Search coursemates for new DM — require at least 2 chars before fetching
  useEffect(() => {
    if (!showNewDM) return;
    if (dmSearch.trim().length < 2) {
      setDmResults([]);
      setDmSearching(false);
      return;
    }
    setDmSearching(true);
    const t = setTimeout(() => {
      chatAPI.searchCoursemates(dmSearch)
        .then((r) => setDmResults(r.data?.data?.users || []))
        .catch(() => setDmResults([]))
        .finally(() => setDmSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [dmSearch, showNewDM]);

  const startDM = async (targetUser) => {
    try {
      const res = await chatAPI.getOrCreateConversation(targetUser.id);
      const conv = res.data?.data?.conversation;
      if (conv) {
        setConversations((prev) => prev.find((c) => c.id === conv.id) ? prev : [conv, ...prev]);
        setActiveChat({ type: 'dm', id: conv.id, title: targetUser.full_name, subtitle: targetUser.role });
      }
    } catch { /* silent */ }
    setShowNewDM(false);
    setDmSearch('');
  };

  // Presence via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    // Server sends initial list on connect
    const onConnected = ({ onlineUsers: list = [] }) => setOnlineUsers(new Set(list));
    const onOnline  = ({ userId }) => setOnlineUsers((prev) => new Set([...prev, userId]));
    const onOffline = ({ userId }) => setOnlineUsers((prev) => { const s = new Set(prev); s.delete(userId); return s; });
    const onMsg = ({ message, conversationId }) => {
      if (!conversationId) return;
      setConversations((prev) =>
        prev.map((c) => c.id === conversationId
          ? { ...c, last_message_at: message.created_at, unread_count: activeChat?.id === conversationId ? 0 : (c.unread_count || 0) + 1 }
          : c)
      );
    };

    socket.on('connected', onConnected);
    socket.on('presence:online', onOnline);
    socket.on('presence:offline', onOffline);
    socket.on('chat:message', onMsg);

    return () => {
      socket.off('connected', onConnected);
      socket.off('presence:online', onOnline);
      socket.off('presence:offline', onOffline);
      socket.off('chat:message', onMsg);
    };
  }, [activeChat]);

  const openRoom = (room) => {
    setActiveChat({ type: 'room', id: room.id, roomId: room.id, title: room.course?.title || 'Course Chat', subtitle: `${room.members?.length ?? 0} members` });
    setShowRequests(false);
  };

  const openConv = (conv) => {
    const other = conv.user_a === user?.id ? conv.participant_b : conv.participant_a;
    setActiveChat({ type: 'dm', id: conv.id, title: other?.full_name || 'User', subtitle: other?.role });
    chatAPI.markConversationRead(conv.id).catch(() => {});
    setConversations((prev) => prev.map((c) => c.id === conv.id ? { ...c, unread_count: 0 } : c));
    const socket = getSocket();
    if (socket) socket.emit('chat:read', { conversationId: conv.id });
  };

  const totalUnread = conversations.reduce((s, c) => s + (c.unread_count || 0), 0);

  const filteredConvs = conversations.filter((c) => {
    const other = c.user_a === user?.id ? c.participant_b : c.participant_a;
    return other?.full_name?.toLowerCase().includes(search.toLowerCase());
  });
  const filteredRooms = rooms.filter((r) => r.course?.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="h-[calc(100vh-64px)] flex bg-gray-50 dark:bg-dark-900">
      {/* Sidebar */}
      <div className="w-72 flex-shrink-0 bg-white dark:bg-dark-800 border-r border-gray-100 dark:border-border-dark flex flex-col">
        <div className="px-6 py-5 border-b border-gray-100 dark:border-border-dark">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-brand-blue" />
              Messages
              {totalUnread > 0 && (
                <span className="ml-1 bg-brand-blue text-white text-[10px] font-bold rounded-full px-2 py-0.5">{totalUnread}</span>
              )}
            </h1>
            <button
              onClick={() => { setShowNewDM(true); setDmSearch(''); setDmResults([]); }}
              className="w-7 h-7 rounded-full bg-brand-blue text-white flex items-center justify-center hover:bg-blue-600 transition-colors text-lg font-bold"
              title="New direct message"
            >+</button>
          </div>
        </div>

        {/* New DM panel */}
        {showNewDM && (
          <div className="border-b border-gray-100 dark:border-border-dark bg-gray-50 dark:bg-dark-700 px-4 py-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">New Message</p>
              <button onClick={() => setShowNewDM(false)}><X className="w-4 h-4 text-gray-400 hover:text-gray-700" /></button>
            </div>
            <input
              autoFocus
              value={dmSearch}
              onChange={(e) => setDmSearch(e.target.value)}
              placeholder="Search classmates or instructor…"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-border-dark bg-white dark:bg-dark-800 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
            />
            <div className="mt-2 max-h-48 overflow-y-auto space-y-1">
              {dmSearching && <p className="text-xs text-gray-400 text-center py-2">Loading…</p>}
              {!dmSearching && dmSearch.trim().length < 2 && (
                <p className="text-xs text-gray-400 text-center py-3 leading-relaxed px-2">
                  Type a name to search your coursemates &amp; instructors.
                </p>
              )}
              {!dmSearching && dmSearch.trim().length >= 2 && dmResults.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">No coursemates found for "{dmSearch}"</p>
              )}
              {dmResults.map((u) => (
                <button key={u.id} onClick={() => startDM(u)}
                  className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-white dark:hover:bg-dark-600 text-left transition-colors">
                  <Avatar name={u.full_name} picture={u.profile_picture} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{u.full_name}</p>
                    <p className="text-xs text-gray-400 capitalize">{u.role}</p>
                  </div>
                  {u.role === 'instructor' && (
                    <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-1.5 py-0.5 rounded-full">Instructor</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-4 py-3 border-b border-gray-100 dark:border-border-dark">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div>
            <p className="px-4 pt-4 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> Course Rooms
            </p>
            {filteredRooms.length === 0 && !search && (
              <p className="px-4 py-2 text-xs text-gray-400 leading-relaxed">
                {isInstructor
                  ? 'No rooms yet. Chat rooms are created when your course is published.'
                  : <>No rooms yet.{' '}<a href="/courses" className="text-brand-blue hover:underline">Enroll in a course</a>{' '}to join its chat room.</>
                }
              </p>
            )}
            {filteredRooms.length === 0 && search && (
              <p className="px-4 py-2 text-xs text-gray-400">No rooms match your search</p>
            )}
            {filteredRooms.map((room) => (
              <RoomItem key={room.id} room={room}
                isActive={activeChat?.type === 'room' && activeChat?.id === room.id}
                onClick={() => openRoom(room)} />
            ))}
          </div>

          <div>
            <p className="px-4 pt-4 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1">
              <User className="w-3 h-3" /> Direct Messages
            </p>
            {loadingConvs && <div className="flex justify-center py-4"><Spinner /></div>}
            {!loadingConvs && filteredConvs.length === 0 && (
              <p className="px-4 py-3 text-xs text-gray-400">{search ? 'No results' : 'No conversations yet'}</p>
            )}
            {filteredConvs.map((conv) => (
              <ConvItem key={conv.id} conv={conv} userId={user?.id}
                isActive={activeChat?.type === 'dm' && activeChat?.id === conv.id}
                onClick={() => openConv(conv)} onlineUsers={onlineUsers} />
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeChat ? (
          <>
            {isInstructor && activeChat.type === 'room' && (
              <button
                onClick={() => setShowRoomSettings(true)}
                className="w-full flex items-center gap-2 px-6 py-2 bg-brand-blue/5 dark:bg-brand-blue/10 border-b border-brand-blue/20 dark:border-brand-blue/30 text-xs font-semibold text-brand-blue dark:text-cyan-400 hover:bg-brand-blue/10 transition-colors"
              >
                <Settings className="w-3.5 h-3.5" />
                Room settings — manage members, lock, report
                <ChevronRight className="w-3.5 h-3.5 ml-auto" />
              </button>
            )}
            <div className="flex-1 overflow-hidden">
              <ChatWindow
                key={`${activeChat.type}-${activeChat.id}`}
                type={activeChat.type} id={activeChat.id}
                userId={user?.id} title={activeChat.title} subtitle={activeChat.subtitle}
                isInstructor={isInstructor}
                conversations={conversations} rooms={rooms}
                onForwardSent={() => {}}
              />
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center">
              <MessageSquare className="w-7 h-7" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-600 dark:text-gray-300">Select a conversation</p>
              <p className="text-sm mt-1">Pick a course room or direct message from the left</p>
            </div>
            <p className="text-xs text-center max-w-xs leading-relaxed text-gray-400">
              Course rooms appear on the left once you enroll. Use the <strong className="text-gray-500">+</strong> button to message a classmate or instructor.
            </p>
          </div>
        )}
      </div>

      {/* Instructor moderation drawer for the active room */}
      {isInstructor && activeChat?.type === 'room' && (
        <RoomSettingsPanel
          roomId={activeChat.id}
          isOpen={showRoomSettings}
          onClose={() => setShowRoomSettings(false)}
        />
      )}
    </div>
  );
}
