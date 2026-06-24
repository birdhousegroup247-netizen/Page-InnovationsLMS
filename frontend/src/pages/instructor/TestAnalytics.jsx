import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  TrendingUp,
  Award,
  FileText,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Eye,
} from 'lucide-react';
import { instructorAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner, Alert } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function TestAnalytics() {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState('score');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    fetchTestData();
  }, [testId]);

  const fetchTestData = async () => {
    try {
      setLoading(true);
      setError('');

      const [analyticsResponse, resultsResponse] = await Promise.all([
        instructorAPI.getTestAnalytics(testId),
        instructorAPI.getTestResults(testId),
      ]);

      setAnalytics(analyticsResponse.data.data);
      setStudentResults(resultsResponse.data.data.results || []);
    } catch (err) {
      console.error('Error fetching test data:', err);
      setError(err.response?.data?.message || 'Failed to load test analytics');
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
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 90) return 'text-green-600 dark:text-green-400';
    if (percentage >= 80) return 'text-brand-blue';
    if (percentage >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreBgColor = (percentage) => {
    if (percentage >= 90) return 'bg-green-100 dark:bg-green-900/30';
    if (percentage >= 80) return 'bg-blue-100 dark:bg-blue-900/30';
    if (percentage >= 70) return 'bg-yellow-100 dark:bg-yellow-900/30';
    return 'bg-red-100 dark:bg-red-900/30';
  };

  // Sort student results
  const sortedResults = [...studentResults].sort((a, b) => {
    let compareA, compareB;

    switch (sortBy) {
      case 'name':
        compareA = a.student_name?.toLowerCase() || '';
        compareB = b.student_name?.toLowerCase() || '';
        break;
      case 'score':
        compareA = parseFloat(a.score_percentage) || 0;
        compareB = parseFloat(b.score_percentage) || 0;
        break;
      case 'date':
        compareA = new Date(a.completed_at);
        compareB = new Date(b.completed_at);
        break;
      default:
        compareA = a;
        compareB = b;
    }

    if (sortOrder === 'asc') {
      return compareA > compareB ? 1 : -1;
    } else {
      return compareA < compareB ? 1 : -1;
    }
  });

  if (loading) {
    return (
      <Container className="py-20">
        <div className="flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-text-dark-secondary">
            Loading test analytics...
          </p>
        </div>
      </Container>
    );
  }

  if (error || !analytics) {
    return (
      <Container className="py-8">
        <Alert variant="danger">{error || 'Test not found'}</Alert>
        <Button
          onClick={() => navigate('/instructor/tests')}
          className="mt-4"
          leftIcon={<ArrowLeft className="w-4 h-4" />}
        >
          Back to Tests
        </Button>
      </Container>
    );
  }

  const { test_overview, score_distribution, question_analytics } = analytics;

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <Link
              to="/instructor/tests"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tests
            </Link>

            <div className="flex items-start gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  {test_overview?.test_title || 'Test Analytics'}
                </h1>
                <p className="text-lg text-white/90">
                  {test_overview?.course_title || 'Course'}
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
                  Total Attempts
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary">
                  {test_overview?.total_attempts || 0}
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
                  Average Score
                </p>
                <p className={cn('text-3xl font-bold', getScoreColor(test_overview?.average_score || 0))}>
                  {Math.round(test_overview?.average_score || 0)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                  Pass Rate
                </p>
                <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {Math.round(test_overview?.pass_rate || 0)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                <Award className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                  Completion Rate
                </p>
                <p className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary">
                  {Math.round(test_overview?.completion_rate || 0)}%
                </p>
              </div>
              <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Score Distribution */}
        {score_distribution && (
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark mb-8 transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-brand-blue" />
              Score Distribution
            </h2>

            <div className="space-y-4">
              {[
                { label: '90-100%', count: score_distribution['90-100'] || 0, color: 'bg-green-500' },
                { label: '80-89%', count: score_distribution['80-89'] || 0, color: 'bg-blue-500' },
                { label: '70-79%', count: score_distribution['70-79'] || 0, color: 'bg-yellow-500' },
                { label: '60-69%', count: score_distribution['60-69'] || 0, color: 'bg-orange-500' },
                { label: '0-59%', count: score_distribution['0-59'] || 0, color: 'bg-red-500' },
              ].map((range) => {
                const maxCount = Math.max(...Object.values(score_distribution));
                const percentage = maxCount > 0 ? (range.count / maxCount) * 100 : 0;

                return (
                  <div key={range.label}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700 dark:text-text-dark-secondary">
                        {range.label}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-text-dark-muted">
                        {range.count} student{range.count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="w-full h-8 bg-gray-100 dark:bg-dark-700 rounded-lg overflow-hidden">
                      <div
                        className={`h-full ${range.color} flex items-center justify-end px-3 text-white text-sm font-medium transition-all duration-500`}
                        style={{ width: `${percentage}%`, minWidth: range.count > 0 ? '40px' : '0' }}
                      >
                        {range.count > 0 && range.count}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Question Analytics */}
        {question_analytics && question_analytics.length > 0 && (
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark mb-8 transition-colors">
            <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-brand-purple" />
              Question Performance
            </h2>

            <div className="space-y-3">
              {question_analytics.map((question, idx) => (
                <div
                  key={idx}
                  className="p-4 bg-gray-50 dark:bg-dark-700 rounded-lg transition-colors"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-text-dark-primary mb-1">
                        Question {idx + 1}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-text-dark-secondary line-clamp-2">
                        {question.question_text || 'Question text'}
                      </p>
                    </div>
                    <div className="text-right ml-4">
                      <p className={cn('text-lg font-bold', getScoreColor(question.success_rate || 0))}>
                        {Math.round(question.success_rate || 0)}%
                      </p>
                      <p className="text-xs text-gray-500 dark:text-text-dark-muted">
                        success rate
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>{question.correct_count || 0} correct</span>
                    </div>
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                      <XCircle className="w-4 h-4" />
                      <span>{question.incorrect_count || 0} incorrect</span>
                    </div>
                  </div>

                  <div className="mt-3 w-full h-2 bg-gray-200 dark:bg-dark-600 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-300"
                      style={{ width: `${question.success_rate || 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Student Results */}
        <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-text-dark-primary flex items-center gap-2">
              <Users className="w-6 h-6 text-brand-blue" />
              Student Results ({sortedResults.length})
            </h2>

            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
              >
                <option value="score">Sort by: Score</option>
                <option value="name">Sort by: Name</option>
                <option value="date">Sort by: Date</option>
              </select>
              <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="px-3 py-2 text-gray-600 dark:text-text-dark-secondary hover:text-gray-900 dark:hover:text-text-dark-primary hover:bg-gray-100 dark:hover:bg-dark-700 rounded-lg transition-colors"
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>

          {sortedResults.length === 0 ? (
            <p className="text-center py-8 text-gray-500 dark:text-text-dark-muted">
              No student results yet
            </p>
          ) : (
            <div className="space-y-3">
              {sortedResults.map((result) => (
                <div
                  key={result.attempt_id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-700 rounded-lg hover:bg-gray-100 dark:hover:bg-dark-600 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="flex-shrink-0">
                      {result.student_avatar ? (
                        <img
                          src={result.student_avatar}
                          alt={result.student_name}
                          className="w-10 h-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-blue to-brand-purple flex items-center justify-center">
                          <span className="text-white font-medium">
                            {result.student_name?.charAt(0).toUpperCase() || '?'}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-text-dark-primary">
                        {result.student_name || 'Unknown Student'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-text-dark-secondary">
                        Submitted {formatDate(result.completed_at)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className={cn('px-4 py-2 rounded-lg text-center', getScoreBgColor(result.score_percentage))}>
                      <p className={cn('text-2xl font-bold', getScoreColor(result.score_percentage))}>
                        {Math.round(result.score_percentage || 0)}%
                      </p>
                      <p className="text-xs text-gray-600 dark:text-text-dark-muted">
                        {result.score || 0}/{result.total_points || 0} pts
                      </p>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Eye className="w-4 h-4" />}
                      onClick={() => navigate(`/instructor/attempts/${result.attempt_id}/details`)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </Container>
    </>
  );
}
