import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useToast } from '../ui/Toast';
import { useAuth } from '../../contexts/AuthContext';
import { getNavigationItems } from '../../utils/navigationItems.jsx';
import { getActiveView, canTeach } from '../../utils/authz';
import { chatAPI, notificationsAPI } from '../../lib/api';
import { tokenStorage } from '../../utils/tokenStorage';
import { connectSocket, getSocket } from '../../lib/socket';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Modal, Button } from '../ui';
import PaymentBanner from '../ui/PaymentBanner';
import SuspensionModal from '../ui/SuspensionModal';
import BirthdayCelebration from '../birthday/BirthdayCelebration';
import { LogOut } from 'lucide-react';

/**
 * AppLayout - Main authenticated layout wrapper
 * Includes Sidebar, Topbar, and handles mobile menu state
 * Fully responsive with mobile menu toggle
 */
export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Which nav to show is driven by the active VIEW + teaching capability —
  // not the primary role (dual-role approved instructors keep role='student').
  // The old code checked role==='instructor' here and even DELETED the
  // instructor view for them, which broke the instructor sidebar entirely.
  const activeView = getActiveView(user);
  const selectedRole = (activeView === 'instructor' && canTeach(user)) ? 'instructor' : 'student';

  const location = useLocation();
  const { showToast } = useToast();

  // Pull the combined DM + @mention unread count from the dedicated
  // endpoint. Refetched on focus, on socket events, and as a periodic
  // poll so the badge never goes stale.
  const refreshUnread = useCallback(() => {
    chatAPI.getUnreadSummary()
      .then((r) => setUnreadCount(r.data?.data?.total || 0))
      .catch(() => {});
  }, []);

  // Connect socket and do the first fetch
  useEffect(() => {
    if (!user) return;

    const token = tokenStorage.get('accessToken');
    if (token) connectSocket(token);

    refreshUnread();
    notificationsAPI.getUnreadCount()
      .then((r) => setNotifCount(r.data?.data?.count || 0))
      .catch(() => {});
  }, [user, refreshUnread]);

  // Live updates: notifications, new DMs, room @mentions.
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const onNotif = () => setNotifCount((n) => n + 1);

    const onNewDm = (payload) => {
      refreshUnread();
      // Only toast if the user isn't already on /messages — otherwise
      // they're seeing the conversation directly and the popup is noise.
      if (!location.pathname.startsWith('/messages')) {
        const name = payload?.sender?.full_name || 'Someone';
        showToast(`${name}: ${payload?.preview || 'new message'}`, 'info');
      }
    };

    const onMention = (payload) => {
      refreshUnread();
      if (!location.pathname.startsWith('/messages')) {
        const name = payload?.sender?.full_name || 'Someone';
        showToast(`${name} mentioned you: ${payload?.preview || ''}`.trim(), 'info');
      }
    };

    // Room chatter refreshes the badge silently — no toast, a busy
    // course room would be unbearable otherwise.
    const onRoomActivity = () => refreshUnread();

    socket.on('notification', onNotif);
    socket.on('chat:new_dm', onNewDm);
    socket.on('chat:mention', onMention);
    socket.on('chat:room_activity', onRoomActivity);
    return () => {
      socket.off('notification', onNotif);
      socket.off('chat:new_dm', onNewDm);
      socket.off('chat:mention', onMention);
      socket.off('chat:room_activity', onRoomActivity);
    };
  }, [refreshUnread, location.pathname, showToast]);

  // Pull the latest notification count from the API. The Notifications
  // page dispatches 'notifications:changed' after mark-read / mark-all
  // so the badge stays in sync without waiting for the next poll.
  const refreshNotifCount = useCallback(() => {
    notificationsAPI.getUnreadCount()
      .then((r) => setNotifCount(r.data?.data?.count || 0))
      .catch(() => {});
  }, []);

  // Refresh count when the tab is re-focused or every 60s — covers
  // gaps in socket coverage (sleep, weak network, etc.)
  useEffect(() => {
    if (!user) return;
    const onFocus = () => {
      refreshUnread();
      refreshNotifCount();
    };
    const onNotifChanged = () => refreshNotifCount();
    // Messages page dispatches chat:seen after marking a room/DM read so
    // the badge drops immediately instead of on the next poll.
    const onChatSeen = () => refreshUnread();
    window.addEventListener('focus', onFocus);
    window.addEventListener('notifications:changed', onNotifChanged);
    window.addEventListener('chat:seen', onChatSeen);
    const id = setInterval(() => {
      refreshUnread();
      refreshNotifCount();
    }, 60_000);
    return () => {
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('notifications:changed', onNotifChanged);
      window.removeEventListener('chat:seen', onChatSeen);
      clearInterval(id);
    };
  }, [user, refreshUnread, refreshNotifCount]);

  // Expose setter so Messages page can clear the badge
  const decrementUnread = useCallback((amount) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  const rawItems = getNavigationItems(selectedRole);
  // Mirror the Messages badge pattern for Notifications — same shape
  // (count or "99+") so the Sidebar component renders both
  // identically. Bell icon in the topbar is already wired separately.
  const navigationItems = rawItems.map((item) => {
    if (item.path === '/messages' && unreadCount > 0) {
      return { ...item, badge: unreadCount > 99 ? '99+' : String(unreadCount) };
    }
    if (item.path === '/notifications' && notifCount > 0) {
      return { ...item, badge: notifCount > 99 ? '99+' : String(notifCount) };
    }
    return item;
  });

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = () => {
    // logout() hard-redirects when done — navigating here too would race it
    // (login page mounts while still "authenticated" → bounced → flicker).
    logout({ redirect: '/login' });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900 transition-colors">
      {/* Sidebar */}
      <Sidebar
        items={navigationItems}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Topbar */}
      <Topbar
        user={user}
        notifications={notifCount}
        messages={unreadCount}
        onLogout={handleLogout}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content with responsive margin */}
      <main className="lg:ml-[240px] pt-16">
        {/* Payment Banner (preview mode + installment warnings) */}
        <PaymentBanner />
        {children}
      </main>

      {/* Suspension / Soft-lock Modal */}
      <SuspensionModal />

      {/* Birthday celebration — auto-pops once per year on app open */}
      <BirthdayCelebration user={user} />

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="Sign Out"
        size="sm"
      >
        <div className="flex flex-col items-center text-center py-2">
          <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4">
            <LogOut className="w-6 h-6 text-red-600 dark:text-red-400" />
          </div>
          <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
            Are you sure you want to sign out of your account?
          </p>
          <div className="flex gap-3 w-full">
            <Button variant="outline" className="flex-1" onClick={() => setShowLogoutConfirm(false)}>
              Cancel
            </Button>
            <Button variant="danger" className="flex-1" onClick={confirmLogout}>
              Sign Out
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
