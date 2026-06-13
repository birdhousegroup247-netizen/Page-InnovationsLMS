import { useState, useEffect } from 'react';
import { adminAnalyticsAPI, adminStatsAPI } from '../../lib/api';
import {
  BarChart3,
  TrendingUp,
  Users,
  BookOpen,
  DollarSign,
  Activity,
  Award,
  Target,
  Zap,
  Clock,
  PieChart,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Container, PageHeader } from '../../components/layout';
import { Spinner, Select } from '../../components/ui';
import { cn } from '../../utils/cn';
import {
  PieChart as RePieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

const COLORS = {
  primary: '#3b82f6',
  purple: '#8b5cf6',
  green: '#10b981',
  yellow: '#f59e0b',
  red: '#ef4444',
  pink: '#ec4899',
  indigo: '#6366f1',
  teal: '#14b8a6',
  orange: '#f97316',
};

const CHART_COLORS = [COLORS.primary, COLORS.purple, COLORS.green, COLORS.yellow, COLORS.pink, COLORS.indigo, COLORS.teal, COLORS.orange];

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeRange, setTimeRange] = useState('30');

  const [studentPerformance, setStudentPerformance] = useState(null);
  const [courseAnalytics, setCourseAnalytics] = useState(null);
  const [questionAnalytics, setQuestionAnalytics] = useState(null);
  const [instructorAnalytics, setInstructorAnalytics] = useState(null);
  const [enrollmentAnalytics, setEnrollmentAnalytics] = useState(null);
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, [timeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError(null);

    const [
      studentRes,
      courseRes,
      questionRes,
      instructorRes,
      enrollmentRes,
      overviewRes,
    ] = await Promise.allSettled([
      adminAnalyticsAPI.getStudentPerformance(),
      adminAnalyticsAPI.getCourseAnalytics(),
      adminAnalyticsAPI.getQuestionAnalytics(),
      adminAnalyticsAPI.getInstructorAnalytics(),
      adminAnalyticsAPI.getEnrollmentAnalytics(parseInt(timeRange)),
      adminStatsAPI.getOverview(),
    ]);

    const failed = [studentRes, courseRes, questionRes, instructorRes, enrollmentRes, overviewRes]
      .filter((r) => r.status === 'rejected');

    if (failed.length === 6) {
      // All failed — show error
      setError('Failed to load analytics data. Please try refreshing the page.');
      setLoading(false);
      return;
    }

    if (failed.length > 0) {
      console.warn(`${failed.length} analytics endpoint(s) failed`);
    }

    if (studentRes.status === 'fulfilled') setStudentPerformance(studentRes.value.data.data);
    if (courseRes.status === 'fulfilled') setCourseAnalytics(courseRes.value.data.data);
    if (questionRes.status === 'fulfilled') setQuestionAnalytics(questionRes.value.data.data);
    if (instructorRes.status === 'fulfilled') setInstructorAnalytics(instructorRes.value.data.data);
    if (enrollmentRes.status === 'fulfilled') setEnrollmentAnalytics(enrollmentRes.value.data.data);
    if (overviewRes.status === 'fulfilled') setOverview(overviewRes.value.data.data);

    setLoading(false);
  };

  const MetricCard = ({ title, value, subtitle, icon: Icon, color, change }) => (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 hover:border-gray-300 dark:hover:border-dark-600 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center', color)}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        {change && (
          <div className={cn(
            'text-sm font-medium px-2 py-1 rounded',
            change > 0 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
          )}>
            {change > 0 ? '+' : ''}{change}%
          </div>
        )}
      </div>
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-1 transition-colors">{value}</h3>
      <p className="text-sm text-gray-600 dark:text-text-dark-secondary transition-colors">{title}</p>
      {subtitle && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 transition-colors">{subtitle}</p>
      )}
    </div>
  );

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700 text-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-gray-300">{payload[0].value}{payload[0].payload.percentage && ` (${payload[0].payload.percentage}%)`}</p>
        </div>
      );
    }
    return null;
  };

  const PieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const total = payload[0].payload.total;
      const pct = total ? ((payload[0].value / total) * 100).toFixed(1) : payload[0].payload.percent != null ? (payload[0].payload.percent * 100).toFixed(1) : '';
      return (
        <div className="bg-gray-900 text-white p-3 rounded-lg shadow-lg border border-gray-700 text-sm">
          <p className="font-medium">{payload[0].name}</p>
          <p className="text-gray-300">{payload[0].value} {pct ? `(${pct}%)` : ''}</p>
        </div>
      );
    }
    return null;
  };

  const PieLegend = ({ data }) => (
    <div className="mt-4 space-y-2">
      {data.map((entry, i) => (
        <div key={i} className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
            <span className="text-gray-700 dark:text-gray-300 truncate">{entry.name}</span>
          </div>
          <span className="font-semibold text-gray-900 dark:text-white ml-3 flex-shrink-0">{entry.pct}%</span>
        </div>
      ))}
    </div>
  );

  return (
    <>
      <PageHeader
        icon={BarChart3}
        title="Platform Analytics"
        subtitle="Comprehensive insights and performance metrics"
        actions={
          <Select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            options={[
              { value: '7', label: 'Last 7 days' },
              { value: '30', label: 'Last 30 days' },
              { value: '90', label: 'Last 90 days' },
              { value: '365', label: 'Last year' },
            ]}
            className="bg-white/10 backdrop-blur-sm border-white/20 text-white min-w-[150px]"
          />
        }
      />

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
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading analytics...
            </p>
          </div>
        )}

        {!loading && overview && (
          <>
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <MetricCard
                title="Total Users"
                value={overview.users?.total || 0}
                subtitle={`${overview.users?.active || 0} active`}
                icon={Users}
                color="bg-brand-blue"
              />
              <MetricCard
                title="Total Courses"
                value={overview.courses?.total || 0}
                subtitle={`${overview.courses?.published || 0} published`}
                icon={BookOpen}
                color="bg-brand-purple"
              />
              <MetricCard
                title="Total Enrollments"
                value={overview.enrollments?.total || 0}
                subtitle={`${overview.enrollments?.completionRate || 0}% completion`}
                icon={Activity}
                color="bg-green-500"
              />
              <MetricCard
                title="Questions Bank"
                value={overview.questions?.total || 0}
                subtitle={`${overview.questions?.approved || 0} approved`}
                icon={Award}
                color="bg-yellow-500"
              />
            </div>

            {/* Charts Row 1 - Pie Charts for Distribution */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              {/* Courses by Category */}
              {courseAnalytics?.coursesByCategory && courseAnalytics.coursesByCategory.length > 0 && (() => {
                const total = courseAnalytics.coursesByCategory.reduce((s, c) => s + (parseInt(c.course_count) || 0), 0);
                const data = courseAnalytics.coursesByCategory.map(cat => ({
                  name: cat.category?.name || 'Unknown',
                  value: parseInt(cat.course_count) || 0,
                  pct: total ? ((parseInt(cat.course_count) || 0) / total * 100).toFixed(0) : 0,
                }));
                return (
                  <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-brand-blue" />
                      Courses by Category
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <RePieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3}>
                          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <PieLegend data={data} />
                  </div>
                );
              })()}

              {/* Courses by Difficulty */}
              {courseAnalytics?.coursesByDifficulty && courseAnalytics.coursesByDifficulty.length > 0 && (() => {
                const total = courseAnalytics.coursesByDifficulty.reduce((s, d) => s + (parseInt(d.count) || 0), 0);
                const data = courseAnalytics.coursesByDifficulty.map(diff => ({
                  name: diff.difficulty?.charAt(0).toUpperCase() + diff.difficulty?.slice(1) || 'Unknown',
                  value: parseInt(diff.count) || 0,
                  pct: total ? ((parseInt(diff.count) || 0) / total * 100).toFixed(0) : 0,
                }));
                return (
                  <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Target className="h-4 w-4 text-brand-purple" />
                      Course Difficulty
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <RePieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3}>
                          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <PieLegend data={data} />
                  </div>
                );
              })()}

              {/* Questions by Type */}
              {questionAnalytics?.questionsByType && questionAnalytics.questionsByType.length > 0 && (() => {
                const total = questionAnalytics.questionsByType.reduce((s, t) => s + (parseInt(t.count) || 0), 0);
                const data = questionAnalytics.questionsByType.map(type => ({
                  name: type.question_type?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase()) || 'Unknown',
                  value: parseInt(type.count) || 0,
                  pct: total ? ((parseInt(type.count) || 0) / total * 100).toFixed(0) : 0,
                }));
                return (
                  <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                    <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <Award className="h-4 w-4 text-green-500" />
                      Question Types
                    </h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <RePieChart>
                        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={85} dataKey="value" paddingAngle={3}>
                          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                      </RePieChart>
                    </ResponsiveContainer>
                    <PieLegend data={data} />
                  </div>
                );
              })()}
            </div>

            {/* Charts Row 2 - Line Charts for Trends */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Enrollment Trends */}
              {enrollmentAnalytics?.enrollmentsByDay && enrollmentAnalytics.enrollmentsByDay.length > 0 && (
                <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-brand-blue" />
                    Enrollment & Completion Trends
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={enrollmentAnalytics.enrollmentsByDay.map((enr, idx) => ({
                      date: enr.date,
                      enrollments: parseInt(enr.count) || 0,
                      completions: parseInt(enrollmentAnalytics.completionsByDay?.[idx]?.count) || 0,
                    }))}>
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
                      />
                      <Legend />
                      <Line type="monotone" dataKey="enrollments" stroke={COLORS.primary} strokeWidth={2} dot={{ fill: COLORS.primary }} />
                      <Line type="monotone" dataKey="completions" stroke={COLORS.green} strokeWidth={2} dot={{ fill: COLORS.green }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Course Creation Trends */}
              {courseAnalytics?.courseCreationTrends && courseAnalytics.courseCreationTrends.length > 0 && (
                <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-brand-purple" />
                    Course Creation Trends (12 Months)
                  </h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={courseAnalytics.courseCreationTrends.map(trend => ({
                      month: trend.month,
                      courses: parseInt(trend.count) || 0,
                    }))}>
                      <defs>
                        <linearGradient id="colorCourses" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.purple} stopOpacity={0.3}/>
                          <stop offset="95%" stopColor={COLORS.purple} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis
                        dataKey="month"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                      />
                      <YAxis stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="courses"
                        stroke={COLORS.purple}
                        fillOpacity={1}
                        fill="url(#colorCourses)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Performance Metrics */}
            {studentPerformance && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {[
                  {
                    icon: Target, color: 'bg-blue-500', label: 'Practice Tests',
                    value: `${parseFloat(studentPerformance.practiceTests?.avgScore || 0).toFixed(1)}%`,
                    sub: `Avg score · ${studentPerformance.practiceTests?.totalAttempts || 0} attempts`,
                    bar: parseFloat(studentPerformance.practiceTests?.avgScore || 0),
                    barColor: 'bg-blue-500',
                  },
                  {
                    icon: CheckCircle, color: 'bg-green-500', label: 'Assigned Tests',
                    value: `${parseFloat(studentPerformance.assignedTests?.passRate || 0).toFixed(1)}%`,
                    sub: `Pass rate · ${studentPerformance.assignedTests?.passedCount || 0}/${studentPerformance.assignedTests?.totalAttempts || 0} passed`,
                    bar: parseFloat(studentPerformance.assignedTests?.passRate || 0),
                    barColor: 'bg-green-500',
                  },
                  {
                    icon: Award, color: 'bg-purple-500', label: 'Course Completion',
                    value: `${parseFloat(studentPerformance.courseCompletion?.completionRate || 0).toFixed(1)}%`,
                    sub: `${studentPerformance.courseCompletion?.completedEnrollments || 0} / ${studentPerformance.courseCompletion?.totalEnrollments || 0} enrollments`,
                    bar: parseFloat(studentPerformance.courseCompletion?.completionRate || 0),
                    barColor: 'bg-purple-500',
                  },
                ].map(({ icon: Icon, color, label, value, sub, bar, barColor }) => (
                  <div key={label} className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                    <div className="flex items-center gap-3 mb-5">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center', color)}>
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <h3 className="text-sm font-semibold text-gray-600 dark:text-text-dark-secondary uppercase tracking-wide">{label}</h3>
                    </div>
                    <p className="text-4xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">{sub}</p>
                    <div className="w-full h-1.5 bg-gray-100 dark:bg-dark-700 rounded-full overflow-hidden">
                      <div className={cn('h-full rounded-full transition-all', barColor)} style={{ width: `${Math.min(bar, 100)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Top Performers */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Top Courses */}
              {courseAnalytics?.topCourses && courseAnalytics.topCourses.length > 0 && (
                <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Top 10 Courses by Enrollment
                  </h2>
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={courseAnalytics.topCourses} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis type="number" stroke="#9ca3af" tick={{ fill: '#9ca3af', fontSize: 12 }} />
                      <YAxis
                        type="category"
                        dataKey="title"
                        stroke="#9ca3af"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        width={150}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1f2937',
                          border: '1px solid #374151',
                          borderRadius: '8px',
                          color: '#fff'
                        }}
                      />
                      <Bar dataKey="enrollment_count" fill={COLORS.green} radius={[0, 8, 8, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Top Instructors */}
              {instructorAnalytics?.topInstructors && instructorAnalytics.topInstructors.length > 0 && (
                <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 transition-colors">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    <Users className="h-5 w-5 text-brand-blue" />
                    Top 10 Instructors by Courses
                  </h2>
                  <div className="space-y-3">
                    {instructorAnalytics.topInstructors.slice(0, 10).map((instructor, index) => (
                      <div key={instructor.instructor_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={cn(
                            'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                            index === 0 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                            index === 1 ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
                            index === 2 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          )}>
                            {index + 1}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {instructor.instructor?.full_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {instructor.courses_count} courses • {instructor.total_enrollments || 0} students
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-sm font-medium text-yellow-600 dark:text-yellow-400">
                          <Award className="w-4 h-4" />
                          {parseFloat(instructor.avg_rating || 0).toFixed(1)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </Container>
    </>
  );
}
