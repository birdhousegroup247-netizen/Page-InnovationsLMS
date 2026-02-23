import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getNavigationItems } from '../../utils/navigationItems.jsx';
import { chatAPI, notificationsAPI } from '../../lib/api';
import { connectSocket, getSocket } from '../../lib/socket';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

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

    // Connect socket
    const token = localStorage.getItem('accessToken');
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

  const handleLogout = () => {
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
        {children}
      </main>
    </div>
  );
}
