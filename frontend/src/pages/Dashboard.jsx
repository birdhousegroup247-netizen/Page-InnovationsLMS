import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import {
  BookOpen,
  Award,
  Clock,
  TrendingUp,
  PlayCircle,
  ArrowRight,
  Star,
  Users,
  GraduationCap,
  ChevronRight,
  AlertCircle,
} from 'lucide-react';
import { profileAPI, enrollmentsAPI, coursesAPI } from '../lib/api';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import { Container } from '../components/layout';
import EmptyState from '../components/common/EmptyState';
import emptyCourses from '../assets/empty-courses.svg';
import emptyRecommendations from '../assets/empty-recommendations.svg';
import { cn } from '../utils/cn';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);

        const [statsResult, myCoursesResult, allCoursesResult] = await Promise.allSettled([
          profileAPI.getStats(),
          enrollmentsAPI.getMyCourses(),
          coursesAPI.getAll({ limit: 4, exclude_enrolled: true })
        ]);

        const statsResponse = statsResult.status === 'fulfilled' ? statsResult.value : null;
        const myCoursesResponse = myCoursesResult.status === 'fulfilled' ? myCoursesResult.value : null;
        const allCoursesResponse = allCoursesResult.status === 'fulfilled' ? allCoursesResult.value : null;

        const statsData = statsResponse?.data?.data || {};
        const processedStats = [
          {
            title: 'Enrolled Courses',
            value: statsData.total_enrollments?.toString() || '0',
            icon: BookOpen,
            color: 'bg-brand-blue',
            subtitle: `+${statsData.enrollments_this_month || 0} this month`,
          },
          {
            title: 'Completed',
            value: statsData.completed_courses?.toString() || '0',
            icon: Award,
            color: 'bg-green-500',
            subtitle: `+${statsData.courses_completed_this_month || 0} this month`,
          },
          {
            title: 'Certificates',
            value: statsData.total_certificates?.toString() || '0',
            icon: GraduationCap,
            color: 'bg-brand-purple',
            subtitle: `+${statsData.certificates_this_month || 0} this month`,
          },
          {
            title: 'Avg Progress',
            value: `${Math.round(statsData.average_progress || 0)}%`,
            icon: TrendingUp,
            color: 'bg-brand-red',
            subtitle: 'Across all courses',
          },
        ];

        const coursesData = myCoursesResponse?.data?.data?.enrollments || myCoursesResponse?.data?.data?.courses || [];
        const inProgressCourses = coursesData
          .filter(enrollment => enrollment.progress_percentage > 0 && enrollment.progress_percentage < 100)
          .slice(0, 3)
          .map(enrollment => ({
            id: enrollment.course?.id || enrollment.id,
            title: enrollment.course?.title || enrollment.title,
            progress: Math.round(enrollment.progress_percentage || 0),
            instructor: enrollment.course?.instructor?.full_name || enrollment.instructor?.full_name || 'Instructor',
            thumbnail: enrollment.course?.thumbnail_url || enrollment.thumbnail_url || null,
            lessonsCompleted: enrollment.completed_contents || 0,
            totalLessons: enrollment.total_contents || 0,
          }));

        const recommendationsData = allCoursesResponse?.data?.data?.courses || [];
        const processedRecommendations = recommendationsData.slice(0, 4).map(course => ({
          id: course.id,
          title: course.title,
          instructor: course.instructor?.full_name || 'Instructor',
          rating: course.average_rating || 0,
          students: course.total_enrollments || 0,
          thumbnail: course.thumbnail_url || null,
          level: course.difficulty || 'Beginner',
          price: course.price ? `$${course.price}` : 'Free',
        }));

        setStats(processedStats);
        setRecentCourses(inProgressCourses);
        setRecommendations(processedRecommendations);

        const failedAPIs = [];
        if (!statsResponse) failedAPIs.push('profile stats');
        if (!myCoursesResponse) failedAPIs.push('enrolled courses');
        if (!allCoursesResponse) failedAPIs.push('recommendations');

        if (failedAPIs.length > 0 && failedAPIs.length < 3) {
          setError(`Some data couldn't be loaded: ${failedAPIs.join(', ')}`);
        } else if (failedAPIs.length === 3) {
          setError('Failed to load dashboard data. Please check your connection and try again.');
        }
      } catch (err) {
        setError('Failed to load dashboard data. Please try again.');
        setStats([
          { title: 'Enrolled Courses', value: '0', icon: BookOpen, color: 'bg-brand-blue', subtitle: '+0 this month' },
          { title: 'Completed', value: '0', icon: Award, color: 'bg-green-500', subtitle: '+0 this month' },
          { title: 'Certificates', value: '0', icon: GraduationCap, color: 'bg-brand-purple', subtitle: '+0 this month' },
          { title: 'Avg Progress', value: '0%', icon: TrendingUp, color: 'bg-brand-red', subtitle: 'Across all courses' },
        ]);
        setRecentCourses([]);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Stat Card Component
  const StatCard = ({ stat }) => (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 hover:border-gray-300 dark:hover:border-dark-600 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', stat.color)}>
          <stat.icon className="h-6 w-6 text-white" />
        </div>
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{stat.value}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400">{stat.title}</p>
      <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">{stat.subtitle}</p>
    </div>
  );

  // Course Progress Card Component
  const CourseProgressCard = ({ course }) => (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl overflow-hidden hover:border-brand-blue dark:hover:border-brand-blue transition-colors group">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-brand-blue to-brand-purple">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/50" />
          </div>
        )}
        {/* Progress Badge */}
        <div className="absolute top-3 right-3 px-3 py-1.5 bg-white dark:bg-dark-800 rounded-full shadow-sm">
          <span className="text-sm font-semibold text-brand-blue">{course.progress}%</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-brand-blue transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          {course.instructor}
        </p>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-gray-600 dark:text-gray-400">
              {course.lessonsCompleted} / {course.totalLessons} lessons
            </span>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-dark-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-blue rounded-full transition-all duration-300"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        </div>

        {/* Continue Button */}
        <Link
          to={`/courses/${course.id}/learn`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue text-white rounded-lg font-medium hover:bg-brand-blue-600 transition-colors"
        >
          <PlayCircle className="w-4 h-4" />
          Continue Learning
        </Link>
      </div>
    </div>
  );

  // Recommendation Card Component
  const RecommendationCard = ({ course }) => (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl overflow-hidden hover:border-brand-purple dark:hover:border-brand-purple transition-colors group">
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-brand-purple to-brand-red">
        {course.thumbnail ? (
          <img
            src={course.thumbnail}
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/50" />
          </div>
        )}
        {/* Level Badge */}
        <div className="absolute top-3 left-3 px-3 py-1.5 bg-white/90 dark:bg-dark-800/90 text-brand-purple text-xs font-semibold rounded-full">
          {course.level}
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2 group-hover:text-brand-purple transition-colors">
          {course.title}
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {course.instructor}
        </p>

        {/* Meta Info */}
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
          {course.rating > 0 && (
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              <span className="font-medium text-gray-900 dark:text-white">{Number(course.rating).toFixed(1)}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{course.students.toLocaleString()}</span>
          </div>
        </div>

        {/* Price & Action */}
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-brand-purple">{course.price}</span>
          <Link
            to={`/courses/${course.id}`}
            className="inline-flex items-center gap-1 text-sm font-medium text-brand-purple hover:text-brand-purple-600 transition-colors"
          >
            View Course
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSkeleton />
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
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <GraduationCap className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold text-white">
                  Welcome back, {user?.full_name?.split(' ')[0]}!
                </h1>
                <p className="text-lg text-white/80 mt-1">
                  Ready to continue your learning journey?
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          {stats.map((stat, index) => (
            <StatCard key={index} stat={stat} />
          ))}
        </div>

        {/* Continue Learning Section */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Continue Learning
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Pick up where you left off
              </p>
            </div>
            <Link
              to="/my-courses"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-blue hover:text-brand-blue-600 transition-colors"
            >
              View all courses
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recentCourses.length === 0 ? (
            <EmptyState
              image={emptyCourses}
              icon={<BookOpen className="w-12 h-12" />}
              title="Start Your Learning Journey"
              description="Explore our courses and begin your path to mastery"
              action={
                <Link
                  to="/courses"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-brand-blue text-white rounded-lg font-medium hover:bg-brand-blue-600 transition-colors"
                >
                  <BookOpen className="w-4 h-4" />
                  Browse Courses
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentCourses.map((course) => (
                <CourseProgressCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>

        {/* Recommended Courses Section */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                Recommended for You
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Courses you might be interested in
              </p>
            </div>
            <Link
              to="/courses"
              className="inline-flex items-center gap-1 text-sm font-medium text-brand-purple hover:text-brand-purple-600 transition-colors"
            >
              Browse all
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {recommendations.length === 0 ? (
            <EmptyState
              image={emptyRecommendations}
              icon={<Star className="w-12 h-12" />}
              title="No Recommendations Yet"
              description="Check back soon for personalized course suggestions"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recommendations.map((course) => (
                <RecommendationCard key={course.id} course={course} />
              ))}
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
