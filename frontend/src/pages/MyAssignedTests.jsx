import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle,
  Play,
  Eye,
  Calendar,
  User,
  TrendingUp,
  XCircle
} from 'lucide-react';
import { assignedTestsAPI } from '../lib/api';
import { Container } from '../components/layout';
import { Button, Spinner, Badge } from '../components/ui';
import { cn } from '../utils/cn';
import { useToast } from '../components/ui/Toast';

export default function MyAssignedTests() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [tests, setTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startingTest, setStartingTest] = useState(null); // Track which test is being started
  const [filter, setFilter] = useState('all'); // all, not_started, in_progress, completed

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const response = await assignedTestsAPI.getMyTests();
      setTests(response.data.data.tests || []);
    } catch (error) {
      console.error('Failed to fetch assigned tests:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTestStatus = (test) => {
    if (!test.attempts || test.attempts.length === 0) {
      return 'not_started';
    }

    const lastAttempt = test.attempts[test.attempts.length - 1];
    if (lastAttempt.status === 'completed') {
      return 'completed';
    }

    return 'in_progress';
  };

  const filteredTests = tests.filter(test => {
    if (filter === 'all') return true;
    return getTestStatus(test) === filter;
  });

  const stats = {
    total: tests.length,
    notStarted: tests.filter(t => getTestStatus(t) === 'not_started').length,
    inProgress: tests.filter(t => getTestStatus(t) === 'in_progress').length,
    completed: tests.filter(t => getTestStatus(t) === 'completed').length
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date();
  };

  const isDueSoon = (dueDate) => {
    if (!dueDate) return false;
    const threeDaysFromNow = new Date();
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
    const due = new Date(dueDate);
    return due <= threeDaysFromNow && due > new Date();
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No due date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (test) => {
    const status = getTestStatus(test);

    if (status === 'completed') {
      return <Badge color="green">Completed</Badge>;
    } else if (status === 'in_progress') {
      return <Badge color="yellow">In Progress</Badge>;
    } else if (isOverdue(test.due_date)) {
      return <Badge color="red">Overdue</Badge>;
    } else if (isDueSoon(test.due_date)) {
      return <Badge color="orange">Due Soon</Badge>;
    } else {
      return <Badge color="blue">Not Started</Badge>;
    }
  };

  const handleStartTest = async (test) => {
    if (startingTest) return; // Prevent multiple simultaneous starts

    try {
      setStartingTest(test.id);
      const status = getTestStatus(test);

      if (status === 'in_progress') {
        // Continue existing attempt
        const lastAttempt = test.attempts[test.attempts.length - 1];
        navigate(`/assigned-tests/${test.id}/take?attemptId=${lastAttempt.id}`);
      } else {
        // Start new attempt
        const response = await assignedTestsAPI.startAttempt(test.id);
        const attemptId = response.data.data.attempt_id;
        navigate(`/assigned-tests/${test.id}/take?attemptId=${attemptId}`);
      }
    } catch (error) {
      console.error('Failed to start test:', error);
      showToast(error.response?.data?.message || 'Failed to start test', 'error');
      setStartingTest(null); // Reset loading state on error
    }
  };

  const handleViewResults = (test) => {
    const lastAttempt = test.attempts[test.attempts.length - 1];
    navigate(`/test-results/${lastAttempt.id}`);
  };

  const canTakeTest = (test) => {
    const status = getTestStatus(test);
    const attemptCount = test.attempts?.length || 0;
    const maxAttempts = test.max_attempts || 1;

    // Can take if not started or in progress
    if (status === 'not_started' || status === 'in_progress') {
      return true;
    }

    // Can retake if not reached max attempts
    if (status === 'completed' && attemptCount < maxAttempts) {
      return true;
    }

    return false;
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FileText className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                  My Assigned Tests
                </h1>
                <p className="text-lg text-white/90 mt-1">
                  Tests assigned to you by instructors and administrators
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Total Enrolled</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">In Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
              </div>
              <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">Not Started</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.notStarted}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-500/10 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({stats.total})
            </Button>
            <Button
              variant={filter === 'not_started' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('not_started')}
            >
              Not Started ({stats.notStarted})
            </Button>
            <Button
              variant={filter === 'in_progress' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('in_progress')}
            >
              In Progress ({stats.inProgress})
            </Button>
            <Button
              variant={filter === 'completed' ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter('completed')}
            >
              Completed ({stats.completed})
            </Button>
          </div>
        </div>

        {/* Tests List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading tests...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-12 text-center">
            <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {filter === 'all' ? 'No assigned tests yet' : `No ${filter.replace('_', ' ')} tests`}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {filter === 'all'
                ? 'Tests assigned to you will appear here'
                : 'Try selecting a different filter'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTests.map((test) => {
              const status = getTestStatus(test);
              const attemptCount = test.attempts?.length || 0;
              const maxAttempts = test.max_attempts || 1;
              const lastAttempt = test.attempts?.[test.attempts.length - 1];
              const overdue = isOverdue(test.due_date);
              const dueSoon = isDueSoon(test.due_date);

              return (
                <div
                  key={test.id}
                  className={cn(
                    'bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 hover:shadow-md transition-shadow',
                    overdue && status !== 'completed' && 'border-2 border-red-500'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Title and Status */}
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {test.title}
                        </h3>
                        {getStatusBadge(test)}
                        {overdue && status !== 'completed' && (
                          <Badge color="red">
                            <AlertCircle className="w-3 h-3 mr-1" />
                            Overdue
                          </Badge>
                        )}
                        {dueSoon && status !== 'completed' && (
                          <Badge color="orange">
                            <Clock className="w-3 h-3 mr-1" />
                            Due Soon
                          </Badge>
                        )}
                      </div>

                      {/* Description */}
                      {test.description && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 line-clamp-2">
                          {test.description}
                        </p>
                      )}

                      {/* Meta Info */}
                      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4" />
                          <span>{test.question_count || 0} questions</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" />
                          <span>{test.time_limit_seconds ? `${Math.floor(test.time_limit_seconds / 60)} min` : 'No limit'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-4 h-4" />
                          <span className={cn(overdue && 'text-red-600 dark:text-red-400 font-medium')}>
                            Due: {formatDate(test.due_date)}
                          </span>
                        </div>
                        {test.assigned_by && (
                          <div className="flex items-center gap-1.5">
                            <User className="w-4 h-4" />
                            <span>By: {test.assigned_by.name}</span>
                          </div>
                        )}
                      </div>

                      {/* Attempts Info */}
                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1.5 text-gray-600 dark:text-gray-400">
                          <TrendingUp className="w-4 h-4" />
                          <span>Attempts: {attemptCount} / {maxAttempts === 999 ? '∞' : maxAttempts}</span>
                        </div>
                        {status === 'completed' && lastAttempt?.score !== undefined && test.show_results_immediately && (
                          <div className="flex items-center gap-1.5">
                            {lastAttempt.passed ? (
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-600" />
                            )}
                            <span className={cn(
                              'font-medium',
                              lastAttempt.passed
                                ? 'text-green-600 dark:text-green-400'
                                : 'text-red-600 dark:text-red-400'
                            )}>
                              Score: {lastAttempt.score}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2 ml-4">
                      {canTakeTest(test) ? (
                        <Button
                          onClick={() => handleStartTest(test)}
                          disabled={(overdue && status === 'not_started') || startingTest === test.id}
                        >
                          {startingTest === test.id ? (
                            <>
                              <Spinner className="w-4 h-4 mr-2" />
                              Starting...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4 mr-2" />
                              {status === 'in_progress' ? 'Continue' : status === 'completed' ? 'Retake' : 'Start Test'}
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button variant="outline" disabled>
                          Max Attempts Reached
                        </Button>
                      )}

                      {status === 'completed' && test.show_results_immediately && (
                        <Button
                          variant="outline"
                          onClick={() => handleViewResults(test)}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Results
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>
    </>
  );
}
