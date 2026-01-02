import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Mail,
  Calendar,
  BookOpen,
  Award,
  Clock,
  CheckCircle,
  PlayCircle,
  FileText,
  TrendingUp,
  BarChart3,
} from 'lucide-react';
import { instructorAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner, Alert } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function StudentProgress() {
  const { studentId, courseId } = useParams();
  const navigate = useNavigate();

  const [progressData, setProgressData] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStudentData();
  }, [studentId, courseId]);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      setError('');

      const [progressResponse, testResultsResponse] = await Promise.all([
        instructorAPI.getStudentProgress(studentId, courseId),
        instructorAPI.getStudentTestResults(studentId, { course_id: courseId }).catch(() => ({ data: { data: { attempts: [] } } }))
      ]);

      setProgressData(progressResponse.data.data);
      setTestResults(testResultsResponse.data.data.attempts || []);
    } catch (err) {
      console.error('Error fetching student data:', err);
      setError(err.response?.data?.message || 'Failed to load student progress');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getProgressColor = (percentage) => {
    const progress = parseFloat(percentage) || 0;
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-brand-blue';
    if (progress >= 20) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getGradeColor = (score) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 80) return 'text-brand-blue';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  if (loading) {
    return (
      <Container className="py-20">
        <div className="flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-text-dark-secondary">
            Loading student progress...
          </p>
        </div>
      </Container>
    );
  }

  if (error || !progressData) {
    return (
      <Container className="py-8">
        <Alert variant="danger">
          {error || 'Student progress not found'}
        </Alert>
        <Button
          onClick={() => navigate('/instructor/students')}
          className="mt-4"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Students
        </Button>
      </Container>
    );
  }

  const { student, course, enrollment, module_progress } = progressData;

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <Link
              to="/instructor/students"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Students
            </Link>

            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Student Avatar */}
              <div className="flex-shrink-0">
                {student.avatar_url ? (
                  <img
                    src={student.avatar_url}
                    alt={student.full_name}
                    className="w-24 h-24 rounded-full object-cover border-4 border-white/20"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-4 border-white/20 flex items-center justify-center">
                    <span className="text-white font-bold text-3xl">
                      {student.full_name?.charAt(0).toUpperCase() || '?'}
                    </span>
                  </div>
                )}
              </div>

              {/* Student Info */}
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  {student.full_name}
                </h1>
                <p className="text-lg text-white/90 mb-4">
                  {course.title}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-white/80">
                  <span className="flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {student.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Enrolled {formatDate(enrollment.enrolled_at)}
                  </span>
                </div>
              </div>

              {/* Progress Circle */}
              <div className="flex items-center justify-center">
                <div className="relative w-32 h-32">
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="white"
                      strokeOpacity="0.2"
                      strokeWidth="8"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="white"
                      strokeWidth="8"
                      fill="none"
                      strokeDasharray={`${2 * Math.PI * 56}`}
                      strokeDashoffset={`${2 * Math.PI * 56 * (1 - (enrollment.progress_percentage || 0) / 100)}`}
                      className="transition-all duration-1000"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-bold text-white">
                      {Math.round(enrollment.progress_percentage || 0)}%
                    </span>
                    <span className="text-xs text-white/80">Complete</span>
                  </div>
                </div>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">Completed Lessons</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">
                  {enrollment.completed_contents || 0}/{enrollment.total_contents || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-brand-blue" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">Time Spent</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">
                  {Math.round((enrollment.total_watch_time || 0) / 60)} min
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">Last Active</p>
                <p className="text-lg font-bold text-gray-900 dark:text-text-dark-primary">
                  {formatDate(enrollment.last_accessed)}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <PlayCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">Test Attempts</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-text-dark-primary">
                  {testResults.length}
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Module Progress */}
        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark mb-8 transition-colors">
          <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-brand-blue" />
            Module Progress
          </h2>

          <div className="space-y-4">
            {module_progress && module_progress.length > 0 ? (
              module_progress.map((module, idx) => (
                <div
                  key={module.module_id}
                  className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 dark:text-text-dark-primary mb-1">
                        Module {idx + 1}: {module.module_title}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
                        {module.completed_contents || 0} of {module.total_contents || 0} lessons completed
                      </p>
                    </div>
                    <span className={cn('text-lg font-bold', getProgressColor(module.progress_percentage).replace('bg-', 'text-'))}>
                      {Math.round(module.progress_percentage || 0)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${getProgressColor(module.progress_percentage)} transition-all duration-300`}
                      style={{ width: `${module.progress_percentage || 0}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 dark:text-text-dark-muted text-center py-4">
                No module progress data available
              </p>
            )}
          </div>
        </div>

        {/* Test Results */}
        {testResults.length > 0 && (
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-brand-purple" />
              Test Results
            </h2>

            <div className="space-y-3">
              {testResults.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg transition-colors"
                >
                  <div className="flex-1">
                    <h3 className="font-medium text-gray-900 dark:text-text-dark-primary mb-1">
                      {attempt.test_title}
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
                      Submitted {formatDate(attempt.submitted_at)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className={cn('text-2xl font-bold', getGradeColor(attempt.score_percentage))}>
                        {Math.round(attempt.score_percentage || 0)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-text-dark-muted">
                        {attempt.score || 0}/{attempt.total_points || 0} points
                      </p>
                    </div>
                    <div className="text-center px-3 py-1 rounded-full text-xs font-medium bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-text-dark-secondary">
                      {attempt.status === 'passed' ? (
                        <span className="text-green-600 dark:text-green-400">Passed</span>
                      ) : attempt.status === 'failed' ? (
                        <span className="text-red-600 dark:text-red-400">Failed</span>
                      ) : (
                        <span>Completed</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Completion Status */}
        {enrollment.completed_at && (
          <div className="mt-8 p-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl transition-colors">
            <div className="flex items-center gap-3">
              <Award className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-400">
                  Course Completed!
                </h3>
                <p className="text-green-700 dark:text-green-500">
                  Completed on {formatDate(enrollment.completed_at)}
                </p>
              </div>
            </div>
          </div>
        )}
      </Container>
    </>
  );
}
