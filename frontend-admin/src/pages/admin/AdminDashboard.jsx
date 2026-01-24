import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  Users,
  BookOpen,
  GraduationCap,
  TrendingUp,
  DollarSign,
  UserCheck,
  Award,
  Activity,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Shield,
  Clock,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { adminStatsAPI, adminInstructorAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner } from '../../components/ui';
import { cn } from '../../utils/cn';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [enrollmentTrends, setEnrollmentTrends] = useState([]);
  const [popularCourses, setPopularCourses] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [systemHealth, setSystemHealth] = useState(null);
  const [instructorStats, setInstructorStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Check if user is admin
    if (user && !['admin', 'super_admin'].includes(user.role)) {
      navigate('/dashboard');
      return;
    }

    fetchDashboardData();
  }, [user, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all data in parallel
      const [overviewRes, trendsRes, coursesRes, activitiesRes, healthRes, instructorRes] = await Promise.all([
        adminStatsAPI.getOverview(),
        adminStatsAPI.getEnrollmentTrends(30),
        adminStatsAPI.getPopularCourses(5),
        adminStatsAPI.getRecentActivities(10),
        adminStatsAPI.getSystemHealth(),
        adminInstructorAPI.getStats(),
      ]);

      setStats(overviewRes.data.data);
      setEnrollmentTrends(trendsRes.data.data.enrollments || []);
      setPopularCourses(coursesRes.data.data.courses || []);

      // Process activities from both enrollments and certificates
      const activities = [];
      const enrollments = activitiesRes.data.data.recentEnrollments || [];
      const certificates = activitiesRes.data.data.recentCertificates || [];

      enrollments.forEach(enrollment => {
        activities.push({
          id: `enr-${enrollment.id}`,
          type: 'enrollment',
          user: enrollment.student?.full_name || 'Unknown',
          action: 'enrolled in',
          target: enrollment.course?.title || 'Unknown Course',
          time: new Date(enrollment.enrollment_date),
        });
      });

      certificates.forEach(cert => {
        activities.push({
          id: `cert-${cert.id}`,
          type: 'certificate',
          user: cert.student_name,
          action: 'earned certificate for',
          target: cert.course_title,
          time: new Date(cert.issue_date),
        });
      });

      // Sort by time desc and take top 10
      activities.sort((a, b) => b.time - a.time);
      setRecentActivities(activities.slice(0, 10));

      setSystemHealth(healthRes.data.data);
      setInstructorStats(instructorRes.data.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data. Please try refreshing the page.');
    } finally {
      setLoading(false);
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (days < 7) return `${days} day${days > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue, onClick }) => (
    <div
      className={cn(
        'bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 hover:border-gray-300 dark:hover:border-dark-600 transition-all',
        onClick && 'cursor-pointer hover:shadow-lg'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {trend && trendValue !== undefined && (
          <div className={cn(
            'flex items-center gap-1 text-sm font-medium',
            trend === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          )}>
            {trend === 'up' ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
            <span>{Math.abs(trendValue)}%</span>
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 transition-colors">{value}</h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 transition-colors">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">{subtitle}</p>
      )}
    </div>
  );

  const ActivityItem = ({ activity }) => {
    const iconMap = {
      enrollment: BookOpen,
      certificate: Award,
    };
    const Icon = iconMap[activity.type] || Activity;

    return (
      <div className="flex items-start gap-3 py-3 border-b border-gray-200 dark:border-border-dark last:border-0 transition-colors">
        <div className="flex-shrink-0 w-8 h-8 bg-brand-blue/10 rounded-full flex items-center justify-center">
          <Icon className="h-4 w-4 text-brand-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-white transition-colors">
            <span className="font-medium">{activity.user}</span>
            {' '}{activity.action}{' '}
            {activity.target && <span className="text-brand-blue">{activity.target}</span>}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 transition-colors">{formatTimeAgo(activity.time)}</p>
        </div>
      </div>
    );
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
            <div className="flex items-center gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Shield className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  Admin Dashboard
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  Welcome back, {user?.full_name?.split(' ')[0]}! Here's your platform overview
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Error State */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
              <p className="text-red-800 dark:text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium transition-colors">
              Loading dashboard...
            </p>
          </div>
        )}

        {!loading && stats && (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Users"
                value={stats.users?.total || 0}
                subtitle={`${stats.users?.active || 0} active users`}
                icon={Users}
                color="bg-brand-blue"
                onClick={() => navigate('/users')}
              />
              <StatCard
                title="Total Courses"
                value={stats.courses?.total || 0}
                subtitle={`${stats.courses?.published || 0} published`}
                icon={BookOpen}
                color="bg-brand-purple"
                onClick={() => navigate('/courses')}
              />
              <StatCard
                title="Total Enrollments"
                value={stats.enrollments?.total || 0}
                subtitle={`${stats.enrollments?.completionRate || 0}% completion rate`}
                icon={GraduationCap}
                color="bg-green-500"
              />
              <StatCard
                title="Certificates Issued"
                value={stats.certificates?.total || 0}
                subtitle="Student achievements"
                icon={Award}
                color="bg-yellow-500"
              />
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Enrollment Trends Chart */}
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-brand-blue" />
                  Enrollment Trends (Last 30 Days)
                </h2>
                {enrollmentTrends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={enrollmentTrends}>
                      <defs>
                        <linearGradient id="colorEnrollments" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis
                        dataKey="date"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                        labelFormatter={(value) => new Date(value).toLocaleDateString()}
                      />
                      <Area
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        fillOpacity={1}
                        fill="url(#colorEnrollments)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No enrollment data available
                  </div>
                )}
              </div>

              {/* Popular Courses Chart */}
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-brand-purple" />
                  Top 5 Popular Courses
                </h2>
                {popularCourses.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={popularCourses} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="title"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        width={120}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="enrollment_count" fill="#8b5cf6" radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-gray-500 dark:text-gray-400">
                    No course data available
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Students"
                value={stats.users?.students || 0}
                icon={Users}
                color="bg-blue-500"
              />
              <StatCard
                title="Instructors"
                value={stats.users?.instructors || 0}
                icon={UserCheck}
                color="bg-purple-500"
              />
              <StatCard
                title="Pending Applications"
                value={instructorStats?.pending || 0}
                icon={Clock}
                color="bg-yellow-500"
                onClick={() => navigate('/instructor-applications')}
              />
              <StatCard
                title="Completed Enrollments"
                value={stats.enrollments?.completed || 0}
                icon={CheckCircle}
                color="bg-green-500"
              />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Recent Activity */}
              <div className="lg:col-span-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2 transition-colors">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </h2>
                  <Link to="/activity" className="text-sm text-brand-blue hover:text-brand-blue/80 transition-colors">
                    View All
                  </Link>
                </div>
                <div className="space-y-1">
                  {recentActivities.length > 0 ? (
                    recentActivities.map((activity) => (
                      <ActivityItem key={activity.id} activity={activity} />
                    ))
                  ) : (
                    <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                      No recent activities
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions & System Health */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 transition-colors">Quick Actions</h2>
                  <div className="space-y-3">
                    <Link to="/users" className="block w-full">
                      <Button variant="primary" fullWidth className="justify-start">
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                      </Button>
                    </Link>
                    <Link to="/courses" className="block w-full">
                      <Button variant="secondary" fullWidth className="justify-start">
                        <BookOpen className="h-4 w-4 mr-2" />
                        Manage Courses
                      </Button>
                    </Link>
                    <Link to="/instructor-applications" className="block w-full">
                      <Button variant="secondary" fullWidth className="justify-start">
                        <UserCheck className="h-4 w-4 mr-2" />
                        Review Applications
                        {instructorStats?.pending > 0 && (
                          <span className="ml-auto bg-brand-red text-white text-xs px-2 py-1 rounded-full">
                            {instructorStats.pending}
                          </span>
                        )}
                      </Button>
                    </Link>
                    <Link to="/analytics" className="block w-full">
                      <Button variant="secondary" fullWidth className="justify-start">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Analytics
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* System Health */}
                {systemHealth && (
                  <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 transition-colors">System Health</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Database</span>
                        <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 transition-colors">
                          <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                          {systemHealth.database?.status || 'healthy'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">DB Size</span>
                        <span className="text-sm text-gray-900 dark:text-white font-medium transition-colors">
                          {systemHealth.database?.sizeMs?.toFixed(2) || 0} MB
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Uptime</span>
                        <span className="text-sm text-gray-900 dark:text-white font-medium transition-colors">
                          {Math.floor((systemHealth.server?.uptime || 0) / 3600)}h {Math.floor(((systemHealth.server?.uptime || 0) % 3600) / 60)}m
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400 transition-colors">Memory</span>
                        <span className="text-sm text-gray-900 dark:text-white font-medium transition-colors">
                          {systemHealth.server?.memory?.used || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Course Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors">Published Courses</h3>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1 transition-colors">{stats.courses?.published || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">Live on platform</p>
              </div>
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors">Draft Courses</h3>
                  <Clock className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1 transition-colors">{stats.courses?.draft || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">In development</p>
              </div>
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400 transition-colors">Total Questions</h3>
                  <Award className="h-5 w-5 text-brand-blue" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-1 transition-colors">{stats.questions?.total || 0}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 transition-colors">{stats.questions?.approved || 0} approved</p>
              </div>
            </div>
          </>
        )}
      </Container>
    </>
  );
}
