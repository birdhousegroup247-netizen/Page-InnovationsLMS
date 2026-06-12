import { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
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
  ArrowRight,
  GraduationCap,
  AlertCircle,
  Video,
  ClipboardCheck,
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Container } from '../components/layout';
import { Button, Spinner } from '../components/ui';
import EmptyState from '../components/common/EmptyState';

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [dashboardData, setDashboardData] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    // Note: Role check is handled by InstructorRoute wrapper in App.jsx
    // No need to check here - InstructorRoute redirects non-instructors before this renders

    if (location.state?.message) {
      setSuccessMessage(location.state.message);
      setTimeout(() => setSuccessMessage(''), 5000);
      navigate(location.pathname, { replace: true, state: {} });
    }

    fetchInstructorData();
  }, [user]);

  const fetchInstructorData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dashboardResponse, coursesResponse] = await Promise.all([
        instructorAPI.getDashboard(),
        coursesAPI.getInstructorCourses()
      ]);

      setDashboardData(dashboardResponse.data.data);
      setCourses(coursesResponse.data.data.courses || []);
    } catch (err) {
      setError('Failed to load dashboard data. Please try again.');
      try {
        const response = await coursesAPI.getInstructorCourses();
        setCourses(response.data.data.courses || []);
      } catch (fallbackError) {
        // Silent fallback
      }
    } finally {
      setLoading(false);
    }
  };

  // Stat Card Component
  const StatCard = ({ title, value, subtitle, icon: Icon, color }) => (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 hover:border-gray-300 dark:hover:border-dark-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{title}</p>
      {subtitle && <p className="text-xs text-gray-500 mt-2">{subtitle}</p>}
    </div>
  );

  // Quick Action Card Component
  const QuickActionCard = ({ title, description, icon: Icon, color, onClick }) => (
    <button
      onClick={onClick}
      className="group p-5 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark hover:border-gray-300 dark:hover:border-dark-600 transition-all text-left w-full"
    >
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center', `${color}/10`)}>
          <Icon className={cn('w-5 h-5', color.replace('bg-', 'text-'))} />
        </div>
        <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 group-hover:translate-x-1 transition-all" />
      </div>
      <h4 className="font-semibold text-gray-900 dark:text-white mb-1">{title}</h4>
      <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
    </button>
  );

  // Course Card Component
  const CourseCard = ({ course, onEdit, onView, onManageContent }) => (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl overflow-hidden hover:border-gray-300 dark:hover:border-dark-600 transition-colors">
      <div className="flex flex-col sm:flex-row">
        {/* Thumbnail */}
        <div className="sm:w-48 aspect-video sm:aspect-auto sm:h-full flex-shrink-0 bg-gradient-to-br from-brand-blue to-brand-purple">
          {course.thumbnail_url ? (
            <img
              src={course.thumbnail_url}
              alt={course.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full min-h-[120px] flex items-center justify-center">
              <BookOpen className="w-10 h-10 text-white/50" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-5">
          <div className="flex items-start justify-between gap-3 mb-2">
            <h3 className="font-semibold text-gray-900 dark:text-white line-clamp-1">
              {course.title}
            </h3>
            <div className="flex items-center gap-2 flex-shrink-0">
              {course.difficulty && (
                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', {
                  'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': course.difficulty === 'beginner',
                  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400': course.difficulty === 'intermediate',
                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': course.difficulty === 'advanced',
                })}>
                  {course.difficulty}
                </span>
              )}
              <span className={cn('px-2 py-1 rounded-full text-xs font-medium', {
                'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400': course.status === 'draft',
                'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': course.status === 'published',
                'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': course.status === 'pending',
                'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': course.status === 'archived',
              })}>
                {course.status === 'pending' ? 'Pending Review' : (course.status || 'draft')}
              </span>
            </div>
          </div>

          <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-4">
            {course.description || 'No description available'}
          </p>

          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {course.enrolled_count || 0}
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
          <div className="flex items-center gap-2 flex-wrap">
            <Button variant="primary" size="sm" onClick={onManageContent} leftIcon={<Hammer className="h-4 w-4" />}>
              Build
            </Button>
            <Button variant="secondary" size="sm" onClick={onEdit} leftIcon={<Edit className="h-4 w-4" />}>
              Edit
            </Button>
            <Button variant="outline" size="sm" onClick={onView} leftIcon={<Eye className="h-4 w-4" />}>
              View
            </Button>
            <Link
              to={`/instructor/courses/${course.id}/sessions`}
              className="flex items-center gap-1 px-2 py-1 text-xs text-brand-blue hover:bg-brand-blue/10 rounded-lg transition-colors"
            >
              <Video className="h-3.5 w-3.5" /> Sessions
            </Link>
            <Link
              to={`/instructor/courses/${course.id}/assignments-grading`}
              className="flex items-center gap-1 px-2 py-1 text-xs text-brand-purple hover:bg-brand-purple/10 rounded-lg transition-colors"
            >
              <ClipboardCheck className="h-3.5 w-3.5" /> Grade
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[60vh]">
        <Spinner size="lg" />
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <GraduationCap className="h-7 w-7 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl font-bold text-white">
                    {(user?.login_count ?? 0) <= 1 ? 'Welcome' : 'Welcome back'}, {user?.full_name?.split(' ')[0]}!
                  </h1>
                  <p className="text-lg text-white/80 mt-1">
                    Manage your courses and track performance
                  </p>
                </div>
              </div>
              <Button
                variant="secondary"
                leftIcon={<Plus className="h-4 w-4" />}
                onClick={() => navigate('/instructor/courses/create')}
                className="bg-white text-brand-blue hover:bg-gray-100"
              >
                Create Course
              </Button>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-green-800 dark:text-green-200">{successMessage}</p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <StatCard
            title="Total Courses"
            value={dashboardData?.teaching_summary?.total_courses || 0}
            subtitle={`${dashboardData?.teaching_summary?.published_courses || 0} published`}
            icon={BookOpen}
            color="bg-brand-blue"
          />
          <StatCard
            title="Total Students"
            value={dashboardData?.teaching_summary?.total_students || 0}
            subtitle={`+${dashboardData?.teaching_summary?.enrollments_this_month || 0} this month`}
            icon={Users}
            color="bg-brand-purple"
          />
          <StatCard
            title="Total Enrollments"
            value={dashboardData?.teaching_summary?.total_enrollments || 0}
            icon={TrendingUp}
            color="bg-green-500"
          />
          <StatCard
            title="Pending Questions"
            value={dashboardData?.pending_questions || 0}
            icon={FileQuestion}
            color="bg-yellow-500"
          />
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {/* Recent Enrollments */}
          <div className="lg:col-span-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Clock className="h-5 w-5 text-brand-blue" />
              Recent Enrollments
            </h3>
            {dashboardData?.recent_enrollments && dashboardData.recent_enrollments.length > 0 ? (
              <div className="space-y-3">
                {dashboardData.recent_enrollments.slice(0, 5).map((enrollment, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {enrollment.student_name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {enrollment.course_title}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 ml-2">
                      {enrollment.enrollment_date ? new Date(enrollment.enrollment_date).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-8">
                No recent enrollments
              </p>
            )}
          </div>

          {/* Quick Actions */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
            <QuickActionCard
              title="My Students"
              description="View student progress"
              icon={Users}
              color="bg-brand-blue"
              onClick={() => navigate('/instructor/students')}
            />
            <QuickActionCard
              title="Announcements"
              description="Create announcements"
              icon={Megaphone}
              color="bg-brand-purple"
              onClick={() => navigate('/instructor/announcements')}
            />
            <QuickActionCard
              title="My Questions"
              description="Track question status"
              icon={FileQuestion}
              color="bg-green-500"
              onClick={() => navigate('/instructor/questions')}
            />
            <QuickActionCard
              title="Test Analytics"
              description="View test results"
              icon={BarChart3}
              color="bg-yellow-500"
              onClick={() => navigate('/instructor/tests')}
            />
          </div>
        </div>

        {/* Course Performance */}
        {dashboardData?.course_performance && dashboardData.course_performance.length > 0 && (
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 mb-10">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Award className="h-5 w-5 text-brand-purple" />
              Course Performance
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {dashboardData.course_performance.slice(0, 6).map((course, idx) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg">
                  <p className="font-medium text-gray-900 dark:text-white truncate mb-3">
                    {course.title}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Students</span>
                      <span className="font-medium text-gray-900 dark:text-white">{course.students}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-400">Avg Progress</span>
                      <span className="font-medium text-gray-900 dark:text-white">{course.avg_progress?.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-dark-600 rounded-full h-1.5">
                      <div
                        className="bg-brand-blue h-1.5 rounded-full"
                        style={{ width: `${Math.min(course.avg_progress || 0, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Courses */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your Courses</h3>
            <Link
              to="/instructor/courses"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:text-brand-blue-600 transition-colors"
            >
              View all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {courses.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-12 h-12" />}
              title="No courses yet"
              description="Get started by creating your first course"
              action={
                <Button
                  variant="primary"
                  leftIcon={<Plus className="h-4 w-4" />}
                  onClick={() => navigate('/instructor/courses/create')}
                >
                  Create Your First Course
                </Button>
              }
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {courses.slice(0, 4).map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEdit={() => navigate(`/instructor/courses/${course.id}/edit`)}
                  onView={() => navigate(`/courses/${course.id}`)}
                  onManageContent={() => navigate(`/instructor/courses/${course.id}/builder`)}
                />
              ))}
            </div>
          )}

          {courses.length > 4 && (
            <div className="text-center mt-6">
              <Button
                variant="outline"
                rightIcon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate('/instructor/courses')}
              >
                View All {courses.length} Courses
              </Button>
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
