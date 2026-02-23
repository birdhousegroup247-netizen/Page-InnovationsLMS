import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  UserPlus,
  UserMinus,
  Search,
  Mail,
  Calendar,
  TrendingUp,
  Download,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle,
  Copy,
  Upload,
} from 'lucide-react';
import { instructorAPI, coursesAPI, bulkEnrollAPI } from '../../lib/api';
import { Container, EmptyState } from '../../components/layout';
import { Button, Spinner, Alert, Modal } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function EnrollmentManagement() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, completed

  // Modals
  const [showEnrollmentLink, setShowEnrollmentLink] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Bulk Enroll
  const [showBulkEnroll, setShowBulkEnroll] = useState(false);
  const [bulkEmails, setBulkEmails] = useState('');
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  useEffect(() => {
    if (courseId) {
      fetchEnrollmentData();
    }
  }, [courseId]);

  const fetchEnrollmentData = async () => {
    try {
      setLoading(true);
      setError('');

      const [courseResponse, enrollmentsResponse] = await Promise.all([
        coursesAPI.getById(courseId),
        instructorAPI.getCourseEnrollments(courseId),
      ]);

      setCourse(courseResponse.data.data.course);
      setEnrollments(enrollmentsResponse.data.data.enrollments || []);
    } catch (err) {
      console.error('Error fetching enrollment data:', err);
      setError(err.response?.data?.message || 'Failed to load enrollment data');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const handleBulkEnroll = async () => {
    const emails = bulkEmails.split(/[\n,;]+/).map((e) => e.trim()).filter(Boolean);
    if (!emails.length) return;
    setBulkLoading(true);
    setBulkResult(null);
    try {
      const r = await bulkEnrollAPI.bulkEnroll(courseId, emails);
      setBulkResult(r.data?.data?.results);
      // Refresh enrollment list
      const updated = await instructorAPI.getCourseEnrollments(courseId);
      setEnrollments(updated.data.data.enrollments || []);
    } catch (err) {
      setBulkResult({ error: err.response?.data?.message || 'Failed to enroll' });
    } finally { setBulkLoading(false); }
  };

  const handleCopyEnrollmentLink = () => {
    const enrollmentLink = `${window.location.origin}/courses/${courseId}`;
    navigator.clipboard.writeText(enrollmentLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 3000);
  };

  const exportEnrollments = () => {
    // Create CSV content
    const headers = ['Name', 'Email', 'Enrolled Date', 'Progress', 'Status', 'Last Active'];
    const rows = filteredEnrollments.map((enrollment) => [
      enrollment.student?.full_name || 'Unknown',
      enrollment.student?.email || 'N/A',
      formatDate(enrollment.enrolled_at),
      `${Math.round(enrollment.progress_percentage || 0)}%`,
      enrollment.completed_at ? 'Completed' : 'In Progress',
      formatDate(enrollment.last_accessed),
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${course?.title || 'course'}-enrollments-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    setSuccess('Enrollment data exported successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  // Filter enrollments
  const filteredEnrollments = enrollments.filter((enrollment) => {
    // Search filter
    const studentName = enrollment.student?.full_name?.toLowerCase() || '';
    const studentEmail = enrollment.student?.email?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    const matchesSearch = studentName.includes(query) || studentEmail.includes(query);

    // Status filter
    let matchesStatus = true;
    if (statusFilter === 'active') {
      matchesStatus = !enrollment.completed_at;
    } else if (statusFilter === 'completed') {
      matchesStatus = !!enrollment.completed_at;
    }

    return matchesSearch && matchesStatus;
  });

  // Calculate stats
  const totalEnrollments = enrollments.length;
  const activeEnrollments = enrollments.filter((e) => !e.completed_at).length;
  const completedEnrollments = enrollments.filter((e) => e.completed_at).length;
  const avgProgress = enrollments.length > 0
    ? (enrollments.reduce((sum, e) => sum + (e.progress_percentage || 0), 0) / enrollments.length).toFixed(1)
    : 0;

  if (loading) {
    return (
      <Container className="py-20">
        <div className="flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-text-dark-secondary">
            Loading enrollment data...
          </p>
        </div>
      </Container>
    );
  }

  if (error || !course) {
    return (
      <Container className="py-8">
        <Alert variant="danger">{error || 'Course not found'}</Alert>
        <Button
          onClick={() => navigate('/instructor/dashboard')}
          className="mt-4"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <Link
              to="/instructor/courses"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to My Courses
            </Link>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                  <Users className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                    Enrollment Management
                  </h1>
                  <p className="text-lg text-white/90">{course.title}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  leftIcon={<LinkIcon className="w-4 h-4" />}
                  onClick={() => setShowEnrollmentLink(true)}
                  className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20"
                >
                  Share Link
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Upload className="w-4 h-4" />}
                  onClick={() => { setShowBulkEnroll(true); setBulkResult(null); setBulkEmails(''); }}
                  className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20"
                >
                  Bulk Enroll
                </Button>
                <Button
                  variant="outline"
                  leftIcon={<Download className="w-4 h-4" />}
                  onClick={exportEnrollments}
                  disabled={enrollments.length === 0}
                  className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20"
                >
                  Export
                </Button>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6">
            <Alert variant="success" onClose={() => setSuccess('')}>
              {success}
            </Alert>
          </div>
        )}

        {error && (
          <div className="mb-6">
            <Alert variant="danger" onClose={() => setError('')}>
              {error}
            </Alert>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                  Total Enrollments
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary">
                  {totalEnrollments}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-blue" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                  Active Students
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {activeEnrollments}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                  Completed
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {completedEnrollments}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                  Avg Progress
                </p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {avgProgress}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900 dark:text-blue-400">
              <p className="font-medium mb-1">How to Enroll Students</p>
              <p>
                Share the course link with students, and they can enroll themselves. You can also view and manage all enrollments from this page.
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 rounded-xl p-4 border border-gray-200 dark:border-border-dark mb-6 transition-colors">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
              />
            </div>

            {/* Status Filter */}
            <div className="md:w-64">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
              >
                <option value="all">All Students</option>
                <option value="active">Active Only</option>
                <option value="completed">Completed Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Enrollments List */}
        {filteredEnrollments.length === 0 ? (
          <EmptyState
            icon={<Users className="w-16 h-16" />}
            title={searchQuery || statusFilter !== 'all' ? 'No students found' : 'No enrollments yet'}
            description={
              searchQuery || statusFilter !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'Share the course link to get students enrolled.'
            }
            action={
              <Button
                onClick={() => setShowEnrollmentLink(true)}
                leftIcon={<LinkIcon className="w-4 h-4" />}
              >
                Share Course Link
              </Button>
            }
          />
        ) : (
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark transition-colors overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-border-dark">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-muted uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-muted uppercase tracking-wider">
                      Enrolled Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-muted uppercase tracking-wider">
                      Progress
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-muted uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-muted uppercase tracking-wider">
                      Last Active
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-text-dark-muted uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                  {filteredEnrollments.map((enrollment) => (
                    <tr
                      key={enrollment.id}
                      className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          {enrollment.student?.avatar_url ? (
                            <img
                              src={enrollment.student.avatar_url}
                              alt={enrollment.student.full_name}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
                              <span className="text-white font-medium">
                                {enrollment.student?.full_name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary">
                              {enrollment.student?.full_name || 'Unknown'}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-text-dark-muted">
                              {enrollment.student?.email || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-text-dark-secondary">
                        {formatDate(enrollment.enrolled_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-brand-blue transition-all"
                              style={{ width: `${enrollment.progress_percentage || 0}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium text-gray-700 dark:text-text-dark-secondary">
                            {Math.round(enrollment.progress_percentage || 0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {enrollment.completed_at ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                            <CheckCircle className="w-3 h-3" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400">
                            <TrendingUp className="w-3 h-3" />
                            In Progress
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-text-dark-secondary">
                        {formatDate(enrollment.last_accessed)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/instructor/students/${enrollment.student_id}/progress/${courseId}`)}
                        >
                          View Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </Container>

      {/* Enrollment Link Modal */}
      {showEnrollmentLink && (
        <Modal
          isOpen={showEnrollmentLink}
          onClose={() => {
            setShowEnrollmentLink(false);
            setCopiedLink(false);
          }}
          title="Share Course Link"
        >
          <div className="space-y-4">
            <p className="text-gray-700 dark:text-text-dark-secondary">
              Share this link with students so they can enroll in your course:
            </p>

            <div className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-border-dark">
              <div className="flex items-center gap-3">
                <code className="flex-1 text-sm text-brand-blue font-mono break-all">
                  {window.location.origin}/courses/{courseId}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={copiedLink ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  onClick={handleCopyEnrollmentLink}
                  className={copiedLink ? 'text-green-600 border-green-600' : ''}
                >
                  {copiedLink ? 'Copied!' : 'Copy'}
                </Button>
              </div>
            </div>

            <div className="flex items-center justify-end pt-4">
              <Button onClick={() => setShowEnrollmentLink(false)}>Close</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Bulk Enroll Modal */}
      {showBulkEnroll && (
        <Modal
          isOpen={showBulkEnroll}
          onClose={() => setShowBulkEnroll(false)}
          title="Bulk Enroll Students"
        >
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Paste student emails below — one per line, or comma/semicolon separated. Only registered student accounts will be enrolled.
            </p>
            <textarea
              value={bulkEmails}
              onChange={(e) => setBulkEmails(e.target.value)}
              placeholder="student1@email.com&#10;student2@email.com&#10;student3@email.com"
              rows={6}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 resize-none font-mono"
            />

            {/* Results */}
            {bulkResult && !bulkResult.error && (
              <div className="text-sm space-y-1 bg-gray-50 dark:bg-dark-700 rounded-lg p-3">
                <p className="text-emerald-600 font-medium">✓ Enrolled: {bulkResult.enrolled?.length || 0}</p>
                {bulkResult.already_enrolled?.length > 0 && (
                  <p className="text-gray-500">Already enrolled: {bulkResult.already_enrolled.length}</p>
                )}
                {bulkResult.not_found?.length > 0 && (
                  <p className="text-red-500">Not found (not registered): {bulkResult.not_found.join(', ')}</p>
                )}
              </div>
            )}
            {bulkResult?.error && (
              <p className="text-sm text-red-500">{bulkResult.error}</p>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setShowBulkEnroll(false)}>Close</Button>
              <Button
                variant="primary"
                onClick={handleBulkEnroll}
                disabled={bulkLoading || !bulkEmails.trim()}
                leftIcon={bulkLoading ? <Spinner className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              >
                {bulkLoading ? 'Enrolling...' : 'Enroll'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
