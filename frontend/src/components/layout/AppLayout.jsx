import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getNavigationItems } from '../../utils/navigationItems.jsx';
import { chatAPI, notificationsAPI } from '../../lib/api';
import { tokenStorage } from '../../utils/tokenStorage';
import { connectSocket, getSocket } from '../../lib/socket';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Modal, Button } from '../ui';
import PaymentBanner from '../ui/PaymentBanner';
import SuspensionModal from '../ui/SuspensionModal';
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

  const actualUserRole = user?.role || 'student';
  const storedRole = localStorage.getItem('selectedRole');

  const selectedRole = (actualUserRole === 'instructor' && storedRole === 'instructor')
    ? 'instructor'
    : 'student';

  if (storedRole === 'instructor' && actualUserRole !== 'instructor') {
    localStorage.removeItem('selectedRole');
  }

  // Connect socket and fetch unread count once
  useEffect(() => {
    if (!user) return;

    // Connect socket — per-tab Bearer token (see utils/tokenStorage.js).
    const token = tokenStorage.get('accessToken');
    if (token) connectSocket(token);

    // Fetch total unread DMs
    chatAPI.getConversations()
      .then((r) => {
        const convs = r.data?.data?.conversations || [];
        const total = convs.reduce((s, c) => s + (c.unread_count || 0), 0);
        setUnreadCount(total);
      })
      .catch(() => {});

    // Fetch unread notification count
    notificationsAPI.getUnreadCount()
      .then((r) => setNotifCount(r.data?.data?.count || 0))
      .catch(() => {});
  }, [user]);

  // Listen for new notifications via socket
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const onNotif = () => setNotifCount((n) => n + 1);
    socket.on('notification', onNotif);
    return () => socket.off('notification', onNotif);
  }, []);

  // Expose setter so Messages page can clear the badge
  const decrementUnread = useCallback((amount) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  const rawItems = getNavigationItems(selectedRole);
  const navigationItems = rawItems.map((item) =>
    item.path === '/messages' && unreadCount > 0
      ? { ...item, badge: unreadCount > 99 ? '99+' : String(unreadCount) }
      : item
  );

  const handleLogout = () => setShowLogoutConfirm(true);

  const confirmLogout = () => {
    logout();
    navigate('/login');
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
        onLogout={handleLogout}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content with responsive margin */}
      <main className="lg:ml-[220px] pt-16">
        {/* Payment Banner (preview mode + installment warnings) */}
        <PaymentBanner />
        {children}
      </main>

      {/* Suspension / Soft-lock Modal */}
      <SuspensionModal />

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
