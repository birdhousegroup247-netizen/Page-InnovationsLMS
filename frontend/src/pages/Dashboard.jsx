import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';
import { BookOpen, Award, Clock, TrendingUp, PlayCircle, ArrowRight, Star } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();

  const stats = [
    {
      title: 'Enrolled Courses',
      value: '12',
      icon: BookOpen,
      iconBg: 'bg-brand-blue/20',
      iconColor: 'text-brand-blue',
      trend: { value: '+2', label: 'this month' },
    },
    {
      title: 'Completed',
      value: '8',
      icon: Award,
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-500',
      trend: { value: '+3', label: 'this month' },
    },
    {
      title: 'Hours Learned',
      value: '145',
      icon: Clock,
      iconBg: 'bg-brand-purple/20',
      iconColor: 'text-brand-purple',
      trend: { value: '+12', label: 'this week' },
    },
    {
      title: 'Progress',
      value: '67%',
      icon: TrendingUp,
      iconBg: 'bg-brand-red/20',
      iconColor: 'text-brand-red',
      trend: { value: '+5%', label: 'from last week' },
    },
  ];

  const recentCourses = [
    {
      id: 1,
      title: 'Advanced SQL Mastery',
      progress: 75,
      instructor: 'John Doe',
      thumbnail: 'https://placehold.co/400x225/0e2b5c/ffffff?text=SQL+Mastery',
      duration: '8h 30m',
      lessonsCompleted: 15,
      totalLessons: 20,
    },
    {
      id: 2,
      title: 'React Development',
      progress: 45,
      instructor: 'Jane Smith',
      thumbnail: 'https://placehold.co/400x225/2e3192/ffffff?text=React+Dev',
      duration: '12h 15m',
      lessonsCompleted: 9,
      totalLessons: 20,
    },
    {
      id: 3,
      title: 'Node.js Backend',
      progress: 90,
      instructor: 'Mike Johnson',
      thumbnail: 'https://placehold.co/400x225/eb1c22/ffffff?text=Node.js',
      duration: '10h 45m',
      lessonsCompleted: 18,
      totalLessons: 20,
    },
  ];

  const recommendations = [
    {
      id: 4,
      title: 'Python for Data Science',
      instructor: 'Dr. Sarah Williams',
      rating: 4.8,
      students: 12543,
      thumbnail: 'https://placehold.co/400x225/0e2b5c/ffffff?text=Python+DS',
      level: 'Intermediate',
      price: '$49.99',
    },
    {
      id: 5,
      title: 'Advanced JavaScript Patterns',
      instructor: 'Alex Chen',
      rating: 4.9,
      students: 8932,
      thumbnail: 'https://placehold.co/400x225/2e3192/ffffff?text=JS+Patterns',
      level: 'Advanced',
      price: '$59.99',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8 animate-fade-in">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
          Welcome back, {user?.full_name?.split(' ')[0]}! 👋
        </h1>
        <p className="text-gray-600 dark:text-text-dark-secondary transition-colors">
          Continue your learning journey where you left off
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-card-hover transition-all animate-scale-in"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`${stat.iconBg} p-3 rounded-lg transition-colors`}>
                <stat.icon className={`h-6 w-6 ${stat.iconColor} transition-colors`} />
              </div>
            </div>
            <h3 className="text-gray-600 dark:text-text-dark-secondary text-sm mb-1 transition-colors">
              {stat.title}
            </h3>
            <p className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary mb-2 transition-colors">
              {stat.value}
            </p>
            <div className="flex items-center text-sm">
              <span className="text-green-500 font-medium">{stat.trend.value}</span>
              <span className="text-gray-500 dark:text-text-dark-muted ml-1 transition-colors">
                {stat.trend.label}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Continue Learning Section */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">
            Continue Learning
          </h2>
          <Link
            to="/my-courses"
            className="text-brand-blue hover:text-brand-blue-light font-medium text-sm flex items-center gap-1 transition-colors"
          >
            View all courses
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recentCourses.map((course, index) => (
            <div
              key={course.id}
              className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-card-hover transition-all group animate-slide-up"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Course Thumbnail */}
              <div className="relative aspect-video overflow-hidden bg-gray-100 dark:bg-dark-700 transition-colors">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {/* Play Overlay */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <PlayCircle className="w-16 h-16 text-white" />
                </div>
              </div>

              {/* Course Info */}
              <div className="p-5">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-2 line-clamp-2 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-text-dark-muted mb-4 transition-colors">
                  by {course.instructor}
                </p>

                {/* Progress Section */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
                      {course.lessonsCompleted}/{course.totalLessons} lessons
                    </span>
                    <span className="text-brand-blue font-semibold">{course.progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-dark-700 rounded-full h-2 transition-colors">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-brand-blue to-brand-purple transition-all duration-300"
                      style={{ width: `${course.progress}%` }}
                    ></div>
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
          ))}
        </div>
      </div>

      {/* Recommended Courses */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary transition-colors">
            Recommended for You
          </h2>
          <Link
            to="/courses"
            className="text-brand-blue hover:text-brand-blue-light font-medium text-sm flex items-center gap-1 transition-colors"
          >
            Browse all
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-dark-800 rounded-xl overflow-hidden shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-card-hover transition-all group"
            >
              <div className="flex flex-col sm:flex-row">
                {/* Thumbnail */}
                <div className="sm:w-48 aspect-video sm:aspect-auto bg-gray-100 dark:bg-dark-700 flex-shrink-0 transition-colors">
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  />
                </div>

                {/* Info */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary flex-1 line-clamp-2 group-hover:text-brand-blue transition-colors">
                      {course.title}
                    </h3>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-text-dark-muted mb-3 transition-colors">
                    by {course.instructor}
                  </p>
                  <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-text-dark-secondary mb-4 transition-colors">
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium">{course.rating}</span>
                    </div>
                    <div>{course.students.toLocaleString()} students</div>
                    <div className="ml-auto">
                      <span className="text-brand-blue font-bold">{course.price}</span>
                    </div>
                  </div>
                  <Link
                    to={`/courses/${course.id}`}
                    className="inline-flex items-center text-brand-blue hover:text-brand-blue-light font-medium text-sm transition-colors"
                  >
                    View course
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
