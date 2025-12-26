import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { adminCoursesAPI, categoriesAPI, adminQuestionsAPI } from '../../lib/api';
import {
  BookOpen,
  Search,
  Plus,
  Download,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Archive,
  Clock,
  FileText,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  DollarSign,
  Users,
  Eye,
  Hammer,
  HelpCircle
} from 'lucide-react';
import { Container } from '../../components/layout';
import {
  Button,
  Input,
  Select,
  Badge,
  Spinner,
  Modal,
  Avatar
} from '../../components/ui';
import { SimplePagination } from '../../components/ui/Pagination';
import { cn } from '../../utils/cn';
import { validateCourseForm, formatErrors } from '../../utils/validation';

export default function AdminCourses() {
  const { user: currentUser } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [questionStats, setQuestionStats] = useState([]);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    category_id: '',
    level: '',
    dateFrom: '',
    dateTo: '',
    page: 1,
    limit: 10,
    sortBy: 'created_at',
    sortOrder: 'desc'
  });
  const [pagination, setPagination] = useState(null);

  // Modal states
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Bulk selection
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);

  // Edit form state
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category_id: '',
    level: '',
    price: '',
    duration_hours: '',
    thumbnail_url: ''
  });

  // Create form state
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    category_id: '',
    level: 'beginner',
    price: 0,
    duration_hours: '',
    thumbnail_url: ''
  });

  // Form validation errors
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchCourses();
    fetchStats();
    fetchCategories();
    fetchQuestionStats();
  }, [filters.page, filters.limit, filters.status, filters.category_id, filters.level, filters.sortBy, filters.sortOrder, filters.dateFrom, filters.dateTo]);

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
      setCourses(response.data.data.courses || []);
      setPagination(response.data.data.pagination);
    } catch (error) {
      console.error('Error fetching courses:', error);
      showToast('Failed to load courses. Please try again.', 'error');
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

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchQuestionStats = async () => {
    try {
      const response = await adminQuestionsAPI.getCourseStats();
      setQuestionStats(response.data.data.stats || []);
    } catch (error) {
      console.error('Error fetching question stats:', error);
    }
  };

  const getQuestionStatsForCourse = (courseId) => {
    const stats = questionStats.find(s => s.course_id === courseId);
    return {
      total: stats?.total_questions || 0,
      approved: stats?.approved_questions || 0,
      pending: stats?.pending_questions || 0
    };
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

  const handleCategoryChange = (e) => {
    setFilters(prev => ({ ...prev, category_id: e.target.value, page: 1 }));
  };

  const handleLevelChange = (e) => {
    setFilters(prev => ({ ...prev, level: e.target.value, page: 1 }));
  };

  const handleSort = (column) => {
    setFilters(prev => ({
      ...prev,
      sortBy: column,
      sortOrder: prev.sortBy === column && prev.sortOrder === 'asc' ? 'desc' : 'asc',
      page: 1
    }));
  };

  const getSortIcon = (column) => {
    if (filters.sortBy !== column) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-30" />;
    return filters.sortOrder === 'asc'
      ? <ArrowUp className="w-4 h-4 ml-1" />
      : <ArrowDown className="w-4 h-4 ml-1" />;
  };

  // Bulk selection handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedCourses(courses.map(c => c.id));
    } else {
      setSelectedCourses([]);
    }
  };

  const handleSelectCourse = (courseId) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  useEffect(() => {
    setShowBulkActions(selectedCourses.length > 0);
  }, [selectedCourses]);

  // Bulk actions
  const handleBulkPublish = async () => {
    try {
      setActionLoading(true);
      await adminCoursesAPI.bulkUpdateStatus(selectedCourses, 'published');
      showToast(`Successfully published ${selectedCourses.length} course(s)`, 'success');
      setSelectedCourses([]);
      fetchCourses();
      fetchStats();
    } catch (error) {
      console.error('Error bulk publishing courses:', error);
      showToast(error.response?.data?.message || 'Failed to publish courses. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkArchive = async () => {
    try {
      setActionLoading(true);
      await adminCoursesAPI.bulkUpdateStatus(selectedCourses, 'archived');
      showToast(`Successfully archived ${selectedCourses.length} course(s)`, 'success');
      setSelectedCourses([]);
      fetchCourses();
      fetchStats();
    } catch (error) {
      console.error('Error bulk archiving courses:', error);
      showToast(error.response?.data?.message || 'Failed to archive courses. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedCourses.length} course(s)? This action cannot be undone.`)) {
      return;
    }

    try {
      setActionLoading(true);
      await adminCoursesAPI.bulkDelete(selectedCourses);
      showToast(`Successfully deleted ${selectedCourses.length} course(s)`, 'success');
      setSelectedCourses([]);
      fetchCourses();
      fetchStats();
    } catch (error) {
      console.error('Error bulk deleting courses:', error);
      showToast(error.response?.data?.message || 'Failed to delete courses. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Course actions
  const handleApproveCourse = async (course) => {
    try {
      setActionLoading(true);
      await adminCoursesAPI.approve(course.id);
      showToast(`Course "${course.title}" published successfully`, 'success');
      fetchCourses();
      fetchStats();
    } catch (error) {
      console.error('Error approving course:', error);
      showToast('Failed to publish course. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectCourse = async (course) => {
    try {
      setActionLoading(true);
      await adminCoursesAPI.reject(course.id);
      showToast(`Course "${course.title}" rejected`, 'success');
      fetchCourses();
      fetchStats();
    } catch (error) {
      console.error('Error rejecting course:', error);
      showToast('Failed to reject course. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchiveCourse = async (course) => {
    try {
      setActionLoading(true);
      await adminCoursesAPI.archive(course.id);
      showToast(`Course "${course.title}" archived successfully`, 'success');
      fetchCourses();
      fetchStats();
    } catch (error) {
      console.error('Error archiving course:', error);
      showToast('Failed to archive course. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCourse = async () => {
    if (!selectedCourse) return;

    try {
      setActionLoading(true);
      await adminCoursesAPI.delete(selectedCourse.id);
      setIsDeleteModalOpen(false);
      showToast('Course deleted successfully', 'success');
      fetchCourses();
      fetchStats();
    } catch (error) {
      console.error('Error deleting course:', error);
      showToast(error.response?.data?.message || 'Failed to delete course. Please try again.', 'error');
    } finally {
      setActionLoading(false);
      setSelectedCourse(null);
    }
  };

  const handleViewCourseDetails = async (course) => {
    try {
      setActionLoading(true);
      const response = await adminCoursesAPI.getById(course.id);
      const courseData = response.data.data.course || response.data.data;
      setSelectedCourse(courseData);
      setIsViewModalOpen(true);
    } catch (error) {
      console.error('Error fetching course details:', error);
      showToast('Failed to load course details. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditCourse = async (course) => {
    try {
      setActionLoading(true);
      const response = await adminCoursesAPI.getById(course.id);
      const courseData = response.data.data.course || response.data.data;

      setSelectedCourse(courseData);
      setEditForm({
        title: courseData.title || '',
        description: courseData.description || '',
        category_id: courseData.category_id || '',
        level: courseData.level || 'beginner',
        price: courseData.price || 0,
        duration_hours: courseData.duration_hours || '',
        thumbnail_url: courseData.thumbnail_url || ''
      });
      setFormErrors({});
      setIsEditModalOpen(true);
    } catch (error) {
      console.error('Error fetching course details:', error);
      showToast('Failed to load course details. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditFormChange = (e) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleCreateFormChange = (e) => {
    const { name, value } = e.target;
    setCreateForm(prev => ({ ...prev, [name]: value }));
    setFormErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleUpdateCourse = async () => {
    if (!selectedCourse) return;

    // Validate form
    const validation = validateCourseForm(editForm);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      showToast(formatErrors(validation.errors), 'error');
      return;
    }

    try {
      setActionLoading(true);
      await adminCoursesAPI.update(selectedCourse.id, editForm);
      setIsEditModalOpen(false);
      setFormErrors({});
      showToast('Course updated successfully', 'success');
      fetchCourses();
      fetchStats();
    } catch (error) {
      console.error('Error updating course:', error);
      showToast(error.response?.data?.message || 'Failed to update course. Please try again.', 'error');
    } finally {
      setActionLoading(false);
      setSelectedCourse(null);
    }
  };

  const handleCreateCourse = async () => {
    // Validate form
    const validation = validateCourseForm(createForm);
    if (!validation.isValid) {
      setFormErrors(validation.errors);
      showToast(formatErrors(validation.errors), 'error');
      return;
    }

    try {
      setActionLoading(true);
      await adminCoursesAPI.create(createForm);
      setIsCreateModalOpen(false);
      setCreateForm({
        title: '',
        description: '',
        category_id: '',
        level: 'beginner',
        price: 0,
        duration_hours: '',
        thumbnail_url: ''
      });
      setFormErrors({});
      showToast('Course created successfully', 'success');
      fetchCourses();
      fetchStats();
    } catch (error) {
      console.error('Error creating course:', error);
      showToast(error.response?.data?.message || 'Failed to create course. Please try again.', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Sanitize CSV value to prevent CSV injection
  const sanitizeCSVValue = (value) => {
    if (value === null || value === undefined) return '';
    const strValue = String(value);
    // Prevent CSV injection by escaping formulas
    if (strValue.match(/^[=+\-@]/)) {
      return "'" + strValue;
    }
    return strValue;
  };

  // Export to CSV (exports ALL courses, not just current page)
  const handleExportCSV = async () => {
    try {
      setActionLoading(true);
      showToast('Preparing export...', 'info');

      // Fetch all courses for export (no pagination)
      const response = await adminCoursesAPI.getAll({ ...filters, limit: 10000, page: 1 });
      const allCourses = response.data.data.courses || [];

      if (allCourses.length === 0) {
        showToast('No courses to export', 'warning');
        return;
      }

      const csvData = allCourses.map(course => ({
        'Title': sanitizeCSVValue(course.title),
        'Instructor': sanitizeCSVValue(course.instructor?.full_name || 'N/A'),
        'Category': sanitizeCSVValue(course.category?.name || 'N/A'),
        'Level': sanitizeCSVValue(course.level),
        'Status': sanitizeCSVValue(course.status),
        'Price': sanitizeCSVValue(course.price || 0),
        'Modules': sanitizeCSVValue(course.module_count || 0),
        'Lessons': sanitizeCSVValue(course.content_count || 0),
        'Students': sanitizeCSVValue(course.enrolled_count || 0),
        'Created': sanitizeCSVValue(new Date(course.created_at).toLocaleDateString()),
      }));

      const headers = Object.keys(csvData[0]);
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `courses_export_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();

      showToast(`Successfully exported ${allCourses.length} courses`, 'success');
    } catch (error) {
      console.error('Error exporting courses:', error);
      showToast('Failed to export courses', 'error');
    } finally {
      setActionLoading(false);
    }
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

  const getLevelBadgeColor = (level) => {
    switch (level) {
      case 'beginner': return 'success';
      case 'intermediate': return 'warning';
      case 'advanced': return 'danger';
      default: return 'default';
    }
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                    Course Management
                  </h1>
                  <p className="text-lg text-white/90 animate-fade-in mt-1">
                    Manage courses, approve submissions, and monitor performance
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleExportCSV}
                  disabled={courses.length === 0}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button
                  onClick={() => {
                    setCreateForm({
                      title: '',
                      description: '',
                      category_id: '',
                      level: 'beginner',
                      price: 0,
                      duration_hours: '',
                      thumbnail_url: ''
                    });
                    setFormErrors({});
                    setIsCreateModalOpen(true);
                  }}
                  className="bg-white text-brand-blue hover:bg-white/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Course
                </Button>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                  <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Courses</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total || 0}</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Published</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.published || 0}</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
                  <Clock className="w-5 h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending || 0}</p>
            </div>

            <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gray-100 dark:bg-gray-900/30 rounded-lg">
                  <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                </div>
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Draft</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.draft || 0}</p>
            </div>
          </div>
        )}

        {/* Bulk Actions Bar */}
        {showBulkActions && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-200">
              {selectedCourses.length} course(s) selected
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkPublish}
                disabled={actionLoading}
                className="text-green-600 border-green-300 hover:bg-green-50"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Publish
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={handleBulkArchive}
                disabled={actionLoading}
                className="text-yellow-600 border-yellow-300 hover:bg-yellow-50"
              >
                <Archive className="w-4 h-4 mr-1" />
                Archive
              </Button>
              {currentUser?.role === 'super_admin' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleBulkDelete}
                  disabled={actionLoading}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Delete
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedCourses([])}
              >
                Clear
              </Button>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="lg:col-span-2">
              <Input
                placeholder="Search courses by title..."
                leftIcon={<Search className="w-4 h-4" />}
                value={filters.search}
                onChange={handleSearchChange}
              />
            </div>
            <Select
              value={filters.status}
              onChange={handleStatusChange}
              options={[
                { value: '', label: 'All Status' },
                { value: 'published', label: 'Published' },
                { value: 'pending', label: 'Pending' },
                { value: 'draft', label: 'Draft' },
                { value: 'archived', label: 'Archived' },
              ]}
            />
            <Select
              value={filters.category_id}
              onChange={handleCategoryChange}
              options={[
                { value: '', label: 'All Categories' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
            />
            <Select
              value={filters.level}
              onChange={handleLevelChange}
              options={[
                { value: '', label: 'All Levels' },
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]}
            />
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <Input
              label="From Date"
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters(prev => ({ ...prev, dateFrom: e.target.value, page: 1 }))}
            />
            <Input
              label="To Date"
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters(prev => ({ ...prev, dateTo: e.target.value, page: 1 }))}
            />
          </div>

          <div className="mt-4 flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setFilters({
                  search: '',
                  status: '',
                  category_id: '',
                  level: '',
                  dateFrom: '',
                  dateTo: '',
                  page: 1,
                  limit: 10,
                  sortBy: 'created_at',
                  sortOrder: 'desc'
                });
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Courses Table */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 flex justify-center">
              <Spinner size="lg" />
            </div>
          ) : courses.length === 0 ? (
            <div className="p-8 text-center">
              <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No courses found</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-border-dark">
                    <tr>
                      <th className="px-3 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedCourses.length === courses.length}
                          onChange={handleSelectAll}
                          className="rounded border-gray-300 dark:border-border-dark"
                        />
                      </th>
                      <th
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600"
                        onClick={() => handleSort('title')}
                      >
                        <div className="flex items-center">
                          Course
                          {getSortIcon('title')}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Instructor
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Content
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Questions
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Level
                      </th>
                      <th
                        className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-600"
                        onClick={() => handleSort('status')}
                      >
                        <div className="flex items-center">
                          Status
                          {getSortIcon('status')}
                        </div>
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Students
                      </th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Price
                      </th>
                      <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                    {courses.map((course) => (
                      <tr key={course.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                        <td className="px-3 py-4 whitespace-nowrap">
                          <input
                            type="checkbox"
                            checked={selectedCourses.includes(course.id)}
                            onChange={() => handleSelectCourse(course.id)}
                            className="rounded border-gray-300 dark:border-border-dark"
                          />
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center">
                            {course.thumbnail_url && (
                              <img
                                src={course.thumbnail_url}
                                alt={course.title}
                                className="w-12 h-12 rounded-lg object-cover mr-3"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {course.title}
                              </div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {course.category?.name || 'Uncategorized'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {course.instructor?.full_name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-600 dark:text-gray-400">
                            {course.module_count || 0} modules
                            {course.content_count > 0 && (
                              <div className="text-xs text-gray-500 dark:text-text-dark-tertiary">
                                {course.content_count} lessons
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          {(() => {
                            const qStats = getQuestionStatsForCourse(course.id);
                            return (
                              <div className="text-sm">
                                <div className="flex items-center text-gray-900 dark:text-white font-medium">
                                  <HelpCircle className="w-4 h-4 mr-1 text-gray-400" />
                                  {qStats.total}
                                </div>
                                {qStats.total > 0 && (
                                  <div className="text-xs text-gray-500 dark:text-text-dark-tertiary mt-0.5">
                                    <span className="text-green-600 dark:text-green-400">{qStats.approved}✓</span>
                                    {qStats.pending > 0 && (
                                      <span className="text-yellow-600 dark:text-yellow-400 ml-1">{qStats.pending}⏳</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <Badge variant={getLevelBadgeColor(course.level)}>
                            {course.level}
                          </Badge>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <Badge variant={getStatusBadgeColor(course.status)}>
                            {course.status}
                          </Badge>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                            <Users className="w-4 h-4 mr-1" />
                            {course.enrolled_count || 0}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-900 dark:text-white font-medium">
                            <DollarSign className="w-4 h-4" />
                            {course.price || 0}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                              onClick={() => navigate(`/courses/${course.id}/builder`)}
                              title="Build Course Content"
                            >
                              <Hammer className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => handleViewCourseDetails(course)}
                              title="View Details"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                              onClick={() => handleEditCourse(course)}
                              title="Edit Course"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>

                            {course.status === 'pending' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                                  onClick={() => handleApproveCourse(course)}
                                  title="Approve Course"
                                  disabled={actionLoading}
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                  onClick={() => handleRejectCourse(course)}
                                  title="Reject Course"
                                  disabled={actionLoading}
                                >
                                  <XCircle className="w-4 h-4" />
                                </Button>
                              </>
                            )}

                            {course.status === 'published' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                                onClick={() => handleArchiveCourse(course)}
                                title="Archive Course"
                                disabled={actionLoading}
                              >
                                <Archive className="w-4 h-4" />
                              </Button>
                            )}

                            {currentUser?.role === 'super_admin' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                onClick={() => {
                                  setSelectedCourse(course);
                                  setIsDeleteModalOpen(true);
                                }}
                                title="Delete Course"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination && (
                <div className="px-3 py-4 border-t border-gray-200 dark:border-border-dark">
                  <SimplePagination
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

      {/* View Course Modal */}
      <Modal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedCourse(null);
        }}
        title="Course Details"
        size="lg"
      >
        {selectedCourse && (
          <div className="space-y-4">
            {selectedCourse.thumbnail_url && (
              <img
                src={selectedCourse.thumbnail_url}
                alt={selectedCourse.title}
                className="w-full h-48 object-cover rounded-lg"
              />
            )}
            <div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {selectedCourse.title}
              </h3>
              <div className="flex gap-2 mb-4">
                <Badge variant={getStatusBadgeColor(selectedCourse.status)}>
                  {selectedCourse.status}
                </Badge>
                <Badge variant={getLevelBadgeColor(selectedCourse.level)}>
                  {selectedCourse.level}
                </Badge>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Instructor</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedCourse.instructor?.full_name || 'Unknown'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Category</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedCourse.category?.name || 'Uncategorized'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Price</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  ${selectedCourse.price || 0}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Students Enrolled</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {selectedCourse.enrolled_count || 0}
                </p>
              </div>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Description</p>
              <p className="text-sm text-gray-700 dark:text-gray-400 whitespace-pre-wrap">
                {selectedCourse.description}
              </p>
            </div>

            {/* Course Content Structure */}
            {selectedCourse.modules && selectedCourse.modules.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Course Content
                  </h4>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {selectedCourse.modules.length} modules • {selectedCourse.modules.reduce((acc, mod) => acc + (mod.contents?.length || 0), 0)} lessons
                  </span>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {selectedCourse.modules.map((module, idx) => (
                    <div key={module.id} className="border border-gray-200 dark:border-border-dark rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Module {idx + 1}
                        </span>
                        <h5 className="text-sm font-medium text-gray-900 dark:text-white flex-1">
                          {module.title}
                        </h5>
                        {module.contents && module.contents.length > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {module.contents.length} {module.contents.length === 1 ? 'lesson' : 'lessons'}
                          </span>
                        )}
                      </div>
                      {module.contents && module.contents.length > 0 && (
                        <div className="pl-4 space-y-1">
                          {module.contents.map((content) => (
                            <div key={content.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                              {content.content_type === 'video' && <FileText className="w-3 h-3 text-blue-500" />}
                              {content.content_type === 'document' && <FileText className="w-3 h-3 text-green-500" />}
                              {content.content_type === 'article' && <FileText className="w-3 h-3 text-purple-500" />}
                              <span className="flex-1">{content.title}</span>
                              {content.duration_minutes && (
                                <span className="text-gray-400">{content.duration_minutes}min</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state for courses with no content */}
            {(!selectedCourse.modules || selectedCourse.modules.length === 0) && (
              <div className="text-center py-6 bg-gray-50 dark:bg-dark-700 rounded-lg">
                <BookOpen className="w-12 h-12 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  No course content yet
                </p>
                <p className="text-xs text-gray-400 dark:text-text-dark-tertiary">
                  Modules and lessons will appear here once added
                </p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-border-dark">
              <Button
                variant="outline"
                onClick={() => {
                  setIsViewModalOpen(false);
                  setSelectedCourse(null);
                }}
              >
                Close
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsViewModalOpen(false);
                  handleEditCourse(selectedCourse);
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Course
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Create Course Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setFormErrors({});
        }}
        title="Create New Course"
        size="lg"
      >
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleCreateCourse(); }}>
          <Input
            label="Course Title"
            name="title"
            value={createForm.title}
            onChange={handleCreateFormChange}
            placeholder="Enter course title"
            required
            error={formErrors.title}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
              Description
            </label>
            <textarea
              name="description"
              value={createForm.description}
              onChange={handleCreateFormChange}
              rows="4"
              className={cn(
                'w-full px-4 py-2.5 bg-white dark:bg-dark-700 border rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none',
                formErrors.description ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-border-dark'
              )}
              placeholder="Enter course description"
              required
            />
            {formErrors.description && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Category"
              name="category_id"
              value={createForm.category_id}
              onChange={handleCreateFormChange}
              options={[
                { value: '', label: 'Select Category' },
                ...categories.map(cat => ({ value: cat.id, label: cat.name }))
              ]}
              required
              error={formErrors.category_id}
            />
            <Select
              label="Level"
              name="level"
              value={createForm.level}
              onChange={handleCreateFormChange}
              options={[
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
                { value: 'advanced', label: 'Advanced' },
              ]}
              required
              error={formErrors.level}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Price ($)"
              name="price"
              type="number"
              min="0"
              step="0.01"
              value={createForm.price}
              onChange={handleCreateFormChange}
              placeholder="0.00"
              error={formErrors.price}
            />
            <Input
              label="Duration (hours)"
              name="duration_hours"
              type="number"
              min="0"
              value={createForm.duration_hours}
              onChange={handleCreateFormChange}
              placeholder="Optional"
              error={formErrors.duration_hours}
            />
          </div>

          <Input
            label="Thumbnail URL (Optional)"
            name="thumbnail_url"
            type="url"
            value={createForm.thumbnail_url}
            onChange={handleCreateFormChange}
            placeholder="https://example.com/image.jpg"
            error={formErrors.thumbnail_url}
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-border-dark">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false);
                setFormErrors({});
              }}
              disabled={actionLoading}
              type="button"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              type="submit"
              isLoading={actionLoading}
            >
              Create Course
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Course Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedCourse(null);
          setFormErrors({});
        }}
        title="Edit Course"
        size="lg"
      >
        {selectedCourse && (
          <form className="space-y-4">
            <Input
              label="Course Title"
              name="title"
              value={editForm.title}
              onChange={handleEditFormChange}
              placeholder="Enter course title"
              required
              error={formErrors.title}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-white mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={editForm.description}
                onChange={handleEditFormChange}
                rows="4"
                className={cn(
                  'w-full px-4 py-2.5 bg-white dark:bg-dark-700 border rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-all resize-none',
                  formErrors.description ? 'border-red-300 dark:border-red-700' : 'border-gray-300 dark:border-border-dark'
                )}
                placeholder="Enter course description"
                required
              />
              {formErrors.description && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Category"
                name="category_id"
                value={editForm.category_id}
                onChange={handleEditFormChange}
                options={[
                  { value: '', label: 'Select Category' },
                  ...categories.map(cat => ({ value: cat.id, label: cat.name }))
                ]}
                required
                error={formErrors.category_id}
              />
              <Select
                label="Level"
                name="level"
                value={editForm.level}
                onChange={handleEditFormChange}
                options={[
                  { value: 'beginner', label: 'Beginner' },
                  { value: 'intermediate', label: 'Intermediate' },
                  { value: 'advanced', label: 'Advanced' },
                ]}
                required
                error={formErrors.level}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Price ($)"
                name="price"
                type="number"
                min="0"
                step="0.01"
                value={editForm.price}
                onChange={handleEditFormChange}
                placeholder="0.00"
                error={formErrors.price}
              />
              <Input
                label="Duration (hours)"
                name="duration_hours"
                type="number"
                min="0"
                value={editForm.duration_hours}
                onChange={handleEditFormChange}
                placeholder="Optional"
                error={formErrors.duration_hours}
              />
            </div>

            <Input
              label="Thumbnail URL"
              name="thumbnail_url"
              type="url"
              value={editForm.thumbnail_url}
              onChange={handleEditFormChange}
              placeholder="https://example.com/image.jpg"
              error={formErrors.thumbnail_url}
            />

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-border-dark">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedCourse(null);
                  setFormErrors({});
                }}
                disabled={actionLoading}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleUpdateCourse}
                isLoading={actionLoading}
              >
                Save Changes
              </Button>
            </div>
          </form>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedCourse(null);
        }}
        title="Delete Course"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Are you sure you want to delete <strong>{selectedCourse?.title}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => {
              setIsDeleteModalOpen(false);
              setSelectedCourse(null);
            }}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteCourse}
            isLoading={actionLoading}
          >
            Delete Course
          </Button>
        </div>
      </Modal>
    </>
  );
}
