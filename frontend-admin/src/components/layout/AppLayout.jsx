import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getNavigationItems } from '../../utils/navigationItems.jsx';
import { notificationsAPI } from '../../lib/api';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { Modal, Button } from '../ui';
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
  const [notificationCount, setNotificationCount] = useState(0);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const navigationItems = getNavigationItems(user?.role);

  // Fetch real notification count
  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await notificationsAPI.getUnreadCount();
        setNotificationCount(response.data?.data?.count || 0);
      } catch (error) {
        // Silently fail - notification count is not critical
        setNotificationCount(0);
      }
    };

    fetchNotifications();

    // Refresh notification count every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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
        notifications={notificationCount}
        onLogout={handleLogout}
        onMenuToggle={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      />

      {/* Main Content with responsive margin */}
      <main className="lg:ml-[220px] pt-16">
        {children}
      </main>

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
