import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Flag,
  Send
} from 'lucide-react';
import { practiceTestsAPI, assignedTestsAPI } from '../lib/api';
import { Container } from '../components/layout';
import { Button, Spinner } from '../components/ui';
import { cn } from '../utils/cn';

export default function TakeTest() {
  const { attemptId, testId } = useParams();
  const navigate = useNavigate();
  const [test, setTest] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const timerRef = useRef(null);

  const isPractice = !!attemptId;

  useEffect(() => {
    fetchTest();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const fetchTest = async () => {
    try {
      setLoading(true);
      let response;

      if (isPractice) {
        response = await practiceTestsAPI.getAttempt(attemptId);
      } else {
        response = await assignedTestsAPI.startAttempt(testId);
      }

      const data = response.data.data;
      setTest(data.test);
      setQuestions(data.questions || []);
      setTimeRemaining(data.time_limit_seconds || 3600);

      // Start timer
      startTimer();
    } catch (error) {
      console.error('Failed to fetch test:', error);
      alert('Failed to load test');
      navigate('/practice-tests');
    } finally {
      setLoading(false);
    }
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleSubmit(true); // Auto-submit when time runs out
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const formatTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId, answer) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const toggleFlag = (questionId) => {
    setFlagged(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const goToQuestion = (index) => {
    setCurrentQuestionIndex(index);
  };

  const goToPrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const goToNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      setShowSubmitConfirm(true);
      return;
    }

    try {
      setSubmitting(true);
      if (timerRef.current) clearInterval(timerRef.current);

      const submitData = {
        answers: Object.entries(answers).map(([questionId, answer]) => ({
          question_id: parseInt(questionId),
          selected_answer: answer
        })),
        time_taken: (test?.time_limit_seconds || 3600) - timeRemaining
      };

      let response;
      if (isPractice) {
        response = await practiceTestsAPI.submit(attemptId, submitData);
      } else {
        response = await assignedTestsAPI.submitAttempt(attemptId, submitData);
      }

      const resultId = response.data.data.attempt_id || attemptId;
      navigate(`/test-results/${resultId}`);
    } catch (error) {
      console.error('Failed to submit test:', error);
      alert('Failed to submit test. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-20">
        <div className="flex flex-col items-center justify-center">
          <Spinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading test...</p>
        </div>
      </Container>
    );
  }

  if (!test || questions.length === 0) {
    return (
      <Container className="py-20">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Test Not Found
          </h2>
          <Button onClick={() => navigate('/practice-tests')}>
            Return to Tests
          </Button>
        </div>
      </Container>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progressPercentage = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-900">
      {/* Header Bar */}
      <div className="bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10 shadow-sm">
        <Container>
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                {test.title}
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>

            {/* Timer */}
            <div className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-lg font-bold',
              timeRemaining < 300
                ? 'bg-red-100 dark:bg-red-900/20 text-red-600'
                : 'bg-blue-100 dark:bg-blue-900/20 text-brand-blue'
            )}>
              <Clock className="w-5 h-5" />
              {formatTime(timeRemaining)}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="pb-4">
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-brand-blue h-2 rounded-full transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Question Area */}
          <div className="lg:col-span-3">
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 mb-6">
              {/* Question Header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-3 py-1 bg-brand-blue text-white rounded-lg text-sm font-medium">
                      Question {currentQuestionIndex + 1}
                    </span>
                    {currentQuestion.difficulty && (
                      <span className={cn(
                        'px-3 py-1 rounded-lg text-sm font-medium',
                        currentQuestion.difficulty === 'easy' && 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
                        currentQuestion.difficulty === 'medium' && 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
                        currentQuestion.difficulty === 'hard' && 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                      )}>
                        {currentQuestion.difficulty}
                      </span>
                    )}
                    {currentQuestion.marks && (
                      <span className="px-3 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 rounded-lg text-sm font-medium">
                        {currentQuestion.marks} {currentQuestion.marks === 1 ? 'mark' : 'marks'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {currentQuestion.question_text}
                  </h2>
                </div>

                {/* Flag Button */}
                <button
                  onClick={() => toggleFlag(currentQuestion.id)}
                  className={cn(
                    'p-2 rounded-lg transition-colors',
                    flagged.has(currentQuestion.id)
                      ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600'
                      : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  )}
                >
                  <Flag className={cn(
                    'w-5 h-5',
                    flagged.has(currentQuestion.id) && 'fill-current'
                  )} />
                </button>
              </div>

              {/* Answer Options */}
              <div className="space-y-3">
                {currentQuestion.question_type === 'multiple_choice' && (
                  <>
                    {currentQuestion.options?.map((option, index) => (
                      <label
                        key={index}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                          answers[currentQuestion.id] === option
                            ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        )}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          checked={answers[currentQuestion.id] === option}
                          onChange={() => handleAnswerChange(currentQuestion.id, option)}
                          className="mt-1 w-4 h-4 text-brand-blue focus:ring-2 focus:ring-brand-blue"
                        />
                        <span className="text-gray-900 dark:text-white">
                          {String.fromCharCode(65 + index)}. {option}
                        </span>
                      </label>
                    ))}
                  </>
                )}

                {currentQuestion.question_type === 'true_false' && (
                  <>
                    {['True', 'False'].map((option) => (
                      <label
                        key={option}
                        className={cn(
                          'flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all',
                          answers[currentQuestion.id] === option
                            ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                        )}
                      >
                        <input
                          type="radio"
                          name={`question-${currentQuestion.id}`}
                          checked={answers[currentQuestion.id] === option}
                          onChange={() => handleAnswerChange(currentQuestion.id, option)}
                          className="mt-1 w-4 h-4 text-brand-blue focus:ring-2 focus:ring-brand-blue"
                        />
                        <span className="text-gray-900 dark:text-white">{option}</span>
                      </label>
                    ))}
                  </>
                )}

                {currentQuestion.question_type === 'fill_blank' && (
                  <input
                    type="text"
                    value={answers[currentQuestion.id] || ''}
                    onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full px-4 py-3 border-2 border-gray-200 dark:border-gray-700 rounded-lg focus:border-brand-blue focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
                  />
                )}
              </div>
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <Button
                onClick={goToPrevious}
                disabled={currentQuestionIndex === 0}
                variant="outline"
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <Button
                onClick={() => setShowSubmitConfirm(true)}
                variant="primary"
              >
                <Send className="w-4 h-4 mr-2" />
                Submit Test
              </Button>

              <Button
                onClick={goToNext}
                disabled={currentQuestionIndex === questions.length - 1}
                variant="outline"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Sidebar - Question Navigator */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 sticky top-24">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                Questions
              </h3>
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => goToQuestion(index)}
                    className={cn(
                      'w-full aspect-square rounded-lg text-sm font-medium transition-all relative',
                      index === currentQuestionIndex &&
                        'ring-2 ring-brand-blue ring-offset-2 dark:ring-offset-dark-800',
                      answers[q.id]
                        ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                        : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                    )}
                  >
                    {index + 1}
                    {flagged.has(q.id) && (
                      <Flag className="w-3 h-3 absolute top-0.5 right-0.5 fill-yellow-500 text-yellow-500" />
                    )}
                  </button>
                ))}
              </div>

              {/* Legend */}
              <div className="mt-6 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900/20 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-gray-100 dark:bg-dark-700 rounded" />
                  <span className="text-gray-600 dark:text-gray-400">Unanswered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="w-4 h-4 fill-yellow-500 text-yellow-500" />
                  <span className="text-gray-600 dark:text-gray-400">Flagged</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {/* Submit Confirmation Modal */}
      {showSubmitConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Submit Test?
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              You have answered {answeredCount} out of {questions.length} questions.
              {answeredCount < questions.length && (
                <span className="block mt-2 text-yellow-600 dark:text-yellow-400 font-medium">
                  Warning: {questions.length - answeredCount} question(s) unanswered!
                </span>
              )}
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setShowSubmitConfirm(false)}
                className="flex-1"
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleSubmit(true)}
                className="flex-1"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Submitting...
                  </>
                ) : (
                  'Submit Test'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
