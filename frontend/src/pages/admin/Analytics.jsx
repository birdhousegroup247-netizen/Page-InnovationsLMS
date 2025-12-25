import { useState, useEffect } from 'react';
import api from '../../lib/api';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  DollarSign,
  Award,
  Activity,
  ArrowUp,
  ArrowDown,
  Calendar,
  Target,
  Zap,
  Clock,
} from 'lucide-react';
import { Container } from '../../components/layout';
import { Button, Spinner, Select } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [analytics, setAnalytics] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);

      // Mock analytics data (you'll replace with real API calls)
      const mockData = {
        overview: {
          totalRevenue: 234567,
          revenueGrowth: 23.4,
          totalUsers: 1247,
          usersGrowth: 7.2,
          totalEnrollments: 3456,
          enrollmentsGrowth: 15.8,
          averageRating: 4.6,
          ratingGrowth: 2.1,
        },
        userMetrics: {
          activeUsers: 892,
          newUsers: 89,
          returnRate: 68.5,
          averageSessionTime: 28, // minutes
        },
        courseMetrics: {
          mostPopularCourses: [
            { id: 1, title: 'Advanced React Development', enrollments: 342, rating: 4.8 },
            { id: 2, title: 'Python for Data Science', enrollments: 298, rating: 4.7 },
            { id: 3, title: 'Full Stack Web Development', enrollments: 256, rating: 4.9 },
            { id: 4, title: 'Machine Learning Basics', enrollments: 234, rating: 4.6 },
            { id: 5, title: 'AWS Cloud Architecture', enrollments: 212, rating: 4.8 },
          ],
          completionRate: 64.3,
          averageProgress: 72.8,
        },
        instructorMetrics: {
          topInstructors: [
            { id: 1, name: 'Dr. Sarah Williams', courses: 8, students: 1243, rating: 4.9 },
            { id: 2, name: 'John Smith', courses: 12, students: 987, rating: 4.8 },
            { id: 3, name: 'Emily Johnson', courses: 6, students: 856, rating: 4.7 },
            { id: 4, name: 'Michael Chen', courses: 9, students: 789, rating: 4.8 },
            { id: 5, name: 'Lisa Anderson', courses: 7, students: 654, rating: 4.9 },
          ],
          totalInstructors: 156,
          activeInstructors: 142,
        },
        revenueBreakdown: {
          subscriptions: 145000,
          courseEnrollments: 89567,
        },
        engagement: {
          dailyActiveUsers: 342,
          weeklyActiveUsers: 892,
          monthlyActiveUsers: 1247,
          averageTimeOnPlatform: 45, // minutes per session
        },
      };

      setAnalytics(mockData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const MetricCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue, large = false }) => (
    <div className={cn(
      'bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 hover:border-gray-300 dark:hover:border-dark-600 transition-all',
      large && 'lg:col-span-2'
    )}>
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {trend === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span>{trendValue}%</span>
          </div>
        )}
      </div>
      <h3 className={cn(
        'font-bold text-gray-900 dark:text-text-dark-primary mb-1 transition-colors',
        large ? 'text-3xl' : 'text-2xl'
      )}>
        {value}
      </h3>
      <p className="text-sm text-gray-600 dark:text-text-dark-secondary transition-colors">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-text-dark-muted mt-2 transition-colors">{subtitle}</p>
      )}
    </div>
  );

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <BarChart3 className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                    Platform Analytics
                  </h1>
                  <p className="text-lg text-white/90 animate-fade-in mt-1">
                    Comprehensive insights and performance metrics
                  </p>
                </div>
              </div>
              <div className="hidden md:block">
                <Select
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  options={[
                    { value: '7d', label: 'Last 7 days' },
                    { value: '30d', label: 'Last 30 days' },
                    { value: '90d', label: 'Last 90 days' },
                    { value: '1y', label: 'Last year' },
                  ]}
                  className="bg-white/10 backdrop-blur-sm border-white/20 text-white"
                />
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading analytics...
            </p>
          </div>
        ) : (
          <>
            {/* Key Metrics */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
                <Target className="h-6 w-6 text-brand-blue" />
                Key Performance Indicators
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Total Revenue"
                  value={`$${analytics?.overview.totalRevenue.toLocaleString()}`}
                  subtitle="All time revenue"
                  icon={DollarSign}
                  color="bg-green-500"
                  trend="up"
                  trendValue={analytics?.overview.revenueGrowth}
                />
                <MetricCard
                  title="Total Users"
                  value={analytics?.overview.totalUsers.toLocaleString()}
                  subtitle={`+${analytics?.userMetrics.newUsers} this month`}
                  icon={Users}
                  color="bg-brand-blue"
                  trend="up"
                  trendValue={analytics?.overview.usersGrowth}
                />
                <MetricCard
                  title="Total Enrollments"
                  value={analytics?.overview.totalEnrollments.toLocaleString()}
                  subtitle="Active learning sessions"
                  icon={BookOpen}
                  color="bg-brand-purple"
                  trend="up"
                  trendValue={analytics?.overview.enrollmentsGrowth}
                />
                <MetricCard
                  title="Average Rating"
                  value={analytics?.overview.averageRating}
                  subtitle="Platform-wide satisfaction"
                  icon={Award}
                  color="bg-yellow-500"
                  trend="up"
                  trendValue={analytics?.overview.ratingGrowth}
                />
              </div>
            </div>

            {/* User Engagement */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
                <Activity className="h-6 w-6 text-brand-purple" />
                User Engagement
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard
                  title="Daily Active Users"
                  value={analytics?.engagement.dailyActiveUsers.toLocaleString()}
                  icon={Zap}
                  color="bg-orange-500"
                />
                <MetricCard
                  title="Weekly Active Users"
                  value={analytics?.engagement.weeklyActiveUsers.toLocaleString()}
                  icon={Activity}
                  color="bg-blue-500"
                />
                <MetricCard
                  title="Monthly Active Users"
                  value={analytics?.engagement.monthlyActiveUsers.toLocaleString()}
                  icon={Users}
                  color="bg-purple-500"
                />
                <MetricCard
                  title="Avg. Session Time"
                  value={`${analytics?.engagement.averageTimeOnPlatform} min`}
                  icon={Clock}
                  color="bg-pink-500"
                />
              </div>
            </div>

            {/* Course Performance */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-green-500" />
                Course Performance
              </h2>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary mb-4">
                    Most Popular Courses
                  </h3>
                  <div className="space-y-3">
                    {analytics?.courseMetrics.mostPopularCourses.map((course, index) => (
                      <div
                        key={course.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                            index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
                            index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          )}>
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary truncate">
                              {course.title}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-text-dark-muted">
                              {course.enrollments} students
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          <Award className="w-4 h-4" />
                          {course.rating}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-6">
                  <MetricCard
                    title="Completion Rate"
                    value={`${analytics?.courseMetrics.completionRate}%`}
                    subtitle="Students completing courses"
                    icon={Target}
                    color="bg-green-500"
                  />
                  <MetricCard
                    title="Average Progress"
                    value={`${analytics?.courseMetrics.averageProgress}%`}
                    subtitle="Across all enrollments"
                    icon={TrendingUp}
                    color="bg-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Top Instructors */}
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
                <Users className="h-6 w-6 text-brand-blue" />
                Top Performing Instructors
              </h2>
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-border-dark">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase">Rank</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase">Instructor</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase">Courses</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase">Students</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-text-dark-secondary uppercase">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                      {analytics?.instructorMetrics.topInstructors.map((instructor, index) => (
                        <tr key={instructor.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                              index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                              index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
                              index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                              'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            )}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-text-dark-primary">
                            {instructor.name}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-text-dark-secondary">
                            {instructor.courses}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-600 dark:text-text-dark-secondary">
                            {instructor.students.toLocaleString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                              <Award className="w-4 h-4" />
                              {instructor.rating}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Revenue Breakdown */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
                <DollarSign className="h-6 w-6 text-green-500" />
                Revenue Breakdown
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary mb-4">
                    Subscriptions
                  </h3>
                  <p className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">
                    ${analytics?.revenueBreakdown.subscriptions.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
                    {((analytics?.revenueBreakdown.subscriptions / analytics?.overview.totalRevenue) * 100).toFixed(1)}% of total revenue
                  </p>
                </div>
                <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-text-dark-primary mb-4">
                    Course Enrollments
                  </h3>
                  <p className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                    ${analytics?.revenueBreakdown.courseEnrollments.toLocaleString()}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
                    {((analytics?.revenueBreakdown.courseEnrollments / analytics?.overview.totalRevenue) * 100).toFixed(1)}% of total revenue
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </Container>
    </>
  );
}
