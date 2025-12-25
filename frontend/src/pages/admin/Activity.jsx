import { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  Activity as ActivityIcon,
  Search,
  Filter,
  Download,
  BookOpen,
  FileText,
  Award,
  UserCheck,
  UserX,
  TrendingUp,
  DollarSign,
  Shield,
  AlertCircle,
  CheckCircle,
  XCircle,
  Clock,
  User,
} from 'lucide-react';
import { Container } from '../../components/layout';
import {
  Button,
  Input,
  Select,
  Badge,
  Spinner,
  Pagination,
  Avatar
} from '../../components/ui';
import { cn } from '../../utils/cn';

export default function Activity() {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
    severity: '',
    page: 1,
    limit: 20
  });
  const [pagination, setPagination] = useState(null);

  useEffect(() => {
    fetchActivities();
  }, [filters.page, filters.limit, filters.type, filters.severity]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== undefined) {
        fetchActivities();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchActivities = async () => {
    try {
      setLoading(true);

      // Mock activity data (you'll replace with real API calls)
      const mockActivities = [
        {
          id: 1,
          type: 'enrollment',
          severity: 'info',
          user: { id: 123, name: 'John Doe', email: 'john@example.com', avatar: null },
          action: 'enrolled in',
          target: 'Advanced React Development',
          metadata: { course_id: 45 },
          timestamp: new Date(Date.now() - 5 * 60000),
          ip_address: '192.168.1.1',
        },
        {
          id: 2,
          type: 'course_created',
          severity: 'info',
          user: { id: 456, name: 'Jane Smith', email: 'jane@example.com', avatar: null },
          action: 'created course',
          target: 'Python for Beginners',
          metadata: { course_id: 78 },
          timestamp: new Date(Date.now() - 60 * 60000),
          ip_address: '192.168.1.2',
        },
        {
          id: 3,
          type: 'certificate_earned',
          severity: 'success',
          user: { id: 789, name: 'Mike Johnson', email: 'mike@example.com', avatar: null },
          action: 'earned certificate for',
          target: 'SQL Mastery',
          metadata: { course_id: 23, certificate_id: 456 },
          timestamp: new Date(Date.now() - 2 * 60 * 60000),
          ip_address: '192.168.1.3',
        },
        {
          id: 4,
          type: 'instructor_application',
          severity: 'warning',
          user: { id: 234, name: 'Sarah Williams', email: 'sarah@example.com', avatar: null },
          action: 'applied to become instructor',
          target: '',
          metadata: { application_id: 12 },
          timestamp: new Date(Date.now() - 3 * 60 * 60000),
          ip_address: '192.168.1.4',
        },
        {
          id: 5,
          type: 'review',
          severity: 'info',
          user: { id: 567, name: 'Tom Brown', email: 'tom@example.com', avatar: null },
          action: 'left a 5-star review for',
          target: 'JavaScript Basics',
          metadata: { course_id: 34, rating: 5 },
          timestamp: new Date(Date.now() - 4 * 60 * 60000),
          ip_address: '192.168.1.5',
        },
        {
          id: 6,
          type: 'payment',
          severity: 'success',
          user: { id: 890, name: 'Alice Cooper', email: 'alice@example.com', avatar: null },
          action: 'purchased',
          target: 'Full Stack Bundle',
          metadata: { amount: 199.99, currency: 'USD' },
          timestamp: new Date(Date.now() - 5 * 60 * 60000),
          ip_address: '192.168.1.6',
        },
        {
          id: 7,
          type: 'login',
          severity: 'info',
          user: { id: 123, name: 'John Doe', email: 'john@example.com', avatar: null },
          action: 'logged in',
          target: '',
          metadata: {},
          timestamp: new Date(Date.now() - 6 * 60 * 60000),
          ip_address: '192.168.1.1',
        },
        {
          id: 8,
          type: 'failed_login',
          severity: 'error',
          user: { id: null, name: 'Unknown', email: 'unknown@example.com', avatar: null },
          action: 'failed login attempt',
          target: '',
          metadata: { reason: 'Invalid password' },
          timestamp: new Date(Date.now() - 7 * 60 * 60000),
          ip_address: '192.168.1.7',
        },
        {
          id: 9,
          type: 'course_published',
          severity: 'success',
          user: { id: 456, name: 'Jane Smith', email: 'jane@example.com', avatar: null },
          action: 'published course',
          target: 'Python for Beginners',
          metadata: { course_id: 78 },
          timestamp: new Date(Date.now() - 8 * 60 * 60000),
          ip_address: '192.168.1.2',
        },
        {
          id: 10,
          type: 'user_suspended',
          severity: 'error',
          user: { id: 999, name: 'Admin User', email: 'admin@example.com', avatar: null },
          action: 'suspended user',
          target: 'Bob Smith',
          metadata: { reason: 'Policy violation', suspended_user_id: 888 },
          timestamp: new Date(Date.now() - 10 * 60 * 60000),
          ip_address: '192.168.1.8',
        },
      ];

      setActivities(mockActivities);
      setPagination({
        currentPage: 1,
        totalPages: 5,
        totalItems: 100,
      });
    } catch (error) {
      console.error('Error fetching activities:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleTypeChange = (e) => {
    setFilters(prev => ({ ...prev, type: e.target.value, page: 1 }));
  };

  const handleSeverityChange = (e) => {
    setFilters(prev => ({ ...prev, severity: e.target.value, page: 1 }));
  };

  const handleExport = () => {
    // Implement export functionality
    console.log('Exporting activity logs...');
  };

  const getActivityIcon = (type) => {
    const iconMap = {
      enrollment: BookOpen,
      course_created: FileText,
      course_published: CheckCircle,
      certificate_earned: Award,
      instructor_application: UserCheck,
      review: TrendingUp,
      payment: DollarSign,
      login: User,
      failed_login: XCircle,
      user_suspended: Shield,
      user_activated: UserCheck,
      user_deactivated: UserX,
    };
    return iconMap[type] || ActivityIcon;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'success': return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400';
      case 'warning': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400';
      case 'error': return 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400';
      case 'info':
      default: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400';
    }
  };

  const getSeverityBadge = (severity) => {
    const variants = {
      success: 'success',
      warning: 'warning',
      error: 'danger',
      info: 'primary',
    };
    return variants[severity] || 'default';
  };

  const formatTimestamp = (timestamp) => {
    const now = new Date();
    const diff = now - new Date(timestamp);
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;

    return new Date(timestamp).toLocaleString();
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <ActivityIcon className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                    Activity Logs
                  </h1>
                  <p className="text-lg text-white/90 animate-fade-in mt-1">
                    Monitor platform activity and user actions in real-time
                  </p>
                </div>
              </div>
              <div className="hidden md:block">
                <Button
                  variant="secondary"
                  onClick={handleExport}
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white hover:bg-white/20"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export Logs
                </Button>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search activities by user, action, or target..."
                leftIcon={<Search className="w-4 h-4" />}
                value={filters.search}
                onChange={handleSearchChange}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={filters.type}
                onChange={handleTypeChange}
                options={[
                  { value: '', label: 'All Types' },
                  { value: 'enrollment', label: 'Enrollments' },
                  { value: 'course_created', label: 'Course Created' },
                  { value: 'certificate_earned', label: 'Certificates' },
                  { value: 'payment', label: 'Payments' },
                  { value: 'login', label: 'Logins' },
                  { value: 'instructor_application', label: 'Applications' },
                ]}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={filters.severity}
                onChange={handleSeverityChange}
                options={[
                  { value: '', label: 'All Severity' },
                  { value: 'info', label: 'Info' },
                  { value: 'success', label: 'Success' },
                  { value: 'warning', label: 'Warning' },
                  { value: 'error', label: 'Error' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Activity List */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <div className="divide-y divide-gray-200 dark:divide-border-dark">
                {activities.map((activity) => {
                  const Icon = getActivityIcon(activity.type);
                  return (
                    <div
                      key={activity.id}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className={cn(
                          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                          getSeverityColor(activity.severity)
                        )}>
                          <Icon className="w-5 h-5" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4 mb-1">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-text-dark-primary">
                                <span className="font-medium">{activity.user.name}</span>
                                {' '}<span className="text-gray-600 dark:text-text-dark-secondary">{activity.action}</span>
                                {activity.target && (
                                  <span className="font-medium text-brand-blue"> {activity.target}</span>
                                )}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-gray-500 dark:text-text-dark-muted flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTimestamp(activity.timestamp)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-text-dark-muted">
                                  IP: {activity.ip_address}
                                </p>
                              </div>
                            </div>
                            <Badge variant={getSeverityBadge(activity.severity)} className="flex-shrink-0">
                              {activity.severity}
                            </Badge>
                          </div>

                          {/* Metadata */}
                          {Object.keys(activity.metadata).length > 0 && (
                            <div className="mt-2 text-xs text-gray-500 dark:text-text-dark-muted bg-gray-50 dark:bg-dark-700 rounded p-2">
                              {Object.entries(activity.metadata).map(([key, value]) => (
                                <span key={key} className="mr-3">
                                  <strong>{key}:</strong> {typeof value === 'object' ? JSON.stringify(value) : value}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-border-dark">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
                      Showing {((pagination.currentPage - 1) * filters.limit) + 1} to{' '}
                      {Math.min(pagination.currentPage * filters.limit, pagination.totalItems)} of{' '}
                      {pagination.totalItems} activities
                    </p>
                    <Pagination
                      currentPage={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      onPageChange={handlePageChange}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Container>
    </>
  );
}
