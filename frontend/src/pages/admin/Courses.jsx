import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminCoursesAPI } from '../../lib/api';
import {
  BookOpen,
  Search,
  Filter,
  Edit,
  Eye,
  CheckCircle,
  XCircle,
  Clock,
  FileText,
  TrendingUp,
  Users,
  DollarSign,
  Star,
} from 'lucide-react';
import { Container } from '../../components/layout';
import {
  Button,
  Input,
  Select,
  Badge,
  Spinner,
  Pagination,
  Modal,
  Avatar
} from '../../components/ui';
import { cn } from '../../utils/cn';

export default function AdminCourses() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState(null);

  // Modal states
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCourses();
    fetchStats();
  }, [filters.page, filters.limit, filters.status, filters.category]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filters.search !== undefined) {
        fetchCourses();
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const response = await adminCoursesAPI.getAll(filters);
      setCourses(response.data.data.courses);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminCoursesAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handlePageChange = (newPage) => {
    setFilters(prev => ({ ...prev, page: newPage }));
  };

  const handleSearchChange = (e) => {
    setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }));
  };

  const handleStatusChange = (e) => {
    setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }));
  };

  const handleUpdateStatus = async () => {
    if (!selectedCourse || !newStatus) return;
    try {
      setActionLoading(true);
      await adminCoursesAPI.updateStatus(selectedCourse.id, newStatus);
      setIsStatusModalOpen(false);
      fetchCourses();
      fetchStats();
    } catch (error) {
      console.error('Error updating course status:', error);
    } finally {
      setActionLoading(false);
      setSelectedCourse(null);
      setNewStatus('');
    }
  };

  const openStatusModal = (course) => {
    setSelectedCourse(course);
    setNewStatus(course.status);
    setIsStatusModalOpen(true);
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'published': return 'success';
      case 'draft': return 'default';
      case 'pending': return 'warning';
      case 'archived': return 'danger';
      default: return 'default';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'published': return CheckCircle;
      case 'draft': return FileText;
      case 'pending': return Clock;
      case 'archived': return XCircle;
      default: return FileText;
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('p-2 rounded-lg', color)}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary">{title}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">{value}</p>
      {subtitle && <p className="text-xs text-gray-500 dark:text-text-dark-muted mt-1">{subtitle}</p>}
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  Course Management
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  Manage all courses, approve submissions, and monitor quality
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              title="Total Courses"
              value={stats.total || 0}
              icon={BookOpen}
              color="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
            />
            <StatCard
              title="Published"
              value={stats.published || 0}
              icon={CheckCircle}
              color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400"
            />
            <StatCard
              title="Pending Review"
              value={stats.pending || 0}
              icon={Clock}
              color="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400"
            />
            <StatCard
              title="Draft"
              value={stats.draft || 0}
              icon={FileText}
              color="bg-gray-100 dark:bg-gray-900/30 text-gray-600 dark:text-gray-400"
            />
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm mb-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search courses by title or instructor..."
                leftIcon={<Search className="w-4 h-4" />}
                value={filters.search}
                onChange={handleSearchChange}
              />
            </div>
            <div className="w-full md:w-48">
              <Select
                value={filters.status}
                onChange={handleStatusChange}
                options={[
                  { value: '', label: 'All Status' },
                  { value: 'published', label: 'Published' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'archived', label: 'Archived' },
                ]}
              />
            </div>
          </div>
        </div>

        {/* Courses Table */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-border-dark">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Course</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Instructor</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Students</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Rating</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Created</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                    {courses.map((course) => {
                      const StatusIcon = getStatusIcon(course.status);
                      return (
                        <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <img
                                src={course.thumbnail || '/placeholder-course.jpg'}
                                alt={course.title}
                                className="w-16 h-12 object-cover rounded-lg mr-3"
                              />
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-text-dark-primary line-clamp-1">
                                  {course.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-text-dark-secondary">
                                  {course.category?.name || 'Uncategorized'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Avatar
                                src={course.instructor?.profile_picture}
                                alt={course.instructor?.full_name}
                                size="sm"
                                className="mr-2"
                              />
                              <span className="text-sm text-gray-900 dark:text-text-dark-primary">
                                {course.instructor?.full_name}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant={getStatusBadgeColor(course.status)}>
                              <StatusIcon className="w-3 h-3 mr-1" />
                              {course.status}
                            </Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-text-dark-primary">
                              <Users className="w-4 h-4 text-gray-400" />
                              {course.enrollment_count || 0}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-1 text-sm text-gray-900 dark:text-text-dark-primary">
                              <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                              {course.average_rating ? course.average_rating.toFixed(1) : 'N/A'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-text-dark-secondary">
                            {new Date(course.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex items-center justify-end gap-2">
                              <Link to={`/courses/${course.id}`}>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                  title="View Course"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                                onClick={() => openStatusModal(course)}
                                title="Change Status"
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="px-6 py-4 border-t border-gray-200 dark:border-border-dark">
                  <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Container>

      {/* Status Change Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Course Status"
        description={`Change the status of "${selectedCourse?.title}"`}
      >
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-secondary mb-2">
            New Status
          </label>
          <Select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'draft', label: 'Draft' },
              { value: 'pending', label: 'Pending Review' },
              { value: 'published', label: 'Published' },
              { value: 'archived', label: 'Archived' },
            ]}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="outline"
            onClick={() => setIsStatusModalOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdateStatus}
            isLoading={actionLoading}
          >
            Update Status
          </Button>
        </div>
      </Modal>
    </>
  );
}
