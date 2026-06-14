import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle,
  XCircle,
  Award,
  Clock,
  BarChart3,
  TrendingUp,
  RefreshCw,
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { practiceTestsAPI, assignedTestsAPI } from '../lib/api';
import { Container } from '../components/layout';
import { Button, Spinner, Badge } from '../components/ui';
import { cn } from '../utils/cn';

export default function TestResults() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResults();
  }, [attemptId]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      // Try practice test first, fallback to assigned test
      let response;
      try {
        response = await practiceTestsAPI.getResults(attemptId);
      } catch {
        response = await assignedTestsAPI.getResults(attemptId);
      }

      setResults(response.data.data);
    } catch (error) {
      console.error('Failed to fetch results:', error);
      alert('Failed to load results');
      navigate('/practice-tests');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-20">
        <div className="flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading results...</p>
        </div>
      </Container>
    );
  }

  if (!results) {
    return (
      <Container className="py-20">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400 mb-4">Results not found</p>
          <Button onClick={() => navigate('/practice-tests')}>
            Back to Tests
          </Button>
        </div>
      </Container>
    );
  }

  const {
    score,
    total_questions,
    correct_answers,
    incorrect_answers,
    time_taken,
    passing_score,
    passed,
    answers,
    test,
    can_view_results,
    show_explanations
  } = results;

  const percentage = Math.round((correct_answers / total_questions) * 100);
  const isPassing = passed || (passing_score && percentage >= passing_score);

  // If student can't view results, show message
  if (can_view_results === false) {
    return (
      <Container className="py-20">
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-12 text-center max-w-2xl mx-auto">
          <AlertCircle className="w-16 h-16 text-brand-blue mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
            Test Submitted Successfully!
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Your test has been submitted. Results will be available later as configured by your instructor.
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => navigate('/my-assigned-tests')}>
              View My Tests
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </Container>
    );
  }

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <>
      {/* Header */}
      <div className={cn(
        'relative overflow-hidden',
        isPassing
          ? 'bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600'
          : 'bg-gradient-to-br from-orange-600 via-red-600 to-pink-600'
      )}>
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <button
              onClick={() => navigate('/practice-tests')}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tests
            </button>

            {/* Score Display */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-32 h-32 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                {isPassing ? (
                  <CheckCircle className="w-16 h-16 text-white" />
                ) : (
                  <XCircle className="w-16 h-16 text-white" />
                )}
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold text-white mb-2">
                {percentage}%
              </h1>
              <p className="text-xl text-white/90">
                {isPassing ? 'Congratulations! You passed!' : 'Keep practicing!'}
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {correct_answers}/{total_questions}
                </div>
                <div className="text-sm text-white/80">Correct Answers</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {percentage}%
                </div>
                <div className="text-sm text-white/80">Score</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {formatTime(time_taken)}
                </div>
                <div className="text-sm text-white/80">Time Taken</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">
                  {passing_score || 70}%
                </div>
                <div className="text-sm text-white/80">Passing Score</div>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Performance Analysis */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {correct_answers}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Correct</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-green-500 h-2 rounded-full"
                style={{ width: `${(correct_answers / total_questions) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {incorrect_answers}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">Incorrect</p>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-red-500 h-2 rounded-full"
                style={{ width: `${(incorrect_answers / total_questions) * 100}%` }}
              />
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-brand-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {percentage}%
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {isPassing ? 'Passed' : 'Not Passed'}
                </p>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={cn(
                  'h-2 rounded-full',
                  isPassing ? 'bg-green-500' : 'bg-orange-500'
                )}
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link to="/generate-practice-test">
            <Button variant="primary">
              <RefreshCw className="w-4 h-4 mr-2" />
              Take Another Test
            </Button>
          </Link>
          <Link to="/practice-tests">
            <Button variant="outline">
              <BookOpen className="w-4 h-4 mr-2" />
              All Tests
            </Button>
          </Link>
        </div>

        {/* Question Review */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
            Question Review
          </h2>

          <div className="space-y-6">
            {answers?.map((answer, index) => (
              <div
                key={answer.id}
                className={cn(
                  'border-2 rounded-lg p-6',
                  answer.is_correct
                    ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                    : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20'
                )}
              >
                {/* Question Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium">
                      Question {index + 1}
                    </span>
                    {answer.question?.difficulty && (
                      <Badge
                        color={
                          answer.question.difficulty === 'easy'
                            ? 'green'
                            : answer.question.difficulty === 'medium'
                            ? 'yellow'
                            : 'red'
                        }
                      >
                        {answer.question.difficulty}
                      </Badge>
                    )}
                  </div>
                  {answer.is_correct ? (
                    <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  )}
                </div>

                {/* Question Text */}
                <p className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  {answer.question?.question_text}
                </p>

                {/* Your Answer */}
                <div className="mb-3">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Your Answer:
                  </p>
                  <p className={cn(
                    'font-medium',
                    answer.is_correct
                      ? 'text-green-700 dark:text-green-400'
                      : 'text-red-700 dark:text-red-400'
                  )}>
                    {answer.selected_answer || '(No answer provided)'}
                  </p>
                </div>

                {/* Correct Answer */}
                {show_explanations !== false && !answer.is_correct && (
                  <div className="mb-3">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Correct Answer:
                    </p>
                    <p className="font-medium text-green-700 dark:text-green-400">
                      {answer.question?.correct_answer}
                    </p>
                  </div>
                )}

                {/* Explanation */}
                {show_explanations !== false && answer.question?.explanation && (
                  <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-1">
                      Explanation:
                    </p>
                    <p className="text-sm text-blue-800 dark:text-blue-400">
                      {answer.question.explanation}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </Container>
    </>
  );
}
