import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  HelpCircle, ArrowLeft, CheckCircle, XCircle, Edit, Trash2, Clock,
  BookOpen, Tag,
} from 'lucide-react';
import { adminQuestionsAPI } from '../../lib/api';
import { Button, Badge, Spinner, Modal } from '../../components/ui';
import Container from '../../components/layout/Container';
import { PageHeader } from '../../components/layout';
import { useToast } from '../../components/ui/Toast';
import QuestionModal from '../../components/questions/QuestionModal';

/**
 * QuestionDetail — full read view of a single question.
 *
 * Renders the question stem, the options (with the correct answer
 * highlighted), explanation, and meta (category, course, type, difficulty,
 * created-at). Edit / Approve / Delete sit at the top so admins don't have
 * to scroll to act.
 */
export default function QuestionDetail() {
  const navigate = useNavigate();
  const { questionId } = useParams();
  const { showToast } = useToast();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    fetchQuestion();
  }, [questionId]);

  const fetchQuestion = async () => {
    setLoading(true);
    try {
      const res = await adminQuestionsAPI.getById(questionId);
      setQuestion(res.data.data?.question || res.data.data);
    } catch (e) {
      showToast('Failed to load question', 'error');
      navigate('/questions');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    try {
      await adminQuestionsAPI.approve(question.id);
      showToast('Question approved', 'success');
      fetchQuestion();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve', 'error');
    }
  };

  const handleDelete = async () => {
    try {
      await adminQuestionsAPI.delete(question.id);
      showToast('Question deleted', 'success');
      navigate(-1);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    }
  };

  const typeLabel = (t) => ({ multiple_choice: 'Multiple Choice', true_false: 'True / False', fill_blank: 'Fill in the Blank' }[t] || t);
  const difficultyVariant = (d) => ({ easy: 'success', medium: 'warning', hard: 'danger' }[d?.toLowerCase()] || 'default');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!question) return null;

  // Options may live on `options` (JSON), or as flat option_a..option_d, or as
  // an `answers` array depending on import path. Normalize so the render is
  // consistent.
  const options = (() => {
    if (Array.isArray(question.options)) return question.options;
    if (question.options && typeof question.options === 'object') {
      return Object.entries(question.options).map(([k, v]) => ({ key: k, text: v }));
    }
    const flat = [];
    if (question.option_a) flat.push({ key: 'A', text: question.option_a });
    if (question.option_b) flat.push({ key: 'B', text: question.option_b });
    if (question.option_c) flat.push({ key: 'C', text: question.option_c });
    if (question.option_d) flat.push({ key: 'D', text: question.option_d });
    return flat;
  })();

  const correctMarker = question.correct_answer || question.correct_option;

  return (
    <>
      <PageHeader
        icon={HelpCircle}
        title="Question"
        subtitle={question.course?.title ? `From ${question.course.title}` : 'Question detail'}
        actions={
          <>
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              Back
            </Button>
            {!question.is_approved && (
              <Button
                onClick={handleApprove}
                variant="ghost"
                size="sm"
                leftIcon={<CheckCircle className="h-4 w-4" />}
                className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
              >
                Approve
              </Button>
            )}
            <Button
              onClick={() => setShowEditModal(true)}
              variant="ghost"
              size="sm"
              leftIcon={<Edit className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              Edit
            </Button>
            <Button
              onClick={() => setShowDeleteModal(true)}
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              Delete
            </Button>
          </>
        }
      />

      <Container className="py-8 max-w-4xl">
        {/* Meta strip */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <Badge variant="info">{typeLabel(question.question_type)}</Badge>
          {question.difficulty && (
            <Badge variant={difficultyVariant(question.difficulty)} className="capitalize">
              {question.difficulty}
            </Badge>
          )}
          <Badge variant={question.is_approved ? 'success' : 'warning'}>
            {question.is_approved ? (
              <span className="inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Approved</span>
            ) : (
              <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
            )}
          </Badge>
          {question.category?.name && (
            <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <Tag className="w-3.5 h-3.5" /> {question.category.name}
            </span>
          )}
          {question.course?.title && (
            <span className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
              <BookOpen className="w-3.5 h-3.5" /> {question.course.title}
            </span>
          )}
        </div>

        {/* Stem */}
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 mb-6">
          <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Question</h3>
          <p className="text-lg text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
            {question.question_text}
          </p>
        </div>

        {/* Options */}
        {options.length > 0 && (
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 mb-6">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-4">
              {question.question_type === 'true_false' ? 'Choices' : 'Options'}
            </h3>
            <div className="space-y-2">
              {options.map((opt, idx) => {
                const key = opt.key || String.fromCharCode(65 + idx);
                const text = opt.text ?? opt;
                const isCorrect =
                  correctMarker != null &&
                  (String(correctMarker).toUpperCase() === String(key).toUpperCase() ||
                   String(correctMarker) === String(text));
                return (
                  <div
                    key={idx}
                    className={`flex items-start gap-3 p-3 rounded-lg border ${
                      isCorrect
                        ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/20'
                        : 'border-gray-200 dark:border-border-dark bg-gray-50 dark:bg-dark-700/50'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-md flex items-center justify-center text-sm font-semibold flex-shrink-0 ${
                        isCorrect
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 dark:bg-dark-600 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {key}
                    </div>
                    <p className="text-sm text-gray-900 dark:text-white pt-0.5 flex-1">{text}</p>
                    {isCorrect && (
                      <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Correct answer for non-MCQ (e.g. fill in the blank) */}
        {options.length === 0 && correctMarker && (
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6 mb-6">
            <h3 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">Correct answer</h3>
            <p className="text-base text-gray-900 dark:text-white">{correctMarker}</p>
          </div>
        )}

        {/* Explanation */}
        {question.explanation && (
          <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-xl p-6">
            <h3 className="text-xs uppercase tracking-wider text-blue-700 dark:text-blue-300 mb-2">Explanation</h3>
            <p className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap leading-relaxed">
              {question.explanation}
            </p>
          </div>
        )}
      </Container>

      {/* Modals */}
      {showEditModal && (
        <QuestionModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          question={question}
          onSaved={() => {
            setShowEditModal(false);
            fetchQuestion();
            showToast('Question updated', 'success');
          }}
        />
      )}

      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Question"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This question will be permanently removed. This action can't be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={handleDelete}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
