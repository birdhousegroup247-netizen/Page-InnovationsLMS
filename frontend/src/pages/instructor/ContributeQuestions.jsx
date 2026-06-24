import { useState, useEffect } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  Edit,
  Filter,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
} from 'lucide-react';
import { questionsAPI, categoriesAPI, coursesAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner, Tooltip } from '../../components/ui';
import QuestionModal from '../../components/questions/QuestionModal';
import QuestionViewModal from '../../components/questions/QuestionViewModal';

export default function ContributeQuestions() {
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);

  useEffect(() => {
    fetchQuestions();
    fetchCourses();
    fetchCategories();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await questionsAPI.getMyContributions();
      setQuestions(response.data.data.questions || []);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.getAll();
      setCourses(response.data.data?.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(response.data.data.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  // Normalize status: prefer the canonical approval_status enum
  // (pending | approved | rejected). Fall back to is_approved for
  // any older rows that didn't get the field populated.
  const getStatus = (q) =>
    q.approval_status || (q.is_approved ? 'approved' : 'pending');

  const filteredQuestions = questions.filter((q) => {
    if (statusFilter !== 'all' && getStatus(q) !== statusFilter) return false;
    return q.question_text.toLowerCase().includes(search.toLowerCase());
  });

  const stats = {
    total: questions.length,
    approved: questions.filter((q) => getStatus(q) === 'approved').length,
    pending: questions.filter((q) => getStatus(q) === 'pending').length,
    rejected: questions.filter((q) => getStatus(q) === 'rejected').length,
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                    <HelpCircle className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white">
                      Contribute Questions
                    </h1>
                    <p className="text-lg text-white/90 mt-1">
                      Add questions to the question bank (pending admin approval)
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setSelectedQuestion(null);
                  setShowModal(true);
                }}
                variant="outline"
                leftIcon={<Plus className="h-4 w-4" />}
                className="bg-white/10 backdrop-blur-md text-white border-white/20 hover:bg-white/20 animate-scale-in"
              >
                Add Question
              </Button>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-brand-blue flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900 dark:text-blue-300 font-medium mb-1">
                Questions Require Admin Approval
              </p>
              <p className="text-sm text-blue-800 dark:text-blue-400">
                All questions you contribute will be reviewed by an administrator before they can be used in tests.
                This ensures quality and accuracy across the question bank.
              </p>
            </div>
          </div>
        </div>

        {/* Stats — Total / Approved / Pending / Rejected */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <HelpCircle className="w-5 h-5 text-brand-blue" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Total Contributed</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.approved}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Approved</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Pending Review</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-5">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.rejected}</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Rejected</p>
              </div>
            </div>
          </div>
        </div>

        {/* Search + Status Filter */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-4 mb-6 flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your questions..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
            />
          </div>
          <div className="md:w-56 flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400 shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white text-sm"
            >
              <option value="all">All Status</option>
              <option value="pending">Pending Review</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>

        {/* Questions List */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading questions...</p>
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-12 text-center">
            <HelpCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              {search ? 'No questions found' : 'No questions yet'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {search
                ? 'Try a different search term'
                : 'Start contributing questions to the question bank'}
            </p>
            {!search && (
              <Button onClick={() => setShowModal(true)}>
                <Plus className="w-5 h-5 mr-2" />
                Add Your First Question
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredQuestions.map((question) => {
              const status = getStatus(question);
              const editLocked = status === 'approved';
              // Modern status chip with a dot — cleaner than the
              // old pill stack, and still readable at a glance.
              const statusDotClass =
                status === 'approved'
                  ? 'bg-green-500'
                  : status === 'rejected'
                  ? 'bg-red-500'
                  : 'bg-amber-500';
              const statusTextClass =
                status === 'approved'
                  ? 'text-green-700 dark:text-green-400'
                  : status === 'rejected'
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-amber-700 dark:text-amber-400';
              const statusBgClass =
                status === 'approved'
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200/60 dark:border-green-800/60'
                  : status === 'rejected'
                  ? 'bg-red-50 dark:bg-red-900/20 border-red-200/60 dark:border-red-800/60'
                  : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200/60 dark:border-amber-800/60';
              const statusLabel =
                status === 'approved'
                  ? 'Approved'
                  : status === 'rejected'
                  ? 'Rejected'
                  : 'Pending';

              return (
                <div
                  key={question.id}
                  onClick={() => {
                    setSelectedQuestion(question);
                    setShowViewModal(true);
                  }}
                  className="group relative bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-5 cursor-pointer transition-all hover:border-brand-blue/50 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      setSelectedQuestion(question);
                      setShowViewModal(true);
                    }
                  }}
                >
                  {/* Status pill (top) */}
                  <div className="flex items-center justify-between mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusBgClass} ${statusTextClass}`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                      {statusLabel}
                    </span>
                    {/* Action buttons — only visible on hover/focus on
                        desktop; always visible on touch screens. */}
                    <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 transition-opacity">
                      <Tooltip content="View details">
                        <button
                          type="button"
                          aria-label="View details"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuestion(question);
                            setShowViewModal(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      </Tooltip>
                      <Tooltip content={editLocked ? 'Approved questions can’t be edited' : 'Edit question'}>
                        <button
                          type="button"
                          aria-label={editLocked ? 'Approved questions can’t be edited' : 'Edit question'}
                          disabled={editLocked}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedQuestion(question);
                            setShowModal(true);
                          }}
                          className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-dark-700 hover:text-gray-900 dark:hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </Tooltip>
                    </div>
                  </div>

                  {/* Question text — the prominent thing */}
                  <p className="text-base font-medium text-gray-900 dark:text-white line-clamp-3 leading-snug mb-3">
                    {question.question_text}
                  </p>

                  {/* Minimal meta footer: course + marks */}
                  <div className="flex items-center justify-between text-xs text-gray-500 dark:text-text-dark-muted">
                    <span className="truncate">
                      {question.course?.title || 'No course'}
                    </span>
                    <span className="shrink-0 ml-3">
                      {question.marks ?? 1} mark{(question.marks ?? 1) !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>

      {/* Edit/Create Modal */}
      {showModal && (
        <QuestionModal
          isOpen={showModal}
          onClose={() => {
            setShowModal(false);
            setSelectedQuestion(null);
          }}
          question={selectedQuestion}
          onSuccess={() => {
            fetchQuestions();
            setShowModal(false);
            setSelectedQuestion(null);
          }}
          courses={courses}
          categories={categories}
        />
      )}

      {/* Read-only details modal. onEdit lets the user jump straight
          to the editor without closing + reopening — we close the
          view modal and open QuestionModal with the same row. */}
      {showViewModal && (
        <QuestionViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedQuestion(null);
          }}
          question={selectedQuestion}
          onEdit={(q) => {
            setShowViewModal(false);
            setSelectedQuestion(q);
            setShowModal(true);
          }}
        />
      )}
    </>
  );
}
