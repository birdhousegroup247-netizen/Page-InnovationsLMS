import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Users,
  Search,
  Filter,
  ArrowUpDown,
  ArrowLeft,
  Mail,
  Calendar,
  TrendingUp,
  CheckCircle,
  Clock,
  BookOpen,
  Eye,
} from 'lucide-react';
import { coursesAPI, instructorAPI } from '../../lib/api';
import { Container, EmptyState } from '../../components/layout';
import { Button, Spinner, Alert } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function MyStudents() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter and sort state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [sortBy, setSortBy] = useState('enrollment_date'); // enrollment_date, name, progress
  const [sortOrder, setSortOrder] = useState('desc'); // asc, desc

  useEffect(() => {
    fetchData();
  }, [selectedCourse]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch instructor's courses for filter dropdown
      const coursesResponse = await coursesAPI.getInstructorCourses();
      setCourses(coursesResponse.data.data.courses || []);

      // Fetch students using new instructor API
      if (selectedCourse !== 'all') {
        // Use new API for specific course
        const studentsResponse = await instructorAPI.getCourseStudents(selectedCourse);
        setStudents(studentsResponse.data.data.students || []);
      } else {
        // Fetch from all courses
        const allCourses = coursesResponse.data.data.courses || [];
        const allStudentsPromises = allCourses.map(course =>
          instructorAPI.getCourseStudents(course.id).catch(() => ({ data: { data: { students: [] } } }))
        );
        const allStudentsResponses = await Promise.all(allStudentsPromises);
        const combinedStudents = allStudentsResponses.flatMap(res => res.data.data.students || []);
        setStudents(combinedStudents);
      }
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  // Filter students by search query
  const filteredStudents = students.filter((enrollment) => {
    const studentName = enrollment.student?.full_name?.toLowerCase() || '';
    const studentEmail = enrollment.student?.email?.toLowerCase() || '';
    const courseName = enrollment.course?.title?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();

    return (
      studentName.includes(query) ||
      studentEmail.includes(query) ||
      courseName.includes(query)
    );
  });

  // Sort students
  const sortedStudents = [...filteredStudents].sort((a, b) => {
    let compareA, compareB;

    switch (sortBy) {
      case 'name':
        compareA = a.student?.full_name?.toLowerCase() || '';
        compareB = b.student?.full_name?.toLowerCase() || '';
        break;
      case 'progress':
        compareA = parseFloat(a.progress_percentage) || 0;
        compareB = parseFloat(b.progress_percentage) || 0;
        break;
      case 'enrollment_date':
      default:
        compareA = new Date(a.enrollment_date);
        compareB = new Date(b.enrollment_date);
        break;
    }

    if (sortOrder === 'asc') {
      return compareA > compareB ? 1 : -1;
    } else {
      return compareA < compareB ? 1 : -1;
    }
  });

  // Calculate stats
  const totalStudents = students.length;
  const activeStudents = students.filter((s) => s.last_accessed).length;
  const completedStudents = students.filter((s) => s.completed_at).length;
  const avgProgress =
    students.length > 0
      ? (students.reduce((sum, s) => sum + parseFloat(s.progress_percentage || 0), 0) /
          students.length).toFixed(1)
      : 0;

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const getProgressColor = (percentage) => {
    const progress = parseFloat(percentage) || 0;
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-brand-blue';
    if (progress >= 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getProgressTextColor = (percentage) => {
    const progress = parseFloat(percentage) || 0;
    if (progress >= 80) return 'text-green-600 dark:text-green-400';
    if (progress >= 50) return 'text-brand-blue';
    if (progress >= 20) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
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
            <Link
              to="/instructor/dashboard"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Users className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  My Students
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  {totalStudents} total enrollment{totalStudents !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading students...
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* Error Alert */}
            {error && (
              <div className="mb-6 animate-slide-up">
                <Alert variant="danger" onClose={() => setError('')}>
                  {error}
                </Alert>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1 transition-colors">Total Students</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">{totalStudents}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-brand-blue" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1 transition-colors">Active Students</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">{activeStudents}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-green-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1 transition-colors">Completed</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">{completedStudents}</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-purple-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1 transition-colors">Avg Progress</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">{avgProgress}%</p>
                  </div>
                  <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-yellow-500" />
                  </div>
                </div>
              </div>
            </div>

            {/* Filters and Search */}
            <div className="bg-white dark:bg-dark-800 rounded-xl p-4 border border-gray-200 dark:border-border-dark mb-6 transition-colors">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted transition-colors" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by name, email, or course..."
                    className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                  />
                </div>

                {/* Course Filter */}
                <div className="md:w-64">
                  <select
                    value={selectedCourse}
                    onChange={(e) => setSelectedCourse(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                  >
                    <option value="all">All Courses</option>
                    {courses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.title}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sort */}
                <div className="flex gap-2">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="md:w-48 px-4 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                  >
                    <option value="enrollment_date">Sort by: Date</option>
                    <option value="name">Sort by: Name</option>
                    <option value="progress">Sort by: Progress</option>
                  </select>
                  <button
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    className="px-3 py-2 text-gray-600 dark:text-text-dark-secondary hover:text-gray-900 dark:hover:text-text-dark-primary hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
                    title={`Sort ${sortOrder === 'asc' ? 'descending' : 'ascending'}`}
                  >
                    <ArrowUpDown className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Empty State */}
            {sortedStudents.length === 0 && (
              <EmptyState
                icon={<Users className="w-16 h-16" />}
                title={
                  searchQuery || selectedCourse !== 'all'
                    ? 'No students found'
                    : 'No students yet'
                }
                description={
                  searchQuery || selectedCourse !== 'all'
                    ? 'Try adjusting your filters or search query.'
                    : 'Students will appear here when they enroll in your courses.'
                }
              />
            )}

            {/* Students List */}
            {sortedStudents.length > 0 && (
              <div className="space-y-4">
                {sortedStudents.map((enrollment) => (
                  <div
                    key={`${enrollment.student_id}-${enrollment.course_id}`}
                    className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-all"
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center gap-6">
                      {/* Student Info */}
                      <div className="flex items-start gap-4 flex-1">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {enrollment.student?.avatar_url ? (
                            <img
                              src={enrollment.student.avatar_url}
                              alt={enrollment.student.full_name}
                              className="w-12 h-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
                              <span className="text-white font-medium text-lg">
                                {enrollment.student?.full_name?.charAt(0).toUpperCase() || '?'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-1 transition-colors">
                            {enrollment.student?.full_name || 'Unknown Student'}
                          </h3>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-text-dark-muted transition-colors">
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {enrollment.student?.email || 'No email'}
                            </span>
                            <span className="flex items-center gap-1">
                              <BookOpen className="w-4 h-4" />
                              {enrollment.course?.title || 'Unknown Course'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Progress and Stats */}
                      <div className="flex flex-col gap-3 lg:w-96">
                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm text-gray-600 dark:text-text-dark-muted transition-colors">Progress</span>
                            <span className={cn('text-sm font-semibold transition-colors', getProgressTextColor(enrollment.progress_percentage))}>
                              {parseFloat(enrollment.progress_percentage || 0).toFixed(0)}%
                            </span>
                          </div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden transition-colors">
                            <div
                              className={`h-full ${getProgressColor(enrollment.progress_percentage)} transition-all duration-300`}
                              style={{ width: `${parseFloat(enrollment.progress_percentage || 0)}%` }}
                            />
                          </div>
                        </div>

                        {/* Dates */}
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-text-dark-muted transition-colors">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Enrolled: {formatDate(enrollment.enrollment_date)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Active: {formatDate(enrollment.last_accessed)}
                          </span>
                        </div>

                        {/* Completion Status */}
                        {enrollment.completed_at && (
                          <div className="flex items-center gap-2 text-green-600 dark:text-green-400 text-sm transition-colors">
                            <CheckCircle className="w-4 h-4" />
                            Completed on {new Date(enrollment.completed_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {/* View Details Button */}
                      <div className="flex items-center lg:ml-4">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Eye className="w-4 h-4" />}
                          onClick={() => navigate(`/instructor/students/${enrollment.student_id}/progress/${enrollment.course_id}`)}
                          className="whitespace-nowrap"
                        >
                          View Details
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Container>
    </>
  );
}
