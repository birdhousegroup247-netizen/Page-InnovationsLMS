import { X, CheckCircle, AlertCircle, Tag, Clock, BookOpen, Award } from 'lucide-react';
import { Badge } from '../ui';

// Read-only modal showing every field on a question. Mirrors the
// QuestionModal layout so editing feels familiar, but no inputs —
// purely a "see what this question is" view. Used from ContributeQuestions.
export default function QuestionViewModal({ isOpen, onClose, question }) {
  if (!isOpen || !question) return null;

  const status =
    question.approval_status || (question.is_approved ? 'approved' : 'pending');
  const statusVariant =
    status === 'approved' ? 'success' : status === 'rejected' ? 'danger' : 'warning';
  const statusLabel =
    status === 'approved' ? 'Approved' : status === 'rejected' ? 'Rejected' : 'Pending Review';

  const difficultyVariant =
    question.difficulty === 'easy'
      ? 'success'
      : question.difficulty === 'medium'
      ? 'warning'
      : 'danger';

  // For multiple choice, options can be an array of strings OR
  // objects { text, is_correct }. Handle both. For true/false the
  // correct_answer is 'true' or 'false'. For fill_blank it's the
  // raw expected string.
  const options = Array.isArray(question.options) ? question.options : [];
  const isCorrectOption = (opt) => {
    if (typeof opt === 'object') return !!opt.is_correct;
    return String(opt).trim() === String(question.correct_answer).trim();
  };
  const optionText = (opt) => (typeof opt === 'object' ? opt.text : opt);

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Question details</h2>
            <button
              onClick={onClose}
              aria-label="Close"
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Status + meta chips */}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={statusVariant}>{statusLabel}</Badge>
              {question.difficulty && (
                <Badge variant={difficultyVariant}>{question.difficulty}</Badge>
              )}
              {question.question_type && (
                <Badge variant="info">{question.question_type.replace('_', ' ')}</Badge>
              )}
              {question.course?.title && (
                <Badge variant="secondary" className="gap-1">
                  <BookOpen className="w-3 h-3" />
                  {question.course.title}
                </Badge>
              )}
              {question.category?.name && (
                <Badge variant="secondary" className="gap-1">
                  <Tag className="w-3 h-3" />
                  {question.category.name}
                </Badge>
              )}
            </div>

            {/* Question text */}
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-2">
                Question
              </p>
              <p className="text-lg text-gray-900 dark:text-white whitespace-pre-wrap">
                {question.question_text}
              </p>
            </div>

            {/* Options for multiple choice */}
            {question.question_type === 'multiple_choice' && options.length > 0 && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-2">
                  Options
                </p>
                <div className="space-y-2">
                  {options.map((opt, i) => {
                    const correct = isCorrectOption(opt);
                    return (
                      <div
                        key={i}
                        className={
                          correct
                            ? 'flex items-start gap-3 p-3 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20'
                            : 'flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-dark-700'
                        }
                      >
                        <span className="text-sm font-semibold text-gray-500 dark:text-gray-400 w-6 shrink-0">
                          {String.fromCharCode(65 + i)}.
                        </span>
                        <p className="flex-1 text-sm text-gray-900 dark:text-white">
                          {optionText(opt)}
                        </p>
                        {correct && (
                          <span className="flex items-center gap-1 text-xs font-medium text-green-700 dark:text-green-400">
                            <CheckCircle className="w-4 h-4" />
                            Correct
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Correct answer for non-MCQ types */}
            {question.question_type !== 'multiple_choice' && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-2">
                  Correct Answer
                </p>
                <div className="p-3 rounded-lg border-2 border-green-500 bg-green-50 dark:bg-green-900/20 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <p className="text-sm text-gray-900 dark:text-white capitalize">
                    {question.correct_answer || '—'}
                  </p>
                </div>
              </div>
            )}

            {/* Explanation */}
            {question.explanation && (
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-text-dark-muted mb-2">
                  Explanation
                </p>
                <p className="text-sm text-gray-700 dark:text-text-dark-secondary whitespace-pre-wrap">
                  {question.explanation}
                </p>
              </div>
            )}

            {/* Marks + time */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-700 flex items-center gap-3">
                <Award className="w-5 h-5 text-brand-blue" />
                <div>
                  <p className="text-xs text-gray-500 dark:text-text-dark-muted">Marks</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {question.marks ?? 1}
                  </p>
                </div>
              </div>
              {question.time_limit_seconds ? (
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-dark-700 flex items-center gap-3">
                  <Clock className="w-5 h-5 text-brand-purple" />
                  <div>
                    <p className="text-xs text-gray-500 dark:text-text-dark-muted">Time limit</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">
                      {question.time_limit_seconds}s
                    </p>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Rejection reason — only when status === 'rejected' */}
            {status === 'rejected' && question.rejection_reason && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-red-900 dark:text-red-300">Rejection reason</p>
                  <p className="text-red-700 dark:text-red-400">{question.rejection_reason}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
