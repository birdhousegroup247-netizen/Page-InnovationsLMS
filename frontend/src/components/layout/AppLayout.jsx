import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { getNavigationItems } from '../../utils/navigationItems.jsx';
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

  // CRITICAL: Only show instructor navigation if user is ACTUALLY an instructor
  // Never trust localStorage alone - always verify against actual user role
  const actualUserRole = user?.role || 'student';
  const storedRole = localStorage.getItem('selectedRole');

  // Instructor navigation ONLY if user is actually an instructor
  const selectedRole = (actualUserRole === 'instructor' && storedRole === 'instructor')
    ? 'instructor'
    : 'student';

  // Clean up stale localStorage if user doesn't have instructor role
  if (storedRole === 'instructor' && actualUserRole !== 'instructor') {
    localStorage.removeItem('selectedRole');
  }

  const navigationItems = getNavigationItems(selectedRole);

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
        notifications={3}
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
