import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Bell,
  BellOff,
  Check,
  CheckCheck,
  Trash2,
  Filter,
  RefreshCw,
  ArrowLeft,
  BookOpen,
  FileText,
  Award,
  MessageSquare,
  Info,
} from 'lucide-react';
import { notificationsAPI } from '../lib/api';
import { Container, EmptyState } from '../components/layout';
import { Button, Spinner, Alert, Modal } from '../components/ui';
import emptyNotifications from '../assets/empty-notifications.svg';
import { cn } from '../utils/cn';

const NOTIFICATION_ICONS = {
  course_enrollment: BookOpen,
  test_assigned: FileText,
  achievement: Award,
  announcement: MessageSquare,
  system: Info,
  default: Bell,
};

const NOTIFICATION_COLORS = {
  course_enrollment: 'text-blue-500',
  test_assigned: 'text-yellow-500',
  achievement: 'text-green-500',
  announcement: 'text-purple-500',
  system: 'text-gray-500 dark:text-gray-400',
};

const FILTER_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
];

const TYPE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'course_enrollment', label: 'Course Enrollment' },
  { value: 'test_assigned', label: 'Test Assigned' },
  { value: 'achievement', label: 'Achievement' },
  { value: 'announcement', label: 'Announcement' },
  { value: 'system', label: 'System' },
];

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [filter, setFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [deleteNotifId, setDeleteNotifId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Fetch notifications
  const fetchNotifications = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) setLoading(true);
      setError('');

      const params = {
        page: currentPage,
        limit: 20,
      };

      // Apply filters
      if (filter === 'read') {
        params.is_read = 'true';
      } else if (filter === 'unread') {
        params.is_read = 'false';
      }

      if (typeFilter !== 'all') {
        params.type = typeFilter;
      }

      const response = await notificationsAPI.getAll(params);
      const data = response.data.data;

      setNotifications(data.notifications);
      setTotalPages(data.pagination.totalPages);
      setTotalItems(data.pagination.totalItems);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err.response?.data?.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [currentPage, filter, typeFilter]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotifications(false);
    }, 30000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Handle refresh
  const handleRefresh = () => {
    setRefreshing(true);
    fetchNotifications(false);
  };

  // Mark as read
  const handleMarkAsRead = async (notificationId) => {
    try {
      await notificationsAPI.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(notif =>
          notif.id === notificationId ? { ...notif, is_read: true } : notif
        )
      );
      // Tell AppLayout the unread count changed so the topbar bell +
      // sidebar Notifications badge update immediately instead of
      // waiting for the next poll.
      window.dispatchEvent(new CustomEvent('notifications:changed'));

      setSuccess('Notification marked as read');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error marking as read:', err);
      setError(err.response?.data?.message || 'Failed to mark as read');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Mark all as read
  const handleMarkAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();

      // Update local state
      setNotifications(prev =>
        prev.map(notif => ({ ...notif, is_read: true }))
      );
      window.dispatchEvent(new CustomEvent('notifications:changed'));

      setSuccess('All notifications marked as read');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error marking all as read:', err);
      setError(err.response?.data?.message || 'Failed to mark all as read');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Delete notification
  const handleDelete = (notificationId) => {
    setDeleteNotifId(notificationId);
  };

  const confirmDeleteNotif = async () => {
    try {
      await notificationsAPI.delete(deleteNotifId);
      setNotifications(prev => prev.filter(notif => notif.id !== deleteNotifId));
      setDeleteNotifId(null);
      setSuccess('Notification deleted');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Error deleting notification:', err);
      setError(err.response?.data?.message || 'Failed to delete notification');
      setTimeout(() => setError(''), 3000);
    }
  };

  // Format date — defensive against missing/invalid timestamps so a single
  // bad notification row can't render the whole list as "Invalid Date".
  // Sequelize returns `created_at` (underscored), but some socket-pushed
  // shapes carry `createdAt` instead; tolerate both.
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  // Get notification icon
  const getNotificationIcon = (type) => {
    const IconComponent = NOTIFICATION_ICONS[type] || NOTIFICATION_ICONS.default;
    return IconComponent;
  };

  // Get notification color
  const getNotificationColor = (type) => {
    return NOTIFICATION_COLORS[type] || 'text-gray-500 dark:text-gray-400';
  };

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                    Notifications
                  </h1>
                  <p className="text-lg text-white/90 animate-fade-in mt-1">
                    {totalItems} total notification{totalItems !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="p-2 text-white/90 hover:text-white hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
                  title="Refresh"
                >
                  <RefreshCw className={cn('h-5 w-5', refreshing && 'animate-spin')} />
                </button>

                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    showFilters ? 'text-white bg-white/20' : 'text-white/90 hover:text-white hover:bg-white/10'
                  )}
                  title="Filter"
                >
                  <Filter className="h-5 w-5" />
                </button>

                {notifications.some(n => !n.is_read) && (
                  <Button
                    onClick={handleMarkAllAsRead}
                    variant="secondary"
                    size="sm"
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                    leftIcon={<CheckCheck className="h-4 w-4" />}
                  >
                    Mark all read
                  </Button>
                )}
              </div>
            </div>

            {/* Filters */}
            {showFilters && (
              <div className="mt-6 p-4 bg-white/10 backdrop-blur-sm rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Read Status Filter */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Status
                    </label>
                    <div className="flex gap-2">
                      {FILTER_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          onClick={() => {
                            setFilter(option.value);
                            setCurrentPage(1);
                          }}
                          className={cn(
                            'px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                            filter === option.value
                              ? 'bg-white text-brand-blue'
                              : 'bg-white/20 text-white hover:bg-white/30'
                          )}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Type Filter */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Type
                    </label>
                    <select
                      value={typeFilter}
                      disabled={loading}
                      onChange={(e) => {
                        setTypeFilter(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="w-full bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-lg px-4 py-2 focus:outline-none focus:border-white focus:ring-2 focus:ring-white/50 transition-all disabled:opacity-50"
                    >
                      {TYPE_FILTER_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value} className="text-gray-900">
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading notifications...
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* Alert Messages */}
            {error && (
              <div className="mb-6 animate-slide-up">
                <Alert variant="danger" onClose={() => setError('')}>
                  {error}
                </Alert>
              </div>
            )}

            {success && (
              <div className="mb-6 animate-slide-up">
                <Alert variant="success" onClose={() => setSuccess('')}>
                  <div className="flex items-center gap-2">
                    <CheckCheck className="w-4 h-4" />
                    {success}
                  </div>
                </Alert>
              </div>
            )}

            {/* Empty State */}
            {notifications.length === 0 && (
              <EmptyState
                image={emptyNotifications}
                icon={<BellOff className="w-16 h-16" />}
                title="No notifications"
                description={
                  filter === 'unread'
                    ? "You're all caught up! No unread notifications."
                    : filter === 'read'
                    ? 'No read notifications yet.'
                    : 'You have no notifications at the moment.'
                }
              />
            )}

            {/* Notifications List */}
            {notifications.length > 0 && (
              <div className="space-y-2">
                {notifications.map((notification) => {
                  const Icon = getNotificationIcon(notification.type);
                  const iconColor = getNotificationColor(notification.type);

                  return (
                    <div
                      key={notification.id}
                      className={cn(
                        'bg-white dark:bg-dark-800 rounded-xl p-4 border border-gray-200 dark:border-border-dark hover:border-gray-300 dark:hover:border-dark-600 transition-all',
                        !notification.is_read && 'bg-blue-50/50 dark:bg-blue-500/5 border-blue-200 dark:border-blue-500/20'
                      )}
                    >
                      <div className="flex gap-4">
                        {/* Icon */}
                        <div className={cn('flex-shrink-0', iconColor)}>
                          <Icon className="h-6 w-6" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-text-dark-primary mb-1 transition-colors flex items-center gap-2">
                                {notification.title}
                                {!notification.is_read && (
                                  <span className="inline-block w-2 h-2 bg-brand-blue rounded-full"></span>
                                )}
                              </h3>
                              <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-2 transition-colors">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-text-dark-muted transition-colors">
                                {formatDate(notification.created_at || notification.createdAt)}
                              </p>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {!notification.is_read && (
                                <button
                                  onClick={() => handleMarkAsRead(notification.id)}
                                  className="p-2 text-gray-600 dark:text-text-dark-secondary hover:text-brand-blue hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                                  title="Mark as read"
                                >
                                  <Check className="h-4 w-4" />
                                </button>
                              )}
                              <button
                                onClick={() => handleDelete(notification.id)}
                                className="p-2 text-gray-600 dark:text-text-dark-secondary hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <Button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  variant="secondary"
                  size="sm"
                >
                  Previous
                </Button>

                <div className="flex items-center gap-2">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }

                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={cn(
                          'px-4 py-2 rounded-lg transition-all text-sm font-medium',
                          currentPage === pageNum
                            ? 'bg-brand-blue text-white shadow-md'
                            : 'bg-white dark:bg-dark-800 text-gray-900 dark:text-text-dark-primary border border-gray-200 dark:border-border-dark hover:border-gray-300 dark:hover:border-dark-600'
                        )}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <Button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  variant="secondary"
                  size="sm"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </Container>

      <Modal
        isOpen={!!deleteNotifId}
        onClose={() => setDeleteNotifId(null)}
        title="Delete Notification"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Are you sure you want to delete this notification?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteNotifId(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteNotif}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
