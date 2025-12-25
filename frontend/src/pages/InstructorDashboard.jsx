import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { coursesAPI } from '../lib/api';
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
} from 'lucide-react';
import { cn } from '../utils/cn';
import { Container, EmptyState } from '../components/layout';
import { Button, Spinner, StatsCard, StatsGrid } from '../components/ui';

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState('');
  const [stats, setStats] = useState({
    totalCourses: 0,
    totalStudents: 0,
    totalRevenue: 0,
    averageRating: 0,
  });

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
      const response = await coursesAPI.getInstructorCourses();
      const coursesData = response.data.data.courses || [];
      setCourses(coursesData);

      // Calculate stats from courses
      const totalCourses = coursesData.length;
      const totalStudents = coursesData.reduce((sum, course) => sum + (course.enrolled_count || 0), 0);
      const totalRevenue = coursesData.reduce(
        (sum, course) => sum + (course.price || 0) * (course.enrolled_count || 0),
        0
      );
      const avgRating = coursesData.length > 0
        ? coursesData.reduce((sum, course) => sum + (course.average_rating || 0), 0) / coursesData.length
        : 0;

      setStats({
        totalCourses,
        totalStudents,
        totalRevenue,
        averageRating: avgRating,
      });
    } catch (error) {
      console.error('Error fetching instructor data:', error);
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
            value={stats.totalCourses}
            icon={BookOpen}
            iconColor="bg-brand-blue"
            className="animate-scale-in dark:bg-dark-800 dark:border-border-dark transition-colors"
            style={{ animationDelay: '0s' }}
          />
          <StatsCard
            title="Total Students"
            value={stats.totalStudents}
            icon={Users}
            iconColor="bg-brand-purple"
            className="animate-scale-in dark:bg-dark-800 dark:border-border-dark transition-colors"
            style={{ animationDelay: '0.1s' }}
          />
          <StatsCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            iconColor="bg-green-500"
            className="animate-scale-in dark:bg-dark-800 dark:border-border-dark transition-colors"
            style={{ animationDelay: '0.2s' }}
          />
          <StatsCard
            title="Average Rating"
            value={stats.averageRating > 0 ? stats.averageRating.toFixed(1) : 'N/A'}
            icon={Star}
            iconColor="bg-yellow-500"
            className="animate-scale-in dark:bg-dark-800 dark:border-border-dark transition-colors"
            style={{ animationDelay: '0.3s' }}
          />
        </StatsGrid>

        {/* Section Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">
            Your Courses
          </h3>
          <Button
            variant="primary"
            leftIcon={<Plus className="h-4 w-4" />}
            onClick={() => navigate('/instructor/courses/create')}
            className="hidden sm:flex"
          >
            Create New Course
          </Button>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col justify-center items-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading your courses...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!loading && courses.length === 0 && (
          <EmptyState
            icon={<BookOpen className="w-16 h-16" />}
            title="No courses yet"
            description="Get started by creating your first course"
            actionLabel="Create Your First Course"
            onAction={() => navigate('/instructor/courses/create')}
          />
        )}

        {/* Courses List */}
        {!loading && courses.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {courses.map((course, index) => (
              <CourseCard
                key={course.id}
                course={course}
                onEdit={() => navigate(`/instructor/courses/${course.id}/edit`)}
                onView={() => navigate(`/courses/${course.id}`)}
                onManageContent={() => navigate(`/instructor/courses/${course.id}/modules`)}
                delay={index * 0.1}
              />
            ))}
          </div>
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
              {course.average_rating.toFixed(1)}
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
            leftIcon={<BookOpen className="h-4 w-4" />}
            className="flex-1 min-w-[120px]"
          >
            Manage
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
