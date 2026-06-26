import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useToast } from '../../components/ui/Toast';
import { adminEnrollmentsAPI, adminUsersAPI, adminCoursesAPI } from '../../lib/api';
import {
  Users,
  Search,
  Plus,
  Trash2,
  BookOpen,
  CheckCircle,
  Clock,
  TrendingUp,
  UserCheck,
  RefreshCw,
} from 'lucide-react';
import { Container, PageHeader } from '../../components/layout';
import { Button, Input, Select, Badge, Spinner, Modal } from '../../components/ui';
import { SimplePagination } from '../../components/ui/Pagination';

export default function Enrollments() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams] = useSearchParams();

  const [enrollments, setEnrollments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  const [filters, setFilters] = useState({
    course_id: searchParams.get('course_id') || '',
    student_id: searchParams.get('student_id') || '',
    completed: '',
    search: '',
    page: 1,
    limit: 20,
  });

  // For the enroll modal
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [enrollForm, setEnrollForm] = useState({ student_id: '', course_id: '' });
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  // For remove confirmation
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  useEffect(() => {
    fetchEnrollments();
    fetchStats();
  }, [filters.page, filters.course_id, filters.student_id, filters.completed]);

  useEffect(() => {
    const timer = setTimeout(() => fetchEnrollments(), 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  useEffect(() => {
    if (isEnrollModalOpen) {
      fetchStudentsAndCourses();
    }
  }, [isEnrollModalOpen]);

  const fetchEnrollments = async () => {
    try {
      setLoading(true);
      const response = await adminEnrollmentsAPI.getAll(filters);
      setEnrollments(response.data.data.enrollments || []);
      setPagination(response.data.data.pagination);
    } catch (error) {
      showToast('Failed to load enrollments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await adminEnrollmentsAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  const fetchStudentsAndCourses = async () => {
    try {
      const [studentsRes, coursesRes] = await Promise.all([
        adminUsersAPI.getAll({ role: 'student', limit: 1000 }),
        adminCoursesAPI.getAll({ status: 'published', limit: 500 }),
      ]);
      setStudents(studentsRes.data.data?.users || []);
      setCourses(coursesRes.data.data?.courses || []);
    } catch (error) {
      console.error('Failed to fetch students/courses:', error);
    }
  };

  const handleEnroll = async () => {
    if (!enrollForm.student_id || !enrollForm.course_id) {
      showToast('Select a student and a course', 'error');
      return;
    }
    try {
      setEnrollLoading(true);
      await adminEnrollmentsAPI.create(enrollForm);
      showToast('Student enrolled successfully', 'success');
      setIsEnrollModalOpen(false);
      setEnrollForm({ student_id: '', course_id: '' });
      fetchEnrollments();
      fetchStats();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to enroll student', 'error');
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleRemove = async () => {
    if (!removeTarget) return;
    try {
      setRemoveLoading(true);
      await adminEnrollmentsAPI.remove(removeTarget.id);
      showToast('Enrollment removed', 'success');
      setRemoveTarget(null);
      fetchEnrollments();
      fetchStats();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to remove enrollment', 'error');
    } finally {
      setRemoveLoading(false);
    }
  };

  const progressColor = (pct) => {
    if (pct >= 100) return 'bg-green-500';
    if (pct >= 50) return 'bg-blue-500';
    if (pct > 0) return 'bg-yellow-500';
    return 'bg-gray-300 dark:bg-gray-600';
  };

  return (
    <>
      <PageHeader
        icon={UserCheck}
        title="Enrollment Management"
        subtitle="View, manage, and manually create student enrollments"
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEnrollModalOpen(true)}
            leftIcon={<Plus className="h-4 w-4" />}
            className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
          >
            Enroll Student
          </Button>
        }
      />
      <Container className="py-8">

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'Total Enrollments', value: stats.total, icon: Users, color: 'text-blue-600' },
              { label: 'Completed', value: stats.completed, icon: CheckCircle, color: 'text-green-600' },
              { label: 'In Progress', value: stats.in_progress, icon: TrendingUp, color: 'text-yellow-600' },
              { label: 'Not Started', value: stats.not_started, icon: Clock, color: 'text-gray-500' },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-4">
                <div className="flex items-center gap-3 mb-2">
                  <Icon className={`w-5 h-5 ${color}`} />
                  <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                </div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value ?? '—'}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Input
              placeholder="Search student name or email..."
              leftIcon={<Search className="w-4 h-4" />}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
            />
            <Select
              value={filters.completed}
              onChange={(e) => setFilters(prev => ({ ...prev, completed: e.target.value, page: 1 }))}
              placeholder="All Progress"
              options={[
                { value: '', label: 'All Progress' },
                { value: 'true', label: 'Completed' },
                { value: 'false', label: 'Not Completed' },
              ]}
            />
            {filters.course_id && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-blue-700 dark:text-blue-300">
                <BookOpen className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Filtered by course</span>
                <button onClick={() => setFilters(prev => ({ ...prev, course_id: '', page: 1 }))} className="ml-auto text-blue-400 hover:text-blue-600">✕</button>
              </div>
            )}
            {filters.student_id && (
              <div className="flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg text-sm text-purple-700 dark:text-purple-300">
                <UserCheck className="w-4 h-4 flex-shrink-0" />
                <span className="truncate">Filtered by student</span>
                <button onClick={() => setFilters(prev => ({ ...prev, student_id: '', page: 1 }))} className="ml-auto text-purple-400 hover:text-purple-600">✕</button>
              </div>
            )}
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setFilters({ course_id: '', student_id: '', completed: '', search: '', page: 1, limit: 20 })}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset
            </Button>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><Spinner size="lg" /></div>
          ) : enrollments.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">No enrollments found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-border-dark">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden md:table-cell">Course</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Progress</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase hidden lg:table-cell">Enrolled</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                    {enrollments.map((enrollment) => (
                      <tr key={enrollment.id} className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-xs font-semibold text-blue-600 dark:text-blue-400">
                              {enrollment.student?.full_name?.charAt(0) || '?'}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white">{enrollment.student?.full_name || '—'}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                {/* On phones (Course column hidden) surface the course inline */}
                                <span className="md:hidden">{enrollment.course?.title || enrollment.student?.email}</span>
                                <span className="hidden md:inline">{enrollment.student?.email}</span>
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell">
                          <p className="text-sm text-gray-900 dark:text-white line-clamp-1">{enrollment.course?.title || '—'}</p>
                        </td>
                        <td className="px-4 py-3 min-w-[140px] hidden lg:table-cell">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                              <div
                                className={`h-1.5 rounded-full ${progressColor(enrollment.progress_percentage)}`}
                                style={{ width: `${enrollment.progress_percentage || 0}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500 dark:text-gray-400 w-9 text-right">
                              {Math.round(enrollment.progress_percentage || 0)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                          {enrollment.enrollment_date ? new Date(enrollment.enrollment_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          {enrollment.completed_at ? (
                            <Badge variant="success">Completed</Badge>
                          ) : enrollment.progress_percentage > 0 ? (
                            <Badge variant="warning">In Progress</Badge>
                          ) : (
                            <Badge variant="default">Not Started</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/users/${enrollment.student_id}`)}
                              title="View Student"
                            >
                              <UserCheck className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setFilters(prev => ({ ...prev, course_id: enrollment.course_id, page: 1 }))}
                              title="Filter by this course"
                            >
                              <BookOpen className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setRemoveTarget(enrollment)}
                              title="Remove Enrollment"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-border-dark">
                  <SimplePagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Container>

      {/* Enroll Student Modal */}
      <Modal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)} title="Enroll Student" size="md">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Manually enroll a student in a course. This bypasses payment and grants immediate access.
          </p>
          <Select
            label="Student"
            value={enrollForm.student_id}
            onChange={(e) => setEnrollForm(prev => ({ ...prev, student_id: e.target.value }))}
            options={[
              { value: '', label: 'Select a student...' },
              ...students.map(s => ({ value: s.id, label: `${s.full_name} — ${s.email}` }))
            ]}
          />
          <Select
            label="Course"
            value={enrollForm.course_id}
            onChange={(e) => setEnrollForm(prev => ({ ...prev, course_id: e.target.value }))}
            options={[
              { value: '', label: 'Select a course...' },
              ...courses.map(c => ({ value: c.id, label: c.title }))
            ]}
          />
          <div className="flex justify-end gap-3 pt-3 border-t border-gray-200 dark:border-border-dark">
            <Button variant="outline" onClick={() => setIsEnrollModalOpen(false)} disabled={enrollLoading}>
              Cancel
            </Button>
            <Button onClick={handleEnroll} isLoading={enrollLoading}>
              Enroll Student
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Confirmation Modal */}
      <Modal isOpen={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Remove Enrollment" size="sm">
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Remove <strong>{removeTarget?.student?.full_name}</strong> from <strong>{removeTarget?.course?.title}</strong>?
          Their progress will be lost.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setRemoveTarget(null)} disabled={removeLoading}>Cancel</Button>
          <Button variant="danger" onClick={handleRemove} isLoading={removeLoading}>Remove Enrollment</Button>
        </div>
      </Modal>
    </>
  );
}
