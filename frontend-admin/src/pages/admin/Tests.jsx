import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Users,
  Clock,
  CheckCircle,
  Archive,
  BarChart3,
  MoreVertical
} from 'lucide-react';
import { adminTestsAPI, coursesAPI } from '../../lib/api';
import { Button, Input, Select, Badge, Spinner, Modal, Dropdown } from '../../components/ui';
import Container from '../../components/layout/Container';
import StatsCard from '../../components/ui/StatsCard';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';

export default function Tests() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // State
  const [tests, setTests] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    published: 0,
    archived: 0
  });

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    course_id: '',
    status: ''
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Modals
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [testToDelete, setTestToDelete] = useState(null);

  // Fetch courses
  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch tests when filters or pagination change
  useEffect(() => {
    fetchTests();
  }, [filters, pagination.page]);

  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.getAll();
      setCourses(response.data.data?.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchTests = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };

      const response = await adminTestsAPI.getAll(params);
      const data = response.data.data;

      setTests(data.tests || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));

      // Calculate stats
      calculateStats(data.tests || []);
    } catch (error) {
      console.error('Failed to fetch tests:', error);
      showToast('Failed to load tests', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (testsData) => {
    const newStats = {
      total: testsData.length,
      draft: testsData.filter(t => t.status === 'draft').length,
      published: testsData.filter(t => t.status === 'published').length,
      archived: testsData.filter(t => t.status === 'archived').length
    };
    setStats(newStats);
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleClearFilters = () => {
    setFilters({
      search: '',
      course_id: '',
      status: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleCreateTest = () => {
    navigate('/test-builder');
  };

  const handleEditTest = (test) => {
    navigate(`/test-builder/${test.id}`);
  };

  const handleViewResults = (test) => {
    navigate(`/test-results/${test.id}`);
  };

  const handlePublishTest = async (test) => {
    try {
      await adminTestsAPI.publish(test.id);
      showToast('Test published successfully', 'success');
      fetchTests();
    } catch (error) {
      console.error('Failed to publish test:', error);
      showToast(error.response?.data?.message || 'Failed to publish test', 'error');
    }
  };

  const handleArchiveTest = async (test) => {
    try {
      await adminTestsAPI.archive(test.id);
      showToast('Test archived successfully', 'success');
      fetchTests();
    } catch (error) {
      console.error('Failed to archive test:', error);
      showToast(error.response?.data?.message || 'Failed to archive test', 'error');
    }
  };

  const handleDeleteTest = (test) => {
    setTestToDelete(test);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!testToDelete) return;

    try {
      await adminTestsAPI.delete(testToDelete.id);
      showToast('Test deleted successfully', 'success');
      setShowDeleteModal(false);
      setTestToDelete(null);
      fetchTests();
    } catch (error) {
      console.error('Failed to delete test:', error);
      showToast(error.response?.data?.message || 'Failed to delete test', 'error');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'gray', label: 'Draft' },
      published: { color: 'green', label: 'Published' },
      archived: { color: 'yellow', label: 'Archived' }
    };
    const config = statusConfig[status] || statusConfig.draft;
    return <Badge color={config.color}>{config.label}</Badge>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
                  <FileText className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                    Tests Management
                  </h1>
                  <p className="text-lg text-white/90 animate-fade-in mt-1">
                    Create, manage, and track assigned tests for your courses
                  </p>
                </div>
              </div>
              <Button
                onClick={handleCreateTest}
                className="bg-white text-brand-blue hover:bg-white/90"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create Test
              </Button>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Total Tests"
          value={stats.total}
          icon={FileText}
          color="blue"
        />
        <StatsCard
          title="Draft"
          value={stats.draft}
          icon={Edit}
          color="gray"
        />
        <StatsCard
          title="Published"
          value={stats.published}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Archived"
          value={stats.archived}
          icon={Archive}
          color="yellow"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <Input
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="Search tests..."
                className="pl-10"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Course
            </label>
            <Select
              value={filters.course_id}
              onChange={(e) => handleFilterChange('course_id', e.target.value)}
            >
              <option value="">All Courses</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <Select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
            >
              <option value="">All Status</option>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="archived">Archived</option>
            </Select>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={handleClearFilters}>
            Clear Filters
          </Button>
        </div>
      </div>

      {/* Tests List */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center p-12">
            <Spinner size="lg" />
          </div>
        ) : tests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No tests found
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filters.search || filters.course_id || filters.status
                ? 'Try adjusting your filters'
                : 'Get started by creating your first test'}
            </p>
            <Button onClick={handleCreateTest}>
              <Plus className="w-5 h-5 mr-2" />
              Create Test
            </Button>
          </div>
        ) : (
          <>
            {/* Tests Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Test Name
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Course
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Questions
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Students
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Due Date
                    </th>
                    <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {tests.map((test) => (
                    <tr
                      key={test.id}
                      className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                    >
                      <td className="px-3 py-4">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-gray-400 mr-3" />
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {test.title}
                            </p>
                            {test.description && (
                              <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                                {test.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <p className="text-sm text-gray-900 dark:text-white">
                          {test.course?.title || 'N/A'}
                        </p>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          {test.question_count || 0}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Users className="w-4 h-4 mr-1" />
                          {test.assigned_students_count || 0}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        {getStatusBadge(test.status)}
                      </td>
                      <td className="px-3 py-4">
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                          <Clock className="w-4 h-4 mr-1" />
                          {formatDate(test.due_date)}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-right">
                        <Dropdown>
                          {({ isOpen, setIsOpen }) => (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setIsOpen(!isOpen)}
                                className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                              {isOpen && (
                                <Dropdown.Menu align="right">
                                  <Dropdown.Item
                                    icon={BarChart3}
                                    onClick={() => {
                                      setIsOpen(false);
                                      handleViewResults(test);
                                    }}
                                  >
                                    View Results
                                  </Dropdown.Item>
                                  <Dropdown.Item
                                    icon={Edit}
                                    onClick={() => {
                                      setIsOpen(false);
                                      handleEditTest(test);
                                    }}
                                  >
                                    Edit Test
                                  </Dropdown.Item>
                                  {test.status === 'draft' && (
                                    <Dropdown.Item
                                      icon={CheckCircle}
                                      onClick={() => {
                                        setIsOpen(false);
                                        handlePublishTest(test);
                                      }}
                                    >
                                      Publish Test
                                    </Dropdown.Item>
                                  )}
                                  {test.status === 'published' && (
                                    <Dropdown.Item
                                      icon={Archive}
                                      onClick={() => {
                                        setIsOpen(false);
                                        handleArchiveTest(test);
                                      }}
                                    >
                                      Archive Test
                                    </Dropdown.Item>
                                  )}
                                  <Dropdown.Separator />
                                  <Dropdown.Item
                                    icon={Trash2}
                                    onClick={() => {
                                      setIsOpen(false);
                                      handleDeleteTest(test);
                                    }}
                                    danger
                                  >
                                    Delete Test
                                  </Dropdown.Item>
                                </Dropdown.Menu>
                              )}
                            </>
                          )}
                        </Dropdown>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
              />
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Test"
        >
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete this test? This action cannot be undone and will also delete all student attempts and results.
            </p>
            <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {testToDelete?.title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {testToDelete?.question_count || 0} questions, {testToDelete?.assigned_students_count || 0} students assigned
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Delete Test
              </Button>
            </div>
          </div>
        </Modal>
      )}
      </Container>
    </>
  );
}
