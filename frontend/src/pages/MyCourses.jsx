import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { enrollmentsAPI } from '../lib/api';
import {
  BookOpen,
  Clock,
  Award,
  TrendingUp,
  PlayCircle,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Container, EmptyState } from '../components/layout';
import { Badge, Button, Spinner } from '../components/ui';
import emptyCourses from '../assets/empty-courses.svg';
import { cn } from '../utils/cn';

export default function MyCourses() {
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [filteredCourses, setFilteredCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all'); // all, in-progress, completed, not-started

  useEffect(() => {
    fetchMyCourses();
  }, []);

  useEffect(() => {
    filterCourses();
  }, [selectedFilter, courses]);

  const fetchMyCourses = async () => {
    setLoading(true);
    try {
      console.log('Fetching my courses...');
      const response = await enrollmentsAPI.getMyCourses();
      console.log('API Response:', response);
      console.log('Response data:', response?.data);
      console.log('Response data.data:', response?.data?.data);
      // API returns 'courses' not 'enrollments'
      const enrollments = response?.data?.data?.courses || response?.data?.data?.enrollments || [];
      console.log('Enrollments:', enrollments);
      // Filter out enrollments where course might be null/undefined (deleted courses)
      const validEnrollments = enrollments.filter(enrollment => enrollment?.course && enrollment?.course?.id);
      console.log('Valid enrollments:', validEnrollments);
      setCourses(validEnrollments);
    } catch (error) {
      console.error('Error fetching my courses:', error);
      console.error('Error details:', error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  const filterCourses = () => {
    let filtered = [...courses];

    switch (selectedFilter) {
      case 'in-progress':
        filtered = courses.filter((enrollment) => {
          const progress = enrollment.progress_percentage || 0;
          return progress > 0 && progress < 100;
        });
        break;
      case 'completed':
        filtered = courses.filter(
          (enrollment) => (enrollment.progress_percentage || 0) === 100
        );
        break;
      case 'not-started':
        filtered = courses.filter(
          (enrollment) => (enrollment.progress_percentage || 0) === 0
        );
        break;
      default:
        filtered = courses;
    }

    setFilteredCourses(filtered);
  };

  // Calculate stats
  const stats = {
    total: courses.length,
    inProgress: courses.filter((e) => {
      const progress = e.progress_percentage || 0;
      return progress > 0 && progress < 100;
    }).length,
    completed: courses.filter((e) => (e.progress_percentage || 0) === 100).length,
    notStarted: courses.filter((e) => (e.progress_percentage || 0) === 0).length,
  };

  const filters = [
    { id: 'all', label: 'All Courses', count: stats.total },
    { id: 'in-progress', label: 'In Progress', count: stats.inProgress },
    { id: 'completed', label: 'Completed', count: stats.completed },
    { id: 'not-started', label: 'Not Started', count: stats.notStarted },
  ];

  console.log('Stats calculated:', stats);
  console.log('Filtered courses:', filteredCourses);

  const statsCards = [
    {
      label: 'Total Enrolled',
      value: stats.total,
      icon: BookOpen,
      iconBg: 'bg-brand-blue/20',
      iconColor: 'text-brand-blue',
    },
    {
      label: 'In Progress',
      value: stats.inProgress,
      icon: TrendingUp,
      iconBg: 'bg-brand-purple/20',
      iconColor: 'text-brand-purple',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: Award,
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-500',
    },
    {
      label: 'Not Started',
      value: stats.notStarted,
      icon: AlertCircle,
      iconBg: 'bg-yellow-500/20',
      iconColor: 'text-yellow-500',
    },
  ];

  console.log('About to render MyCourses JSX');

  return (
    <>
      {console.log('Inside JSX render')}
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
                    My Courses
                  </h1>
                  <p className="text-lg text-white/90 animate-fade-in">
                    Continue your learning journey
                  </p>
                </div>
                <Link to="/courses">
                  <Button
                    variant="outline"
                    leftIcon={<BookOpen className="h-4 w-4" />}
                    className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20 animate-scale-in"
                  >
                    Browse Courses
                  </Button>
                </Link>
              </div>
            </Container>
          </div>
        </div>

        <Container className="py-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
            {statsCards.map((stat, index) => (
              <div
                key={stat.label}
                className="bg-white dark:bg-dark-800 rounded-xl p-4 sm:p-6 shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-card-hover transition-all animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 dark:text-text-dark-secondary text-xs sm:text-sm mb-1 transition-colors">
                      {stat.label}
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">
                      {stat.value}
                    </p>
                  </div>
                  <div className={cn(stat.iconBg, 'p-2 sm:p-3 rounded-lg transition-colors')}>
                    <stat.icon className={cn('h-5 w-5 sm:h-6 sm:w-6', stat.iconColor)} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Filter Tabs */}
          <div className="mb-8 overflow-x-auto">
            <div className="flex items-center gap-2 sm:gap-4 min-w-max">
              {filters.map((filter) => (
                <button
                  key={filter.id}
                  onClick={() => setSelectedFilter(filter.id)}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap',
                    selectedFilter === filter.id
                      ? 'bg-brand-blue text-white shadow-md'
                      : 'bg-white dark:bg-dark-800 text-gray-600 dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-text-dark-primary shadow-sm dark:shadow-card'
                  )}
                >
                  {filter.label}
                  <span className="ml-2 text-xs opacity-75">({filter.count})</span>
                </button>
              ))}
            </div>
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
          {!loading && filteredCourses.length === 0 && (
            <EmptyState
              image={emptyCourses}
              icon={<BookOpen className="w-16 h-16" />}
              title={
                selectedFilter === 'all'
                  ? 'No courses yet'
                  : `No ${filters.find((f) => f.id === selectedFilter)?.label.toLowerCase()}`
              }
              description={
                selectedFilter === 'all'
                  ? 'Start learning by enrolling in your first course!'
                  : 'Try selecting a different filter or enroll in more courses.'
              }
              actionLabel={selectedFilter === 'all' ? 'Browse Courses' : 'View All Courses'}
              onAction={
                selectedFilter === 'all'
                  ? () => navigate('/courses')
                  : () => setSelectedFilter('all')
              }
            />
          )}

          {/* Courses Grid */}
          {!loading && filteredCourses.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((enrollment, index) => (
                <CourseCard
                  key={enrollment.id}
                  enrollment={enrollment}
                  onContinue={() => navigate(`/courses/${enrollment.course.id}/learn`)}
                  onViewDetails={() => navigate(`/courses/${enrollment.course.id}`)}
                  delay={index * 0.1}
                />
              ))}
            </div>
          )}
        </Container>
    </>
  );
}

// Course Card Component
function CourseCard({ enrollment, onContinue, onViewDetails, delay }) {
  console.log('CourseCard rendering, enrollment:', enrollment);
  console.log('CourseCard course:', enrollment?.course);
  const course = enrollment.course || {};
  const progress = enrollment.progress_percentage || 0;
  console.log('CourseCard progress:', progress, 'course:', course);
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

  const getStatusBadge = () => {
    if (progress === 100) {
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    } else if (progress > 0) {
      return (
        <Badge variant="info" className="flex items-center gap-1">
          <PlayCircle className="h-3 w-3" />
          In Progress
        </Badge>
      );
    } else {
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Not Started
        </Badge>
      );
    }
  };

  return (
    <div
      className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-card-hover transition-all group animate-slide-up"
      style={{ animationDelay: `${delay}s` }}
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-dark-700 transition-colors">
        <img
          src={thumbnail}
          alt={course.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {course.difficulty && (
            <Badge variant={difficultyColors[course.difficulty] || 'info'}>
              {course.difficulty}
            </Badge>
          )}
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          {getStatusBadge()}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-2 group-hover:text-brand-blue transition-colors line-clamp-2 min-h-[3.5rem]">
          {course.title}
        </h3>
        <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-4 line-clamp-2 min-h-[2.5rem] transition-colors">
          {course.description}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Progress
            </span>
            <span className="text-brand-blue font-semibold">{progress.toFixed(0)}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2 transition-colors">
            <div
              className={cn(
                'h-2 rounded-full transition-all duration-300',
                progress === 100
                  ? 'bg-green-500'
                  : 'bg-gradient-to-r from-brand-blue to-brand-purple'
              )}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-text-dark-muted mb-4 transition-colors">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {course.duration || 'Self-paced'}
          </span>
          {enrollment.last_accessed_at && (
            <span className="flex items-center gap-1 truncate">
              <PlayCircle className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">
                {new Date(enrollment.last_accessed_at).toLocaleDateString()}
              </span>
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {progress === 100 ? (
            <>
              <Button variant="secondary" size="sm" onClick={onContinue} className="flex-1">
                Review
              </Button>
              <Button variant="outline" size="sm" onClick={onViewDetails} className="flex-1">
                Details
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="primary"
                size="sm"
                onClick={onContinue}
                leftIcon={<PlayCircle className="h-4 w-4" />}
                className="flex-1"
              >
                {progress > 0 ? 'Continue' : 'Start'}
              </Button>
              <Button variant="outline" size="sm" onClick={onViewDetails} className="flex-1">
                Details
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
