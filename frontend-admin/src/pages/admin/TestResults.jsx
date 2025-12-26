import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Users,
  CheckCircle,
  XCircle,
  Clock,
  BarChart3,
  Download,
  Eye,
  TrendingUp,
  Award
} from 'lucide-react';
import { adminTestsAPI } from '../../lib/api';
import { Button, Badge, Spinner, Select } from '../../components/ui';
import Container from '../../components/layout/Container';
import StatsCard from '../../components/ui/StatsCard';
import { useToast } from '../../components/ui/Toast';

export default function TestResults() {
  const navigate = useNavigate();
  const { testId } = useParams();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [test, setTest] = useState(null);
  const [results, setResults] = useState([]);
  const [stats, setStats] = useState({
    total_attempts: 0,
    completed: 0,
    in_progress: 0,
    average_score: 0,
    pass_rate: 0,
    highest_score: 0,
    lowest_score: 0
  });
  const [selectedAttempt, setSelectedAttempt] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    status: '',
    sort: 'score_desc'
  });

  useEffect(() => {
    fetchTestResults();
  }, [testId, filters]);

  const fetchTestResults = async () => {
    try {
      setLoading(true);

      // Fetch test details
      const testResponse = await adminTestsAPI.getById(testId);
      setTest(testResponse.data.data);

      // Fetch results
      const resultsResponse = await adminTestsAPI.getResults(testId, filters);
      const resultsData = resultsResponse.data.data;

      setResults(resultsData.attempts || []);
      calculateStats(resultsData.attempts || []);
    } catch (error) {
      console.error('Failed to fetch test results:', error);
      showToast('Failed to load test results', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (attempts) => {
    const completed = attempts.filter(a => a.status === 'completed');
    const scores = completed.map(a => a.score || 0);

    const average = scores.length > 0
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : 0;

    const passed = completed.filter(a => a.score >= (test?.passing_score || 70));
    const passRate = completed.length > 0 ? (passed.length / completed.length) * 100 : 0;

    setStats({
      total_attempts: attempts.length,
      completed: completed.length,
      in_progress: attempts.filter(a => a.status === 'in_progress').length,
      average_score: average,
      pass_rate: passRate,
      highest_score: scores.length > 0 ? Math.max(...scores) : 0,
      lowest_score: scores.length > 0 ? Math.min(...scores) : 0
    });
  };

  const handleViewDetails = async (attempt) => {
    try {
      const response = await adminTestsAPI.getStudentResult(attempt.id);
      setSelectedAttempt(response.data.data);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Failed to fetch attempt details:', error);
      showToast('Failed to load attempt details', 'error');
    }
  };

  const handleExportResults = () => {
    // Prepare CSV data
    const csvData = [
      ['Student', 'Email', 'Score', 'Status', 'Time Taken', 'Submitted At'],
      ...results.map(result => [
        `${result.student?.first_name} ${result.student?.last_name}`,
        result.student?.email,
        result.score || 'N/A',
        result.status,
        result.time_taken ? `${Math.floor(result.time_taken / 60)} min` : 'N/A',
        result.submitted_at ? new Date(result.submitted_at).toLocaleString() : 'N/A'
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-results-${test?.title}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    showToast('Results exported successfully', 'success');
  };

  const getStatusBadge = (status, score, passingScore) => {
    if (status === 'in_progress') {
      return <Badge color="yellow">In Progress</Badge>;
    }
    if (status === 'completed') {
      return score >= passingScore
        ? <Badge color="green">Passed</Badge>
        : <Badge color="red">Failed</Badge>;
    }
    return <Badge color="gray">{status}</Badge>;
  };

  const formatDuration = (seconds) => {
    if (!seconds) return 'N/A';
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <Container>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Container>
    );
  }

  if (!test) {
    return (
      <Container>
        <div className="text-center py-12">
          <p className="text-gray-600 dark:text-gray-400">Test not found</p>
          <Button onClick={() => navigate('/tests')} className="mt-4">
            Back to Tests
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <Container>
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="outline"
          onClick={() => navigate('/tests')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Tests
        </Button>

        <div className="bg-gradient-to-r from-purple-600 to-blue-600 text-white p-6 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">{test.title}</h1>
              <p className="text-purple-100">
                {test.description || 'Test Results and Analytics'}
              </p>
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  <span className="text-sm">{test.assigned_students_count} Students</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm">{test.question_count} Questions</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">{test.time_limit_minutes} Minutes</span>
                </div>
              </div>
            </div>
            <Button
              onClick={handleExportResults}
              variant="white"
              className="bg-white text-purple-600 hover:bg-purple-50"
            >
              <Download className="w-5 h-5 mr-2" />
              Export Results
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <StatsCard
          title="Total Attempts"
          value={stats.total_attempts}
          icon={Users}
          color="blue"
        />
        <StatsCard
          title="Average Score"
          value={`${stats.average_score.toFixed(1)}%`}
          icon={BarChart3}
          color="purple"
        />
        <StatsCard
          title="Pass Rate"
          value={`${stats.pass_rate.toFixed(0)}%`}
          icon={TrendingUp}
          color="green"
        />
        <StatsCard
          title="Highest Score"
          value={`${stats.highest_score}%`}
          icon={Award}
          color="yellow"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Completion Status
            </h3>
            <CheckCircle className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Completed</span>
              <span className="text-sm font-medium text-green-600">{stats.completed}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">In Progress</span>
              <span className="text-sm font-medium text-yellow-600">{stats.in_progress}</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{
                  width: `${stats.total_attempts > 0 ? (stats.completed / stats.total_attempts) * 100 : 0}%`
                }}
              />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Score Range
            </h3>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Highest</span>
              <span className="text-sm font-medium text-green-600">{stats.highest_score}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average</span>
              <span className="text-sm font-medium text-blue-600">{stats.average_score.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Lowest</span>
              <span className="text-sm font-medium text-red-600">{stats.lowest_score}%</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Pass/Fail Ratio
            </h3>
            <Award className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Pass Rate</span>
              <span className="text-sm font-medium text-green-600">{stats.pass_rate.toFixed(0)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Passing Score</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{test.passing_score}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-600 h-2 rounded-full"
                style={{ width: `${stats.pass_rate}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="">All Status</option>
              <option value="completed">Completed</option>
              <option value="in_progress">In Progress</option>
            </Select>
          </div>
          <div className="flex-1">
            <Select
              value={filters.sort}
              onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
            >
              <option value="score_desc">Highest Score First</option>
              <option value="score_asc">Lowest Score First</option>
              <option value="date_desc">Most Recent First</option>
              <option value="date_asc">Oldest First</option>
            </Select>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md overflow-hidden">
        {results.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No results yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Students haven't started taking this test yet
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Student
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Time Taken
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Submitted At
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {results.map((result) => (
                  <tr
                    key={result.id}
                    className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center mr-3">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {result.student?.first_name?.[0]}{result.student?.last_name?.[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {result.student?.first_name} {result.student?.last_name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {result.student?.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white mr-2">
                          {result.score || 0}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {result.correct_answers || 0}/{result.total_questions || 0}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(result.status, result.score, test.passing_score)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <Clock className="w-4 h-4 mr-1" />
                        {formatDuration(result.time_taken)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDate(result.submitted_at)}
                      </p>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(result)}
                        disabled={result.status !== 'completed'}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedAttempt && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    Attempt Details
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {selectedAttempt.student?.first_name} {selectedAttempt.student?.last_name}
                  </p>
                </div>
                <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="p-6">
              {/* Summary */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Score</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedAttempt.score}%
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Correct</p>
                  <p className="text-2xl font-bold text-green-600">
                    {selectedAttempt.correct_answers}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Incorrect</p>
                  <p className="text-2xl font-bold text-red-600">
                    {selectedAttempt.incorrect_answers}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Time</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatDuration(selectedAttempt.time_taken)}
                  </p>
                </div>
              </div>

              {/* Question Breakdown */}
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                Question Breakdown
              </h3>
              <div className="space-y-4">
                {selectedAttempt.answers?.map((answer, index) => (
                  <div
                    key={answer.id}
                    className={`border-2 rounded-lg p-4 ${
                      answer.is_correct
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        Question {index + 1}
                      </p>
                      {answer.is_correct ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600" />
                      )}
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                      {answer.question?.question_text}
                    </p>
                    <div className="space-y-2">
                      <div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">
                          Student Answer:
                        </span>
                        <span className={`ml-2 text-sm font-medium ${
                          answer.is_correct ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'
                        }`}>
                          {answer.selected_answer}
                        </span>
                      </div>
                      {!answer.is_correct && (
                        <div>
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            Correct Answer:
                          </span>
                          <span className="ml-2 text-sm font-medium text-green-700 dark:text-green-400">
                            {answer.question?.correct_answer}
                          </span>
                        </div>
                      )}
                      {answer.question?.explanation && (
                        <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                          <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">
                            Explanation:
                          </p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {answer.question.explanation}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Container>
  );
}
