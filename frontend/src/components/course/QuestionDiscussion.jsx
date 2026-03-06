import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { lessonQuestionsAPI } from '../../lib/api';
import {
  MessageCircle,
  ThumbsUp,
  Send,
  Edit2,
  Trash2,
  MoreVertical,
  Award,
  AlertCircle
} from 'lucide-react';
import Button from '../ui/Button';
import Spinner from '../ui/Spinner';
import Modal from '../ui/Modal';
import { cn } from '../../utils/cn';

export default function QuestionDiscussion({ contentId }) {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [replyText, setReplyText] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState(new Set());
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [deleteQuestionId, setDeleteQuestionId] = useState(null);

  useEffect(() => {
    fetchQuestions();
  }, [contentId]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await lessonQuestionsAPI.getLessonQuestions(contentId);
      setQuestions(response.data.data.questions || []);
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleAskQuestion = async (e) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;

    try {
      setSubmitting(true);
      setError(null);
      const response = await lessonQuestionsAPI.askQuestion(contentId, {
        question_text: newQuestion
      });

      // Add new question to the list
      setQuestions([response.data.data.question, ...questions]);
      setNewQuestion('');
      setSuccess('Question posted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post question');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (questionId) => {
    const reply = replyText[questionId];
    if (!reply?.trim()) return;

    try {
      const response = await lessonQuestionsAPI.replyToQuestion(questionId, {
        reply_text: reply
      });

      // Update the question with the new reply
      setQuestions(questions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            replies: [...(q.replies || []), response.data.data.reply]
          };
        }
        return q;
      }));

      setReplyText({ ...replyText, [questionId]: '' });
      setSuccess('Reply posted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post reply');
    }
  };

  const handleUpvoteQuestion = async (questionId) => {
    try {
      await lessonQuestionsAPI.upvoteQuestion(questionId);

      setQuestions(questions.map(q => {
        if (q.id === questionId) {
          return { ...q, upvotes: (q.upvotes || 0) + 1 };
        }
        return q;
      }));
    } catch (err) {
      console.error('Failed to upvote question:', err);
    }
  };

  const handleUpvoteReply = async (questionId, replyId) => {
    try {
      await lessonQuestionsAPI.upvoteReply(replyId);

      setQuestions(questions.map(q => {
        if (q.id === questionId) {
          return {
            ...q,
            replies: q.replies.map(r => {
              if (r.id === replyId) {
                return { ...r, upvotes: (r.upvotes || 0) + 1 };
              }
              return r;
            })
          };
        }
        return q;
      }));
    } catch (err) {
      console.error('Failed to upvote reply:', err);
    }
  };

  const handleDeleteQuestion = (questionId) => {
    setDeleteQuestionId(questionId);
  };

  const confirmDeleteQuestion = async () => {
    try {
      await lessonQuestionsAPI.deleteQuestion(deleteQuestionId);
      setQuestions(questions.filter(q => q.id !== deleteQuestionId));
      setDeleteQuestionId(null);
      setSuccess('Question deleted successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete question');
    }
  };

  const toggleReplies = (questionId) => {
    const newExpanded = new Set(expandedQuestions);
    if (newExpanded.has(questionId)) {
      newExpanded.delete(questionId);
    } else {
      newExpanded.add(questionId);
    }
    setExpandedQuestions(newExpanded);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Ask Question Form */}
      <div className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-sm dark:shadow-card transition-colors">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-brand-blue" />
          Ask a Question
        </h3>

        <form onSubmit={handleAskQuestion}>
          <textarea
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            placeholder="Have a question about this lesson? Ask away!"
            className="w-full px-4 py-3 bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border border-gray-300 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none transition-colors"
            rows={3}
            disabled={!user || submitting}
          />

          <div className="mt-3 flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-text-dark-muted">
              {!user && 'Please log in to ask questions'}
            </p>
            <Button
              type="submit"
              disabled={!user || !newQuestion.trim() || submitting}
              className="flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <Spinner size="sm" />
                  Posting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Post Question
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Questions List */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary flex items-center gap-2">
          <MessageCircle className="w-5 h-5" />
          Questions ({questions.length})
        </h3>

        {questions.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-lg p-12 text-center shadow-sm dark:shadow-card transition-colors">
            <MessageCircle className="w-16 h-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
            <p className="text-gray-600 dark:text-text-dark-secondary mb-2">
              No questions yet
            </p>
            <p className="text-sm text-gray-500 dark:text-text-dark-muted">
              Be the first to ask a question about this lesson!
            </p>
          </div>
        ) : (
          questions.map((question) => (
            <div
              key={question.id}
              className="bg-white dark:bg-dark-800 rounded-lg p-6 shadow-sm dark:shadow-card transition-colors"
            >
              {/* Question Header */}
              <div className="flex items-start gap-4">
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 rounded-full bg-brand-blue/20 flex items-center justify-center">
                    <span className="text-brand-blue font-semibold text-sm">
                      {question.student?.full_name?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Question Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                        {question.student?.full_name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-text-dark-muted">
                        {new Date(question.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>

                    {/* Actions for own questions */}
                    {user?.id === question.student_id && (
                      <button
                        onClick={() => handleDeleteQuestion(question.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <p className="text-gray-800 dark:text-text-dark-primary whitespace-pre-wrap mb-4">
                    {question.question_text}
                  </p>

                  {/* Question Actions */}
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => handleUpvoteQuestion(question.id)}
                      className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-text-dark-secondary hover:text-brand-blue transition-colors"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{question.upvotes || 0}</span>
                    </button>

                    <button
                      onClick={() => toggleReplies(question.id)}
                      className="flex items-center gap-1.5 text-sm text-gray-600 dark:text-text-dark-secondary hover:text-brand-blue transition-colors"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>{question.replies?.length || 0} {question.replies?.length === 1 ? 'Reply' : 'Replies'}</span>
                    </button>
                  </div>

                  {/* Replies Section */}
                  {expandedQuestions.has(question.id) && (
                    <div className="mt-4 space-y-4 pl-4 border-l-2 border-gray-200 dark:border-border-dark">
                      {/* Existing Replies */}
                      {question.replies?.map((reply) => (
                        <div key={reply.id} className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-dark-700 flex items-center justify-center">
                              <span className="text-gray-700 dark:text-text-dark-secondary font-medium text-xs">
                                {reply.user?.full_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="font-medium text-sm text-gray-900 dark:text-text-dark-primary">
                                {reply.user?.full_name}
                              </p>
                              {reply.is_instructor && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-brand-blue/10 text-brand-blue text-xs font-medium rounded-full">
                                  <Award className="w-3 h-3" />
                                  Instructor
                                </span>
                              )}
                              <span className="text-xs text-gray-500 dark:text-text-dark-muted">
                                {new Date(reply.created_at).toLocaleDateString()}
                              </span>
                            </div>

                            <p className="text-sm text-gray-700 dark:text-text-dark-secondary whitespace-pre-wrap">
                              {reply.reply_text}
                            </p>

                            <button
                              onClick={() => handleUpvoteReply(question.id, reply.id)}
                              className="flex items-center gap-1 text-xs text-gray-500 dark:text-text-dark-muted hover:text-brand-blue transition-colors mt-2"
                            >
                              <ThumbsUp className="w-3 h-3" />
                              <span>{reply.upvotes || 0}</span>
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Reply Form */}
                      {user && (
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            <div className="w-8 h-8 rounded-full bg-brand-blue/20 flex items-center justify-center">
                              <span className="text-brand-blue font-semibold text-xs">
                                {user?.full_name?.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>

                          <div className="flex-1">
                            <textarea
                              value={replyText[question.id] || ''}
                              onChange={(e) => setReplyText({ ...replyText, [question.id]: e.target.value })}
                              placeholder="Write a reply..."
                              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary border border-gray-300 dark:border-border-dark rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-none transition-colors"
                              rows={2}
                            />
                            <Button
                              size="sm"
                              onClick={() => handleReply(question.id)}
                              disabled={!replyText[question.id]?.trim()}
                              className="mt-2"
                            >
                              <Send className="w-3 h-3 mr-1" />
                              Reply
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        isOpen={!!deleteQuestionId}
        onClose={() => setDeleteQuestionId(null)}
        title="Delete Question"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Are you sure you want to delete this question?
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteQuestionId(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDeleteQuestion}>Delete Question</Button>
        </div>
      </Modal>
    </div>
  );
}
