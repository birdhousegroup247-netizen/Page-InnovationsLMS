import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { instructorAPI, coursesAPI } from '../lib/api';
import {
  BookOpen,
  Users,
  DollarSign,
  Plus,
  Edit,
  Eye,
  BarChart3,
  Star,
  CheckCircle,
  Hammer,
  TrendingUp,
  Clock,
  FileQuestion,
  Award,
  Megaphone,
  UserPlus,
  ArrowRight,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Container, EmptyState } from '../components/layout';
import { Button, Spinner, StatsCard, StatsGrid } from '../components/ui';
import emptyCourses from '../assets/empty-courses.svg';

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Check if user is instructor
    if (user && user.role !== 'instructor') {
      navigate('/dashboard');
      return;
    }

    // Check for success message from navigation state
    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      // Clear the message after 5 seconds
      setTimeout(() => setSuccessMessage(''), 5000);
      // Clear the location state
      navigate(location.pathname, { replace: true, state: {} });
    }

    fetchInstructorData();
  }, [user]);

  const fetchInstructorData = async () => {
    setLoading(true);
    try {
      // Fetch dashboard data from new API
      const [dashboardResponse, coursesResponse] = await Promise.all([
        instructorAPI.getDashboard(),
        coursesAPI.getInstructorCourses()
      ]);

      const dashData = dashboardResponse.data.data;
      const coursesData = coursesResponse.data.data.courses || [];

      setDashboardData(dashData);
      setCourses(coursesData);
    } catch (error) {
      console.error('Error fetching instructor data:', error);
      // Fallback to old method if new API fails
      try {
        const response = await coursesAPI.getInstructorCourses();
        const coursesData = response.data.data.courses || [];
        setCourses(coursesData);
      } catch (fallbackError) {
        console.error('Fallback error:', fallbackError);
      }
    } finally {
      setLoading(false);
    }
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
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-2 animate-fade-in">
                  Welcome back, {user?.full_name?.split(' ')[0]}!
                </h1>
                <p className="text-lg text-white/90 animate-fade-in">
                  Manage your courses and track your teaching performance
                </p>
              </div>
              <Button
                variant="outline"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/instructor/courses/create')}
                className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20 animate-scale-in"
              >
                Create New Course
              </Button>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 dark:border-green-500/20 rounded-lg flex items-start gap-3 animate-slide-up transition-colors">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-600 dark:text-green-400 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Stats Grid */}
        <StatsGrid columns={4} className="mb-8">
          <StatsCard
            title="Total Courses"
            value={dashboardData?.teaching_summary?.total_courses || 0}
            icon={BookOpen}
            iconColor="bg-brand-blue"
            trend={`${dashboardData?.teaching_summary?.published_courses || 0} published`}
            className="animate-scale-in dark:bg-dark-800 dark:border-border-dark transition-colors"
            style={{ animationDelay: '0s' }}
          />
          <StatsCard
            title="Total Students"
            value={dashboardData?.teaching_summary?.total_students || 0}
            icon={Users}
            iconColor="bg-brand-purple"
            trend={`${dashboardData?.teaching_summary?.enrollments_this_month || 0} this month`}
            className="animate-scale-in dark:bg-dark-800 dark:border-border-dark transition-colors"
            style={{ animationDelay: '0.1s' }}
          />
          <StatsCard
            title="Total Enrollments"
            value={dashboardData?.teaching_summary?.total_enrollments || 0}
            icon={TrendingUp}
            iconColor="bg-green-500"
            className="animate-scale-in dark:bg-dark-800 dark:border-border-dark transition-colors"
            style={{ animationDelay: '0.2s' }}
          />
          <StatsCard
            title="Pending Questions"
            value={dashboardData?.pending_questions || 0}
            icon={FileQuestion}
            iconColor="bg-yellow-500"
            className="animate-scale-in dark:bg-dark-800 dark:border-border-dark transition-colors"
            style={{ animationDelay: '0.3s' }}
          />
        </StatsGrid>

        {/* Recent Enrollments & Course Performance */}
        {dashboardData && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Recent Enrollments */}
            {dashboardData.recent_enrollments && dashboardData.recent_enrollments.length > 0 && (
              <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm dark:shadow-card transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-brand-blue" />
                  Recent Enrollments
                </h3>
                <div className="space-y-3">
                  {dashboardData.recent_enrollments.slice(0, 5).map((enrollment, idx) => {
                    // Format date safely - backend returns 'enrollment_date'
                    const enrollmentDate = enrollment.enrollment_date
                      ? new Date(enrollment.enrollment_date).toLocaleDateString()
                      : 'N/A';

                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg transition-colors"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary truncate">
                            {enrollment.student_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-text-dark-muted truncate">
                            {enrollment.course_title}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400 dark:text-text-dark-muted ml-2">
                          {enrollmentDate}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Course Performance */}
            {dashboardData.course_performance && dashboardData.course_performance.length > 0 && (
              <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm dark:shadow-card transition-colors">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2">
                  <Award className="h-5 w-5 text-brand-purple" />
                  Course Performance
                </h3>
                <div className="space-y-3">
                  {dashboardData.course_performance.slice(0, 5).map((course, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 dark:bg-dark-700 rounded-lg transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary truncate flex-1">
                          {course.title}
                        </p>
                        <span className="text-xs text-gray-500 dark:text-text-dark-muted ml-2">
                          {course.students} students
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-gray-600 dark:text-text-dark-secondary">Avg Progress</span>
                            <span className="font-medium text-gray-900 dark:text-text-dark-primary">
                              {course.avg_progress?.toFixed(1)}%
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-1.5">
                            <div
                              className="bg-brand-blue h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(course.avg_progress || 0, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-600 dark:text-text-dark-secondary">Completion</p>
                          <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                            {course.completion_rate?.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mb-8">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-text-dark-primary mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* View Students */}
            <button
              onClick={() => navigate('/instructor/students')}
              className="group p-6 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark hover:border-brand-blue dark:hover:border-brand-blue hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-lg bg-brand-blue/10 flex items-center justify-center group-hover:bg-brand-blue/20 transition-colors">
                  <Users className="w-6 h-6 text-brand-blue" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-1">My Students</h4>
              <p className="text-sm text-gray-600 dark:text-text-dark-muted">View and track student progress</p>
            </button>

            {/* Announcements */}
            <button
              onClick={() => navigate('/instructor/announcements')}
              className="group p-6 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark hover:border-brand-purple dark:hover:border-brand-purple hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-lg bg-brand-purple/10 flex items-center justify-center group-hover:bg-brand-purple/20 transition-colors">
                  <Megaphone className="w-6 h-6 text-brand-purple" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-brand-purple group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-1">Announcements</h4>
              <p className="text-sm text-gray-600 dark:text-text-dark-muted">Create course announcements</p>
            </button>

            {/* My Questions */}
            <button
              onClick={() => navigate('/instructor/questions')}
              className="group p-6 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark hover:border-green-500 dark:hover:border-green-500 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center group-hover:bg-green-500/20 transition-colors">
                  <FileQuestion className="w-6 h-6 text-green-500" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-green-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-1">My Questions</h4>
              <p className="text-sm text-gray-600 dark:text-text-dark-muted">Track question approval status</p>
            </button>

            {/* Test Analytics */}
            <button
              onClick={() => navigate('/instructor/tests')}
              className="group p-6 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark hover:border-yellow-500 dark:hover:border-yellow-500 hover:shadow-lg transition-all text-left"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center group-hover:bg-yellow-500/20 transition-colors">
                  <BarChart3 className="w-6 h-6 text-yellow-500" />
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-yellow-500 group-hover:translate-x-1 transition-all" />
              </div>
              <h4 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-1">Test Analytics</h4>
              <p className="text-sm text-gray-600 dark:text-text-dark-muted">View test results & analytics</p>
            </button>
          </div>
        </div>

        {/* Recent Courses Section */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">
            Recent Courses
          </h3>
          <div className="flex gap-2">
            <Button
              variant="outline"
              rightIcon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate('/instructor/courses')}
              className="hidden sm:flex"
            >
              View All Courses
            </Button>
            <Button
              variant="primary"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={() => navigate('/instructor/courses/create')}
              className="hidden sm:flex"
            >
              Create New Course
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col justify-center items-center py-12">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading your courses...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && courses.length === 0 && (
          <EmptyState
            image={emptyCourses}
            icon={<BookOpen className="w-16 h-16" />}
            title="No courses yet"
            description="Get started by creating your first course"
            actionLabel="Create Your First Course"
            onAction={() => navigate('/instructor/courses/create')}
          />
        )}

        {/* Recent Courses List - Show max 4 courses */}
        {!loading && courses.length > 0 && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {courses.slice(0, 4).map((course, index) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEdit={() => navigate(`/instructor/courses/${course.id}/edit`)}
                  onView={() => navigate(`/courses/${course.id}`)}
                  onManageContent={() => navigate(`/instructor/courses/${course.id}/builder`)}
                  delay={index * 0.1}
                />
              ))}
            </div>

            {/* View All Courses Link - Mobile and when more than 4 courses */}
            {courses.length > 4 && (
              <div className="text-center">
                <Button
                  variant="outline"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={() => navigate('/instructor/courses')}
                  className="w-full sm:w-auto"
                >
                  View All {courses.length} Courses
                </Button>
              </div>
            )}
          </>
        )}
      </Container>
    </>
  );
}

// Course Card Component for Instructor
function CourseCard({ course, onEdit, onView, onManageContent, delay }) {
  const thumbnail =
    course.thumbnail_url ||
    `https://placehold.co/400x225/0e2b5c/ffffff?text=${encodeURIComponent(
      course.title || 'Course'
    )}`;

  const difficultyColors = {
    beginner: 'success',
    intermediate: 'warning',
    advanced: 'danger',
  };

  const statusColors = {
    draft: 'warning',
    published: 'success',
    archived: 'danger',
  };

  return (
    <div
      className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-card-hover transition-all flex flex-col sm:flex-row gap-4 p-4 animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-full sm:w-48 aspect-video sm:aspect-auto sm:h-32 overflow-hidden rounded-lg bg-gray-100 dark:bg-dark-700 transition-colors">
        <img
          src={thumbnail}
          alt={course.title}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary line-clamp-1 mb-1 transition-colors">
              {course.title}
            </h3>
            <div className="flex items-center gap-2 flex-wrap">
              {course.difficulty && (
                <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', {
                  'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': course.difficulty === 'beginner',
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400': course.difficulty === 'intermediate',
                  'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400': course.difficulty === 'advanced',
                })}>
                  {course.difficulty}
                </span>
              )}
              <span className={cn('inline-flex items-center px-2 py-1 rounded-full text-xs font-medium', {
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400': course.status === 'draft',
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400': course.status === 'published',
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400': course.status === 'archived',
                'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400': !course.status,
              })}>
                {course.status || 'Draft'}
              </span>
            </div>
          </div>
        </div>

        <p className="text-gray-600 dark:text-text-dark-secondary text-sm line-clamp-2 mb-3 transition-colors">
          {course.description || 'No description available'}
        </p>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-text-dark-muted mb-4 flex-wrap transition-colors">
          <span className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            {course.enrolled_count || 0} students
          </span>
          {course.average_rating > 0 && (
            <span className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              {Number(course.average_rating).toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <DollarSign className="h-4 w-4" />
            {course.price > 0 ? `$${course.price}` : 'Free'}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-auto flex-wrap">
          <Button
            variant="primary"
            size="sm"
            onClick={onManageContent}
            leftIcon={<Hammer className="h-4 w-4" />}
            className="flex-1 min-w-[120px]"
          >
            Build Course
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onEdit}
            leftIcon={<Edit className="h-4 w-4" />}
            className="flex-1 min-w-[80px]"
          >
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onView}
            leftIcon={<Eye className="h-4 w-4" />}
            className="flex-1 min-w-[80px]"
          >
            View
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="p-2 min-w-0"
          >
            <BarChart3 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
