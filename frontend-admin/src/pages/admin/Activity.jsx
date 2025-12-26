import { useState, useEffect } from 'react';
import { adminActivityAPI } from '../../lib/api';
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

      // Fetch real activity logs from API
      const params = {
        page: filters.page,
        limit: filters.limit,
        action: filters.type || undefined,
        // Map frontend severity to backend filtering if needed
      };

      // Add search filter if present
      if (filters.search) {
        params.search = filters.search;
      }

      const response = await adminActivityAPI.getAllLogs(params);
      const data = response.data.data;

      // Transform backend data to match frontend format
      const transformedActivities = data.logs.map(log => {
        // Determine severity based on action
        let severity = 'info';
        let type = log.action;
        let target = '';
        let actionText = log.action.replace(/_/g, ' ');

        // Map common actions to severity and user-friendly format
        if (log.action === 'login') {
          severity = 'info';
          actionText = 'logged in';
        } else if (log.action === 'failed_login') {
          severity = 'error';
          actionText = 'failed login attempt';
        } else if (log.action.includes('enroll')) {
          severity = 'info';
          type = 'enrollment';
          actionText = 'enrolled in';
          target = log.metadata?.course_title || `${log.entity_type} #${log.entity_id}`;
        } else if (log.action.includes('certificate')) {
          severity = 'success';
          type = 'certificate_earned';
          actionText = 'earned certificate for';
          target = log.metadata?.course_title || `course #${log.entity_id}`;
        } else if (log.action.includes('course_create')) {
          severity = 'info';
          type = 'course_created';
          actionText = 'created course';
          target = log.metadata?.course_title || `course #${log.entity_id}`;
        } else if (log.action.includes('course_publish')) {
          severity = 'success';
          type = 'course_published';
          actionText = 'published course';
          target = log.metadata?.course_title || `course #${log.entity_id}`;
        } else if (log.action.includes('instructor_app')) {
          severity = 'warning';
          type = 'instructor_application';
          actionText = 'applied to become instructor';
        } else if (log.action.includes('payment') || log.action.includes('purchase')) {
          severity = 'success';
          type = 'payment';
          actionText = 'purchased';
          target = log.metadata?.course_title || log.metadata?.item_name || '';
        } else if (log.action.includes('review')) {
          severity = 'info';
          type = 'review';
          actionText = `left a ${log.metadata?.rating || 5}-star review for`;
          target = log.metadata?.course_title || `course #${log.entity_id}`;
        } else if (log.action.includes('suspend')) {
          severity = 'error';
          type = 'user_suspended';
          actionText = 'suspended user';
          target = log.metadata?.target_user_name || '';
        }

        return {
          id: log.id,
          type,
          severity,
          user: {
            id: log.user?.id || null,
            name: log.user?.full_name || 'System',
            email: log.user?.email || '',
            avatar: null,
          },
          action: actionText,
          target,
          metadata: log.metadata || {},
          timestamp: new Date(log.created_at),
          ip_address: log.ip_address || 'N/A',
        };
      });

      setActivities(transformedActivities);
      setPagination(data.pagination);
    } catch (error) {
      console.error('Error fetching activities:', error);
      setActivities([]);
      setPagination(null);
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
                              <p className="text-sm text-gray-900 dark:text-white">
                                <span className="font-medium">{activity.user.name}</span>
                                {' '}<span className="text-gray-600 dark:text-gray-400">{activity.action}</span>
                                {activity.target && (
                                  <span className="font-medium text-brand-blue"> {activity.target}</span>
                                )}
                              </p>
                              <div className="flex items-center gap-3 mt-1">
                                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTimestamp(activity.timestamp)}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
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
                            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-dark-700 rounded p-2">
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
                <div className="px-3 py-4 border-t border-gray-200 dark:border-border-dark">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
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
