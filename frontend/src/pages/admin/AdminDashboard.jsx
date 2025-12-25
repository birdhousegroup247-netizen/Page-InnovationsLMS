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
  UserX,
  FileText,
  Award,
  Activity,
  ArrowUp,
  ArrowDown,
  BarChart3,
  Shield,
} from 'lucide-react';
import api from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

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

      // Fetch stats from various endpoints
      const [usersRes, coursesRes, enrollmentsRes] = await Promise.all([
        api.get('/api/profile/stats').catch(() => ({ data: { data: {} } })),
        api.get('/api/courses').catch(() => ({ data: { data: { courses: [] } } })),
        api.get('/api/enrollments/my-courses').catch(() => ({ data: { data: { enrollments: [] } } })),
      ]);

      // Mock comprehensive stats (you'll replace with real API calls)
      const mockStats = {
        totalUsers: 1247,
        totalStudents: 1089,
        totalInstructors: 156,
        totalAdmins: 2,
        newUsersThisMonth: 89,
        usersGrowth: 7.2,

        totalCourses: coursesRes.data.data.courses?.length || 245,
        publishedCourses: coursesRes.data.data.courses?.filter(c => c.status === 'published').length || 198,
        draftCourses: coursesRes.data.data.courses?.filter(c => c.status === 'draft').length || 32,
        pendingCourses: coursesRes.data.data.courses?.filter(c => c.status === 'pending').length || 15,
        coursesGrowth: 12.5,

        totalEnrollments: 3456,
        activeEnrollments: 2890,
        completedEnrollments: 566,
        enrollmentsGrowth: 15.8,

        totalRevenue: 234567,
        monthlyRevenue: 45890,
        revenueGrowth: 23.4,

        pendingApplications: 8,
        certificatesIssued: 423,
        averageRating: 4.6,
      };

      setStats(mockStats);

      // Mock recent activity
      setRecentActivity([
        { id: 1, type: 'enrollment', user: 'John Doe', action: 'enrolled in', target: 'Advanced React Development', time: '5 minutes ago' },
        { id: 2, type: 'course', user: 'Jane Smith', action: 'created course', target: 'Python for Beginners', time: '1 hour ago' },
        { id: 3, type: 'certificate', user: 'Mike Johnson', action: 'earned certificate for', target: 'SQL Mastery', time: '2 hours ago' },
        { id: 4, type: 'instructor', user: 'Sarah Williams', action: 'applied to become instructor', target: '', time: '3 hours ago' },
        { id: 5, type: 'review', user: 'Tom Brown', action: 'left a 5-star review for', target: 'JavaScript Basics', time: '4 hours ago' },
      ]);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ title, value, subtitle, icon: Icon, color, trend, trendValue }) => (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 hover:border-gray-300 dark:hover:border-dark-600 transition-all">
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
      <h3 className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary mb-1 transition-colors">{value}</h3>
      <p className="text-sm text-gray-600 dark:text-text-dark-secondary transition-colors">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-text-dark-muted mt-2 transition-colors">{subtitle}</p>
      )}
    </div>
  );

  const ActivityItem = ({ activity }) => {
    const iconMap = {
      enrollment: BookOpen,
      course: FileText,
      certificate: Award,
      instructor: UserCheck,
      review: TrendingUp,
    };
    const Icon = iconMap[activity.type] || Activity;

    return (
      <div className="flex items-start gap-3 py-3 border-b border-gray-200 dark:border-border-dark last:border-0 transition-colors">
        <div className="flex-shrink-0 w-8 h-8 bg-brand-blue/10 rounded-full flex items-center justify-center">
          <Icon className="h-4 w-4 text-brand-blue" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 dark:text-text-dark-primary transition-colors">
            <span className="font-medium">{activity.user}</span>
            {' '}{activity.action}{' '}
            {activity.target && <span className="text-brand-blue">{activity.target}</span>}
          </p>
          <p className="text-xs text-gray-500 dark:text-text-dark-muted mt-1 transition-colors">{activity.time}</p>
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
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading dashboard...
            </p>
          </div>
        )}

        {!loading && (
          <>
            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Total Users"
                value={stats?.totalUsers || 0}
                subtitle={`${stats?.newUsersThisMonth || 0} new this month`}
                icon={Users}
                color="bg-brand-blue"
                trend="up"
                trendValue={stats?.usersGrowth}
              />
              <StatCard
                title="Total Courses"
                value={stats?.totalCourses || 0}
                subtitle={`${stats?.publishedCourses || 0} published`}
                icon={BookOpen}
                color="bg-brand-purple"
                trend="up"
                trendValue={stats?.coursesGrowth}
              />
              <StatCard
                title="Active Enrollments"
                value={stats?.activeEnrollments || 0}
                subtitle={`${stats?.totalEnrollments || 0} total enrollments`}
                icon={GraduationCap}
                color="bg-green-500"
                trend="up"
                trendValue={stats?.enrollmentsGrowth}
              />
              <StatCard
                title="Monthly Revenue"
                value={`$${(stats?.monthlyRevenue || 0).toLocaleString()}`}
                subtitle={`$${(stats?.totalRevenue || 0).toLocaleString()} total`}
                icon={DollarSign}
                color="bg-brand-red"
                trend="up"
                trendValue={stats?.revenueGrowth}
              />
            </div>

            {/* Secondary Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <StatCard
                title="Students"
                value={stats?.totalStudents || 0}
                icon={Users}
                color="bg-blue-500"
              />
              <StatCard
                title="Instructors"
                value={stats?.totalInstructors || 0}
                icon={UserCheck}
                color="bg-purple-500"
              />
              <StatCard
                title="Pending Applications"
                value={stats?.pendingApplications || 0}
                icon={UserX}
                color="bg-yellow-500"
              />
              <StatCard
                title="Certificates Issued"
                value={stats?.certificatesIssued || 0}
                icon={Award}
                color="bg-orange-500"
              />
            </div>

            {/* Two Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Recent Activity */}
              <div className="lg:col-span-2 bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary flex items-center gap-2 transition-colors">
                    <Activity className="h-5 w-5" />
                    Recent Activity
                  </h2>
                  <Link to="/admin/activity" className="text-sm text-brand-blue hover:text-brand-blue/80 transition-colors">
                    View All
                  </Link>
                </div>
                <div className="space-y-1">
                  {recentActivity.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 transition-colors">Quick Actions</h2>
                <div className="space-y-3">
                  <Link to="/admin/users" className="block w-full">
                    <Button variant="primary" fullWidth className="justify-start">
                      <Users className="h-4 w-4 mr-2" />
                      Manage Users
                    </Button>
                  </Link>
                  <Link to="/admin/courses" className="block w-full">
                    <Button variant="secondary" fullWidth className="justify-start">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Manage Courses
                    </Button>
                  </Link>
                  <Link to="/admin/instructor-applications" className="block w-full">
                    <Button variant="secondary" fullWidth className="justify-start">
                      <UserCheck className="h-4 w-4 mr-2" />
                      Review Applications
                      {stats?.pendingApplications > 0 && (
                        <span className="ml-auto bg-brand-red text-white text-xs px-2 py-1 rounded-full">
                          {stats.pendingApplications}
                        </span>
                      )}
                    </Button>
                  </Link>
                  <Link to="/admin/analytics" className="block w-full">
                    <Button variant="secondary" fullWidth className="justify-start">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      View Analytics
                    </Button>
                  </Link>
                </div>

                {/* Platform Health */}
                <div className="mt-6 pt-6 border-t border-gray-200 dark:border-border-dark transition-colors">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-text-dark-primary mb-4 transition-colors">Platform Health</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-text-dark-secondary transition-colors">System Status</span>
                      <span className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 transition-colors">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        Operational
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-text-dark-secondary transition-colors">Average Rating</span>
                      <span className="text-sm text-gray-900 dark:text-text-dark-primary font-medium transition-colors">
                        ⭐ {stats?.averageRating || 'N/A'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-text-dark-secondary transition-colors">Completion Rate</span>
                      <span className="text-sm text-gray-900 dark:text-text-dark-primary font-medium transition-colors">68%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Course Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary transition-colors">Published Courses</h3>
                  <FileText className="h-5 w-5 text-green-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary mb-1 transition-colors">{stats?.publishedCourses || 0}</p>
                <p className="text-xs text-gray-500 dark:text-text-dark-muted transition-colors">Live on platform</p>
              </div>
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary transition-colors">Pending Review</h3>
                  <FileText className="h-5 w-5 text-yellow-500" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary mb-1 transition-colors">{stats?.pendingCourses || 0}</p>
                <p className="text-xs text-gray-500 dark:text-text-dark-muted transition-colors">Awaiting approval</p>
              </div>
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-medium text-gray-600 dark:text-text-dark-secondary transition-colors">Draft Courses</h3>
                  <FileText className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary mb-1 transition-colors">{stats?.draftCourses || 0}</p>
                <p className="text-xs text-gray-500 dark:text-text-dark-muted transition-colors">In development</p>
              </div>
            </div>
          </>
        )}
      </Container>
    </>
  );
}
