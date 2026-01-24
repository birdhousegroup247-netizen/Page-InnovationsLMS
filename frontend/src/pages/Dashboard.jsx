import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Award, Clock, TrendingUp, PlayCircle, ArrowRight, Star, Sparkles, Zap, Target } from 'lucide-react';
import { profileAPI, enrollmentsAPI, coursesAPI } from '../lib/api';
import { DashboardSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/common/EmptyState';
import emptyCourses from '../assets/empty-courses.svg';
import emptyRecommendations from '../assets/empty-recommendations.svg';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState([]);
  const [recentCourses, setRecentCourses] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      console.log('[Dashboard] Fetching dashboard data...');
      try {
        setLoading(true);
        setError(null);

        // Fetch all data in parallel with individual error handling
        const [statsResult, myCoursesResult, allCoursesResult] = await Promise.allSettled([
          profileAPI.getStats(),
          enrollmentsAPI.getMyCourses(),
          coursesAPI.getAll({ limit: 2, exclude_enrolled: true })
        ]);

        // Log results
        console.log('[Dashboard] Stats result:', statsResult.status, statsResult.status === 'fulfilled' ? statsResult.value?.data : statsResult.reason?.message);
        console.log('[Dashboard] My courses result:', myCoursesResult.status, myCoursesResult.status === 'fulfilled' ? myCoursesResult.value?.data : myCoursesResult.reason?.message);
        console.log('[Dashboard] All courses result:', allCoursesResult.status, allCoursesResult.status === 'fulfilled' ? allCoursesResult.value?.data : allCoursesResult.reason?.message);

        // Extract responses (use null if failed)
        const statsResponse = statsResult.status === 'fulfilled' ? statsResult.value : null;
        const myCoursesResponse = myCoursesResult.status === 'fulfilled' ? myCoursesResult.value : null;
        const allCoursesResponse = allCoursesResult.status === 'fulfilled' ? allCoursesResult.value : null;

        // Check if critical data failed
        if (!statsResponse) {
          console.error('[Dashboard] Stats API failed:', statsResult.reason);
        }
        if (!myCoursesResponse) {
          console.error('[Dashboard] My courses API failed:', myCoursesResult.reason);
        }
        if (!allCoursesResponse) {
          console.error('[Dashboard] All courses API failed:', allCoursesResult.reason);
        }

        // Process stats data (with fallback for failed request)
        const statsData = statsResponse?.data?.data || {};
        const processedStats = [
          {
            title: 'Enrolled Courses',
            value: statsData.total_enrollments?.toString() || '0',
            icon: BookOpen,
            iconBg: 'bg-brand-blue/20',
            iconColor: 'text-brand-blue',
            trend: { value: `+${statsData.enrollments_this_month || 0}`, label: 'this month' },
          },
          {
            title: 'Completed',
            value: statsData.completed_courses?.toString() || '0',
            icon: Award,
            iconBg: 'bg-green-500/20',
            iconColor: 'text-green-500',
            trend: { value: `+${statsData.courses_completed_this_month || 0}`, label: 'this month' },
          },
          {
            title: 'Certificates',
            value: statsData.total_certificates?.toString() || '0',
            icon: Clock,
            iconBg: 'bg-brand-purple/20',
            iconColor: 'text-brand-purple',
            trend: { value: `+${statsData.certificates_this_month || 0}`, label: 'this month' },
          },
          {
            title: 'Avg Progress',
            value: `${Math.round(statsData.average_progress || 0)}%`,
            icon: TrendingUp,
            iconBg: 'bg-brand-red/20',
            iconColor: 'text-brand-red',
            trend: { value: '+5%', label: 'from last week' },
          },
        ];

        // Process recent courses (in-progress courses) - with fallback
        const coursesData = myCoursesResponse?.data?.data?.enrollments || myCoursesResponse?.data?.data?.courses || [];
        const inProgressCourses = coursesData
          .filter(enrollment => enrollment.progress_percentage > 0 && enrollment.progress_percentage < 100)
          .slice(0, 3)
          .map(enrollment => ({
            id: enrollment.course?.id || enrollment.id,
            title: enrollment.course?.title || enrollment.title,
            progress: Math.round(enrollment.progress_percentage || 0),
            instructor: enrollment.course?.instructor?.full_name || enrollment.instructor?.full_name || 'Instructor',
            thumbnail: enrollment.course?.thumbnail_url || enrollment.thumbnail_url || `https://placehold.co/400x225/0e2b5c/ffffff?text=${encodeURIComponent(enrollment.course?.title || enrollment.title || 'Course')}`,
            duration: enrollment.course?.duration || enrollment.duration || 'N/A',
            lessonsCompleted: enrollment.completed_contents || 0,
            totalLessons: enrollment.total_contents || 0,
          }));

        // Process recommendations (all courses excluding enrolled) - with fallback
        const recommendationsData = allCoursesResponse?.data?.data?.courses || [];
        const processedRecommendations = recommendationsData.slice(0, 2).map(course => ({
          id: course.id,
          title: course.title,
          instructor: course.instructor?.full_name || 'Instructor',
          rating: course.average_rating || 4.5,
          students: course.total_enrollments || 0,
          thumbnail: course.thumbnail_url || `https://placehold.co/400x225/0e2b5c/ffffff?text=${encodeURIComponent(course.title || 'Course')}`,
          level: course.difficulty || 'Intermediate',
          price: course.price ? `$${course.price}` : 'Free',
        }));

        setStats(processedStats);
        setRecentCourses(inProgressCourses);
        setRecommendations(processedRecommendations);

        // Set partial error if some APIs failed but others succeeded
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
        console.error('[Dashboard] Failed to fetch dashboard data:', err);
        console.error('[Dashboard] Error details:', err.response?.data || err.message);
        setError('Failed to load dashboard data. Please try again.');

        // Set empty arrays on error
        setStats([
          {
            title: 'Enrolled Courses',
            value: '0',
            icon: BookOpen,
            iconBg: 'bg-brand-blue/20',
            iconColor: 'text-brand-blue',
            trend: { value: '+0', label: 'this month' },
          },
          {
            title: 'Completed',
            value: '0',
            icon: Award,
            iconBg: 'bg-green-500/20',
            iconColor: 'text-green-500',
            trend: { value: '+0', label: 'this month' },
          },
          {
            title: 'Certificates',
            value: '0',
            icon: Clock,
            iconBg: 'bg-brand-purple/20',
            iconColor: 'text-brand-purple',
            trend: { value: '+0', label: 'this month' },
          },
          {
            title: 'Avg Progress',
            value: '0%',
            icon: TrendingUp,
            iconBg: 'bg-brand-red/20',
            iconColor: 'text-brand-red',
            trend: { value: '+0%', label: 'from last week' },
          },
        ]);
        setRecentCourses([]);
        setRecommendations([]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  // Show loading state
  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DashboardSkeleton />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-brand-blue/20 to-cyan-500/20 dark:from-brand-blue/10 dark:to-cyan-500/10 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-20 right-0 w-[600px] h-[600px] bg-gradient-to-br from-brand-purple/20 to-pink-500/20 dark:from-brand-purple/10 dark:to-pink-500/10 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute bottom-0 left-1/3 w-[600px] h-[600px] bg-gradient-to-br from-brand-red/20 to-orange-500/20 dark:from-brand-red/10 dark:to-orange-500/10 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section with Gradient */}
        <div className="mb-12 animate-fade-in">
          <div className="relative overflow-hidden bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red p-[2px] rounded-3xl mb-6">
            <div className="bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl p-8 rounded-[22px]">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-blue to-brand-purple rounded-full blur-lg opacity-50"></div>
                  <Sparkles className="relative w-12 h-12 text-brand-blue dark:text-brand-purple" />
                </div>
                <div className="flex-1">
                  <h1 className="text-4xl md:text-5xl font-black mb-2">
                    <span className="bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red bg-clip-text text-transparent animate-gradient-x">
                      Welcome back, {user?.full_name?.split(' ')[0]}!
                    </span>
                  </h1>
                  <p className="text-lg text-gray-600 dark:text-text-dark-secondary flex items-center gap-2">
                    <Zap className="w-5 h-5 text-brand-purple" />
                    Ready to level up your skills today?
                  </p>
                </div>
              </div>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-4 bg-red-50/90 dark:bg-red-900/20 backdrop-blur-xl border border-red-200/50 dark:border-red-800/50 rounded-2xl">
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Stats Grid with Glass-morphism */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="group relative overflow-hidden bg-transparent backdrop-blur-2xl rounded-3xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Glow effect on hover */}
              <div className={`absolute inset-0 ${stat.iconBg.replace('/20', '')} rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500`}></div>

              <div className="relative">
                {/* Icon with 3D effect */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`${stat.iconBg} p-4 rounded-2xl transform group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 shadow-lg`}>
                    <stat.icon className={`h-7 w-7 ${stat.iconColor}`} />
                  </div>
                  {/* Decorative element */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-brand-blue/10 to-brand-purple/10 dark:from-brand-blue/5 dark:to-brand-purple/5 flex items-center justify-center">
                    <Target className="w-5 h-5 text-brand-blue/50 dark:text-brand-purple/50" />
                  </div>
                </div>

                <h3 className="text-gray-500 dark:text-text-dark-secondary text-sm font-semibold mb-2 uppercase tracking-wide">
                  {stat.title}
                </h3>
                <p className="text-4xl font-black bg-gradient-to-br from-gray-900 to-gray-700 dark:from-text-dark-primary dark:to-text-dark-secondary bg-clip-text text-transparent mb-3">
                  {stat.value}
                </p>
                <div className="flex items-center text-sm">
                  <span className="text-green-500 dark:text-green-400 font-bold">{stat.trend.value}</span>
                  <span className="text-gray-400 dark:text-text-dark-muted ml-1">
                    {stat.trend.label}
                  </span>
                </div>
              </div>

              {/* Shine effect on hover */}
              <div className="absolute inset-0 -inset-x-full group-hover:inset-x-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12 transition-all duration-1000"></div>
            </div>
          ))}
        </div>

        {/* Continue Learning Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-2">
                <span className="bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
                  Continue Learning
                </span>
              </h2>
              <p className="text-gray-600 dark:text-text-dark-secondary">Pick up where you left off</p>
            </div>
            <Link
              to="/my-courses"
              className="group flex items-center gap-2 px-6 py-3 bg-transparent backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:border-brand-blue/50 transition-all duration-300 hover:scale-105"
            >
              <span className="font-semibold text-brand-blue">View all</span>
              <ArrowRight className="w-4 h-4 text-brand-blue group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentCourses.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  image={emptyCourses}
                  icon={<BookOpen className="w-16 h-16" />}
                  title="Start Your Learning Journey"
                  description="Explore our courses and begin your path to mastery"
                  action={
                    <Link
                      to="/courses"
                      className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-brand-blue/50 transition-all duration-300 transform hover:scale-105"
                    >
                      <BookOpen className="w-5 h-5" />
                      Browse Courses
                    </Link>
                  }
                />
              </div>
            ) : (
              recentCourses.map((course, index) => (
              <div
                key={course.id}
                className="group relative overflow-hidden bg-transparent backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-blue to-brand-purple rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>

                {/* Course Thumbnail */}
                <div className="relative aspect-video overflow-hidden">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent"></div>
                  {/* Play Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/90 to-brand-purple/90 opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-center justify-center">
                    <div className="transform scale-75 group-hover:scale-100 transition-transform duration-500">
                      <div className="relative">
                        <div className="absolute inset-0 bg-white rounded-full blur-xl opacity-50"></div>
                        <PlayCircle className="relative w-20 h-20 text-white" />
                      </div>
                    </div>
                  </div>
                  {/* Progress Badge */}
                  <div className="absolute top-4 right-4 px-4 py-2 bg-white/90 dark:bg-dark-900/90 backdrop-blur-xl rounded-full border border-white/50 shadow-lg">
                    <span className="text-sm font-bold bg-gradient-to-r from-brand-blue to-brand-purple bg-clip-text text-transparent">
                      {course.progress}% Complete
                    </span>
                  </div>
                </div>

                {/* Course Info */}
                <div className="relative p-6">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 line-clamp-2 group-hover:text-brand-blue dark:group-hover:text-brand-purple transition-colors">
                    {course.title}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-text-dark-muted mb-4 flex items-center gap-2">
                    <Award className="w-4 h-4" />
                    {course.instructor}
                  </p>

                  {/* Progress Section */}
                  <div className="mb-5">
                    <div className="flex items-center justify-between text-sm mb-2">
                      <span className="text-gray-600 dark:text-text-dark-secondary font-semibold">
                        {course.lessonsCompleted} / {course.totalLessons} lessons
                      </span>
                    </div>
                    <div className="relative w-full h-3 bg-gray-200/50 dark:bg-dark-700/50 rounded-full overflow-hidden backdrop-blur-xl">
                      <div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red rounded-full transition-all duration-500 shadow-lg shadow-brand-blue/50"
                        style={{ width: `${course.progress}%` }}
                      >
                        <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Continue Button */}
                  <Link
                    to={`/courses/${course.id}/learn`}
                    className="relative w-full inline-flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-brand-blue to-brand-purple text-white rounded-2xl font-bold overflow-hidden group/btn transition-all duration-300 hover:shadow-2xl hover:shadow-brand-blue/50"
                  >
                    <span className="relative z-10 flex items-center gap-2">
                      <PlayCircle className="w-5 h-5" />
                      Continue Learning
                    </span>
                    {/* Button shine effect */}
                    <div className="absolute inset-0 -inset-x-full group-hover/btn:inset-x-0 bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12 transition-all duration-1000"></div>
                  </Link>
                </div>

                {/* Card shine effect */}
                <div className="absolute inset-0 -inset-x-full group-hover:inset-x-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 transition-all duration-1000 pointer-events-none"></div>
              </div>
              ))
            )}
          </div>
        </div>

        {/* Recommended Courses */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-black mb-2">
                <span className="bg-gradient-to-r from-brand-purple to-brand-red bg-clip-text text-transparent">
                  Recommended for You
                </span>
              </h2>
              <p className="text-gray-600 dark:text-text-dark-secondary">Handpicked courses to expand your skills</p>
            </div>
            <Link
              to="/courses"
              className="group flex items-center gap-2 px-6 py-3 bg-transparent backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl hover:border-brand-purple/50 transition-all duration-300 hover:scale-105"
            >
              <span className="font-semibold text-brand-purple">Browse all</span>
              <ArrowRight className="w-4 h-4 text-brand-purple group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {recommendations.length === 0 ? (
              <div className="col-span-full">
                <EmptyState
                  image={emptyRecommendations}
                  icon={<Star className="w-16 h-16" />}
                  title="No Recommendations Yet"
                  description="Check back soon for personalized course suggestions"
                />
              </div>
            ) : (
              recommendations.map((course, index) => (
              <div
                key={course.id}
                className="group relative overflow-hidden bg-transparent backdrop-blur-2xl rounded-3xl border border-gray-200/50 dark:border-gray-700/50 hover:border-brand-purple/50 dark:hover:border-brand-purple/50 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2"
              >
                {/* Glow effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-br from-brand-purple to-brand-red rounded-3xl blur-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500"></div>

                <div className="relative flex flex-col sm:flex-row">
                  {/* Thumbnail */}
                  <div className="sm:w-56 aspect-video sm:aspect-auto flex-shrink-0 overflow-hidden relative">
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-purple/20 to-brand-red/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                  </div>

                  {/* Info */}
                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary flex-1 line-clamp-2 group-hover:text-brand-purple dark:group-hover:text-brand-red transition-colors">
                        {course.title}
                      </h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-text-dark-muted mb-4 flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      {course.instructor}
                    </p>
                    <div className="flex items-center gap-6 text-sm mb-4">
                      <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                        <span className="font-bold text-gray-900 dark:text-text-dark-primary">{course.rating}</span>
                      </div>
                      <div className="text-gray-600 dark:text-text-dark-secondary font-medium">
                        {course.students.toLocaleString()} students
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto pt-4">
                      <div className="text-2xl font-black bg-gradient-to-r from-brand-purple to-brand-red bg-clip-text text-transparent">
                        {course.price}
                      </div>
                      <Link
                        to={`/courses/${course.id}`}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-brand-purple to-brand-red text-white rounded-2xl font-bold hover:shadow-2xl hover:shadow-brand-purple/50 transition-all duration-300 transform hover:scale-105"
                      >
                        View Course
                        <ArrowRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>

                {/* Card shine effect */}
                <div className="absolute inset-0 -inset-x-full group-hover:inset-x-0 bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12 transition-all duration-1000 pointer-events-none"></div>
              </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Custom Animations */}
      <style jsx="true">{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }

        @keyframes gradient-x {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        .animate-gradient-x {
          background-size: 200% 200%;
          animation: gradient-x 3s ease infinite;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.5s ease-out;
        }

        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-scale-in {
          animation: scale-in 0.5s ease-out forwards;
        }

        @keyframes slide-up {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.5s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
