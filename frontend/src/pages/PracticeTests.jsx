import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FileText, Clock, Award, Play, ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { practiceTestsAPI, assignedTestsAPI } from '../lib/api';
import { Container, EmptyState } from '../components/layout';
import { Button, Spinner, Badge } from '../components/ui';
import emptyTests from '../assets/empty-tests.svg';
import { cn } from '../utils/cn';

export default function PracticeTests() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tests, setTests] = useState([]);
  const [stats, setStats] = useState(null);
  const [assignedTests, setAssignedTests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('practice'); // practice, assigned

  useEffect(() => {
    fetchTests();
  }, []);

  const fetchTests = async () => {
    try {
      setLoading(true);
      setError('');
      // Practice tab = my completed generated-test attempts (history);
      // Assigned tab = tests instructors/admins assigned to me. The old
      // code called /api/exams/* — a namespace that never existed on the
      // backend, so this page 404'd forever.
      const [historyRes, assignedRes] = await Promise.all([
        practiceTestsAPI.getHistory(),
        assignedTestsAPI.getMyTests(),
      ]);

      setTests(historyRes.data.data.attempts || []);
      setStats(historyRes.data.data.stats || null);
      setAssignedTests(assignedRes.data.data.tests || []);
    } catch (err) {
      console.error('Error fetching tests:', err);
      setError('Failed to load tests. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // A completed generated-test attempt from history.
  const AttemptCard = ({ attempt }) => {
    const pct = Math.round(parseFloat(attempt.percentage || 0));
    const passed = pct >= 50;
    return (
      <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-elevated transition-all animate-slide-up">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className={cn('w-12 h-12 rounded-lg flex items-center justify-center',
              passed ? 'bg-green-500/10' : 'bg-red-500/10')}>
              <Award className={cn('h-6 w-6', passed ? 'text-green-500' : 'text-red-500')} />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4 mb-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary transition-colors">
                Practice Test — {attempt.question_count} questions
              </h3>
              <span className={cn('text-lg font-bold', passed ? 'text-green-500' : 'text-red-500')}>
                {pct}%
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-text-dark-muted mb-4 transition-colors">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="h-4 w-4" />
                {attempt.score}/{attempt.total_marks} marks
              </span>
              {attempt.time_taken_seconds != null && (
                <span className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4" />
                  {Math.round(attempt.time_taken_seconds / 60)} min
                </span>
              )}
              {attempt.completed_at && (
                <span>
                  {new Date(attempt.completed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              )}
              {attempt.difficulty && <Badge variant="info">{attempt.difficulty}</Badge>}
            </div>

            <Link to={`/test-results/${attempt.id}`}>
              <Button variant="outline" size="sm">View Results</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  };

  // A test an instructor/admin assigned to me.
  const AssignedCard = ({ test }) => (
    <div className="bg-white dark:bg-dark-800 rounded-xl p-6 shadow-sm dark:shadow-card hover:shadow-md dark:hover:shadow-elevated transition-all animate-slide-up">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-brand-blue/10 rounded-lg flex items-center justify-center">
            <FileText className="h-6 w-6 text-brand-blue" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary transition-colors">
              {test.test_name || test.title}
            </h3>
            <Badge variant="warning">Assigned</Badge>
          </div>

          {test.description && (
            <p className="text-sm text-gray-600 dark:text-text-dark-secondary mb-4 transition-colors line-clamp-2">
              {test.description}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-text-dark-muted mb-4 transition-colors">
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{test.time_limit_minutes || 60} min</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="h-4 w-4" />
              <span>{test.total_questions || 0} questions</span>
            </div>
            {test.passing_score && (
              <div className="flex items-center gap-1.5">
                <Award className="h-4 w-4" />
                <span>Pass: {test.passing_score}%</span>
              </div>
            )}
          </div>

          {/* Full assignment detail (attempts left, deadlines, results)
              lives on My Assigned Tests — this card is the shortcut. */}
          <Link to="/my-assigned-tests">
            <Button variant="primary" size="sm" leftIcon={<Play className="h-4 w-4" />}>
              Open in My Assigned Tests
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );

  const currentTests = activeTab === 'practice' ? tests : assignedTests;
  const tabOptions = [
    { value: 'practice', label: 'Practice Tests', count: tests.length },
    { value: 'assigned', label: 'Assigned Tests', count: assignedTests.length },
  ];

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
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  Practice Tests & Exams
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  Test your knowledge and track your progress
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabOptions.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab.value
                  ? 'bg-brand-blue text-white shadow-md'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-700 dark:text-text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-600'
              )}
            >
              {tab.label}
              <span className="ml-2 opacity-75">({tab.count})</span>
            </button>
          ))}
        </div>

        {/* Error State */}
        {!loading && error && (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
            <Button variant="outline" onClick={() => { setError(''); fetchTests(); }}>Retry</Button>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary font-medium transition-colors">
              Loading tests...
            </p>
          </div>
        )}

        {/* Practice tab: stats strip + Generate CTA */}
        {!loading && !error && activeTab === 'practice' && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            {stats && stats.totalAttempts > 0 ? (
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-text-dark-secondary">
                <span><strong className="text-gray-900 dark:text-white">{stats.totalAttempts}</strong> attempts</span>
                <span>Average <strong className="text-gray-900 dark:text-white">{Math.round(stats.averageScore)}%</strong></span>
                <span>Best <strong className="text-green-600 dark:text-green-400">{Math.round(stats.bestScore)}%</strong></span>
              </div>
            ) : <div />}
            <Link to="/generate-practice-test">
              <Button variant="primary" leftIcon={<Sparkles className="h-4 w-4" />}>
                Generate New Test
              </Button>
            </Link>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && currentTests.length === 0 && (
          <EmptyState
            image={emptyTests}
            icon={activeTab === 'practice' ? <FileText className="w-16 h-16" /> : <CheckCircle className="w-16 h-16" />}
            title={activeTab === 'practice' ? 'No practice attempts yet' : 'No assigned tests'}
            description={
              activeTab === 'practice'
                ? 'Generate a custom test from the question bank to start practicing'
                : "Your instructor hasn't assigned any tests yet"
            }
            actionLabel={activeTab === 'practice' ? 'Generate a Test' : undefined}
            onAction={activeTab === 'practice' ? () => navigate('/generate-practice-test') : undefined}
          />
        )}

        {/* Tests List */}
        {!loading && !error && currentTests.length > 0 && (
          <div className="space-y-4">
            {activeTab === 'practice'
              ? currentTests.map((attempt) => <AttemptCard key={attempt.id} attempt={attempt} />)
              : currentTests.map((test) => <AssignedCard key={test.id} test={test} />)}
          </div>
        )}
      </Container>
    </>
  );
}
