import { Bell, User, ChevronDown, Sun, Moon, Menu, Settings, RefreshCw, MessageSquare } from 'lucide-react';
import { cn } from '../../utils/cn';
import Avatar from '../ui/Avatar';
import Badge from '../ui/Badge';
import { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Link } from 'react-router-dom';
import GlobalSearch from '../common/GlobalSearch';

/**
 * Topbar Component - Modern top navigation bar
 * Based on FUSELearn design with universal theme support
 * Responsive with mobile menu toggle
 */
const Topbar = ({ user, notifications = 0, onLogout, onMenuToggle, className }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      className={cn(
        'fixed top-0 right-0 lg:left-[240px] left-0 h-16 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-border-dark z-40 transition-colors',
        className
      )}
    >
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-6 h-6 text-gray-600 dark:text-text-dark-secondary" />
        </button>

        {/* Global Search - hidden on mobile, shown on sm+ */}
        <div className="hidden sm:flex flex-1 items-center max-w-sm mx-4">
          <GlobalSearch />
        </div>

        {/* Spacer for mobile */}
        <div className="flex-1 sm:hidden"></div>

        {/* Right Side Actions */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 transition-colors"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-yellow-500" />
            ) : (
              <Moon className="w-5 h-5 text-gray-600 dark:text-text-dark-secondary" />
            )}
          </button>

          {/* Messages */}
          <Link
            to="/messages"
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          >
            <MessageSquare className="w-5 h-5 text-gray-600 dark:text-text-dark-secondary transition-colors" />
          </Link>

          {/* Notifications */}
          <Link
            to="/notifications"
            className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
          >
            <Bell className="w-5 h-5 text-gray-600 dark:text-text-dark-secondary transition-colors" />
            {notifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-brand-red text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
                {notifications > 99 ? '99+' : notifications}
              </span>
            )}
          </Link>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
            >
              <Avatar
                src={user?.profile_picture}
                alt={user?.full_name}
                fallback={user?.full_name?.[0]?.toUpperCase()}
                size="sm"
              />
              <ChevronDown className="w-4 h-4 text-gray-500 dark:text-text-dark-muted transition-colors hidden sm:block" />
            </button>

            {/* Dropdown Menu */}
            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-dark-800 rounded-lg shadow-lg dark:shadow-elevated border border-gray-200 dark:border-border-dark py-1 animate-slide-down transition-colors">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-border-dark transition-colors">
                  <p className="font-medium text-sm text-gray-900 dark:text-text-dark-primary transition-colors">
                    {user?.full_name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-text-dark-muted transition-colors mt-0.5">
                    {user?.email}
                  </p>
                </div>
                {/* Both Profile and Settings live on /profile/settings —
                    the unauthenticated bare paths /profile and /settings
                    aren't registered, so the old links fell through to
                    the dashboard. Same page, different tab anchor so
                    each menu item lands the user where they expect. */}
                {/* Profile vs Settings are different concepts: Profile
                    is "who you are" (name, picture, DOB, bio, social);
                    Settings is "how the account works" (password,
                    integrations, preferences). Two distinct routes, same
                    underlying component switching view by pathname. */}
                <Link
                  to="/profile"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <User className="w-4 h-4" />
                  Profile
                </Link>
                <Link
                  to="/settings"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <Settings className="w-4 h-4" />
                  Settings
                </Link>
                <Link
                  to="/role-selector"
                  className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                  onClick={() => setShowUserMenu(false)}
                >
                  <RefreshCw className="w-4 h-4" />
                  Switch Role
                </Link>
                <hr className="my-1 border-gray-200 dark:border-border-dark transition-colors" />
                <button
                  onClick={() => {
                    onLogout();
                    setShowUserMenu(false);
                  }}
                  className="w-full flex items-center gap-2 text-left px-4 py-2 text-sm text-brand-red hover:bg-gray-100 dark:hover:bg-dark-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Topbar;
