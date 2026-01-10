import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Award,
  BookOpen,
  BarChart3,
  Clock,
  Eye,
  CheckCircle,
  PlayCircle,
} from 'lucide-react';
import { instructorAPI, coursesAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner, Alert } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function CourseAnalytics() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const [course, setCourse] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30'); // 7, 30, 90 days

  useEffect(() => {
    fetchCourseData();
  }, [courseId]);

  const fetchCourseData = async () => {
    try {
      setLoading(true);
      setError('');

      const [courseResponse, analyticsResponse] = await Promise.all([
        coursesAPI.getById(courseId),
        instructorAPI.getCourseAnalytics(courseId),
      ]);

      setCourse(courseResponse.data.data.course);
      setAnalytics(analyticsResponse.data.data);
    } catch (err) {
      console.error('Error fetching course data:', err);
      setError(err.response?.data?.message || 'Failed to load course analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <Container className="py-20">
        <div className="flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-text-dark-secondary">
            Loading course analytics...
          </p>
        </div>
      </Container>
    );
  }

  if (error || !analytics) {
    return (
      <Container className="py-8">
        <Alert variant="danger">{error || 'Course not found'}</Alert>
        <Button
          onClick={() => navigate('/instructor/dashboard')}
          className="mt-4"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  const {
    course_overview,
    enrollment_trends,
    progress_distribution,
    content_engagement,
    test_performance,
  } = analytics;

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            </Link>

            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  Course Analytics
                </h1>
                <p className="text-lg text-white/90">
                  {course?.title || 'Course'}
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Overview Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                  Total Enrollments
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary">
                  {course_overview?.total_enrollments || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-blue" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                  Active Students
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {course_overview?.active_students || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                  Avg Progress
                </p>
                <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                  {Math.round(course_overview?.average_progress || 0)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                  Completion Rate
                </p>
                <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                  {Math.round(course_overview?.completion_rate || 0)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Progress Distribution */}
        {progress_distribution && (
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark mb-8 transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-brand-blue" />
              Student Progress Distribution
            </h2>

            <div className="space-y-4">
              {[
                { label: '76-100% Complete', range: '76-100', color: 'bg-green-500' },
                { label: '51-75% Complete', range: '51-75', color: 'bg-blue-500' },
                { label: '26-50% Complete', range: '26-50', color: 'bg-yellow-500' },
                { label: '0-25% Complete', range: '0-25', color: 'bg-red-500' },
              ].map((segment) => {
                const count = progress_distribution[segment.range] || 0;
                const total = course_overview?.total_enrollments || 1;
                const percentage = (count / total) * 100;

                return (
                  <div key={segment.range}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-text-dark-secondary">
                        {segment.label}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-text-dark-muted">
                        {count} student{count !== 1 ? 's' : ''} ({Math.round(percentage)}%)
                      </span>
                    </div>
                    <div className="w-full h-8 bg-gray-100 dark:bg-dark-700 rounded-lg overflow-hidden">
                      <div
                        className={`h-full ${segment.color} flex items-center justify-end px-3 text-white text-sm font-medium transition-all duration-500`}
                        style={{ width: `${percentage}%`, minWidth: count > 0 ? '40px' : '0' }}
                      >
                        {count > 0 && count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Content Engagement */}
        {content_engagement && content_engagement.length > 0 && (
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark mb-8 transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-brand-purple" />
              Content Engagement
            </h2>

            <div className="space-y-3">
              {content_engagement.slice(0, 10).map((content, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-text-dark-primary mb-1">
                        {content.title || `Content ${idx + 1}`}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
                        {content.content_type || 'Lesson'}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-brand-blue" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                          {content.views || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-text-dark-muted">Views</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                          {content.completions || 0}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-text-dark-muted">
                          Completions
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <div>
                        <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                          {Math.round((content.avg_time_spent || 0) / 60)}m
                        </p>
                        <p className="text-xs text-gray-500 dark:text-text-dark-muted">
                          Avg Time
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Completion Rate */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-gray-600 dark:text-text-dark-secondary">
                        Completion Rate
                      </span>
                      <span className="text-xs font-medium text-gray-900 dark:text-text-dark-primary">
                        {content.views > 0
                          ? Math.round((content.completions / content.views) * 100)
                          : 0}
                        %
                      </span>
                    </div>
                    <div className="w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-blue transition-all duration-300"
                        style={{
                          width: `${content.views > 0 ? (content.completions / content.views) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Test Performance */}
        {test_performance && (
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
              <Award className="w-6 h-6 text-brand-blue" />
              Test Performance
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center p-6 bg-gray-50 dark:bg-dark-700 rounded-lg transition-colors">
                <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-2">
                  Average Score
                </p>
                <p className="text-4xl font-bold text-brand-blue">
                  {Math.round(test_performance.avg_test_score || 0)}%
                </p>
              </div>

              <div className="text-center p-6 bg-gray-50 dark:bg-dark-700 rounded-lg transition-colors">
                <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-2">
                  Pass Rate
                </p>
                <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(test_performance.pass_rate || 0)}%
                </p>
              </div>

              <div className="text-center p-6 bg-gray-50 dark:bg-dark-700 rounded-lg transition-colors">
                <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-2">
                  Total Attempts
                </p>
                <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                  {test_performance.total_attempts || 0}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="mt-8 flex flex-wrap gap-4">
          <Button
            onClick={() => navigate(`/instructor/courses/${courseId}/students`)}
            leftIcon={<Users className="w-4 h-4" />}
          >
            View Students
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate(`/instructor/courses/${courseId}/edit`)}
          >
            Edit Course
          </Button>
        </div>
      </Container>
    </>
  );
}
