import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  FileQuestion,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';
import { instructorAPI } from '../../lib/api';
import { Container, EmptyState } from '../../components/layout';
import { Button, Spinner, Alert, Badge } from '../../components/ui';
import { cn } from '../../utils/cn';

export default function MyQuestions() {
  const navigate = useNavigate();

  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, pending, approved, rejected
  const [currentPage, setCurrentPage] = useState(1);
  const questionsPerPage = 10;

  useEffect(() => {
    fetchQuestions();
  }, [statusFilter]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');

      const params = {};
      if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      const [questionsResponse, statsResponse] = await Promise.all([
        instructorAPI.getMyQuestions(params),
        instructorAPI.getQuestionStats().catch(() => ({ data: { data: {} } })),
      ]);

      setQuestions(questionsResponse.data.data.questions || []);
      setStats(statsResponse.data.data);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(err.response?.data?.message || 'Failed to load questions');
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
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: {
        variant: 'warning',
        icon: Clock,
        label: 'Pending Review',
      },
      approved: {
        variant: 'success',
        icon: CheckCircle,
        label: 'Approved',
      },
      rejected: {
        variant: 'danger',
        icon: XCircle,
        label: 'Rejected',
      },
    };

    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.label}
      </Badge>
    );
  };

  // Filter questions by search query
  const filteredQuestions = questions.filter((question) => {
    const questionText = question.question_text?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    return questionText.includes(query);
  });

  // Pagination
  const indexOfLastQuestion = currentPage * questionsPerPage;
  const indexOfFirstQuestion = indexOfLastQuestion - questionsPerPage;
  const currentQuestions = filteredQuestions.slice(indexOfFirstQuestion, indexOfLastQuestion);
  const totalPages = Math.ceil(filteredQuestions.length / questionsPerPage);

  return (
    <>
      {/* Page Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <Link
              to="/instructor/dashboard"
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>

            <div className="flex items-start gap-4 mb-3">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center flex-shrink-0">
                <FileQuestion className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl sm:text-4xl font-bold text-white mb-2">
                  My Questions
                </h1>
                <p className="text-lg text-white/90">
                  Track the approval status of your submitted questions
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {loading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-600 dark:text-text-dark-secondary">
              Loading questions...
            </p>
          </div>
        )}

        {!loading && (
          <>
            {error && (
              <div className="mb-6">
                <Alert variant="danger" onClose={() => setError('')}>
                  {error}
                </Alert>
              </div>
            )}

            {/* Stats Grid */}
            {stats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                        Total Questions
                      </p>
                      <p className="text-3xl font-bold text-gray-900 dark:text-text-dark-primary">
                        {stats.total_questions || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-brand-blue/10 flex items-center justify-center">
                      <FileQuestion className="w-6 h-6 text-brand-blue" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                        Approved
                      </p>
                      <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                        {stats.approved_questions || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                        Pending
                      </p>
                      <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">
                        {stats.pending_questions || 0}
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                      <Clock className="w-6 h-6 text-yellow-500" />
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-500 dark:text-text-dark-muted text-sm mb-1">
                        Approval Rate
                      </p>
                      <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                        {Math.round(stats.approval_rate || 0)}%
                      </p>
                    </div>
                    <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-purple-500" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filters */}
            <div className="bg-white dark:bg-dark-800 rounded-xl p-4 border border-gray-200 dark:border-border-dark mb-6 transition-colors">
              <div className="flex flex-col md:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 dark:text-text-dark-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search questions..."
                    className="w-full pl-10 px-4 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary placeholder-gray-400 dark:placeholder-text-dark-muted focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                  />
                </div>

                {/* Status Filter */}
                <div className="md:w-64 flex items-center gap-2">
                  <Filter className="w-5 h-5 text-gray-400 dark:text-text-dark-muted" />
                  <select
                    value={statusFilter}
                    onChange={(e) => {
                      setStatusFilter(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-border-dark rounded-lg bg-white dark:bg-dark-700 text-gray-900 dark:text-text-dark-primary focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
                  >
                    <option value="all">All Status</option>
                    <option value="pending">Pending</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Questions List */}
            {currentQuestions.length === 0 ? (
              <EmptyState
                icon={<FileQuestion className="w-16 h-16" />}
                title={searchQuery || statusFilter !== 'all' ? 'No questions found' : 'No questions yet'}
                description={
                  searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters or search query.'
                    : 'Start contributing questions to build the question bank.'
                }
                action={
                  <Button
                    onClick={() => navigate('/instructor/contribute-questions')}
                    leftIcon={<FileQuestion className="w-4 h-4" />}
                  >
                    Contribute Questions
                  </Button>
                }
              />
            ) : (
              <>
                <div className="space-y-4 mb-6">
                  {currentQuestions.map((question) => (
                    <div
                      key={question.id}
                      className="bg-white dark:bg-dark-800 rounded-xl p-6 border border-gray-200 dark:border-border-dark hover:border-brand-blue/50 dark:hover:border-brand-blue/50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-4 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {getStatusBadge(question.approval_status)}
                            <span className="text-sm text-gray-500 dark:text-text-dark-muted">
                              {question.category_name || 'Uncategorized'}
                            </span>
                          </div>
                          <h3 className="text-lg font-medium text-gray-900 dark:text-text-dark-primary mb-2">
                            {question.question_text}
                          </h3>
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-text-dark-muted">
                            <span>Difficulty: {question.difficulty || 'Medium'}</span>
                            <span>Type: {question.question_type || 'Multiple Choice'}</span>
                            <span>Submitted: {formatDate(question.created_at)}</span>
                            {question.used_in_tests > 0 && (
                              <span className="text-brand-blue font-medium">
                                Used in {question.used_in_tests} test{question.used_in_tests > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Rejection Reason */}
                      {question.approval_status === 'rejected' && question.rejection_reason && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4 transition-colors">
                          <div className="flex items-start gap-2">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-red-900 dark:text-red-400 mb-1">
                                Rejection Reason
                              </p>
                              <p className="text-sm text-red-700 dark:text-red-500">
                                {question.rejection_reason}
                              </p>
                              {question.reviewed_at && (
                                <p className="text-xs text-red-600 dark:text-red-500 mt-1">
                                  Reviewed on {formatDate(question.reviewed_at)}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Approval Info */}
                      {question.approval_status === 'approved' && question.reviewed_at && (
                        <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                          <CheckCircle className="w-4 h-4" />
                          <span>Approved on {formatDate(question.reviewed_at)}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>

                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            'w-10 h-10 rounded-lg font-medium transition-colors',
                            page === currentPage
                              ? 'bg-brand-blue text-white'
                              : 'text-gray-700 dark:text-text-dark-secondary hover:bg-gray-100 dark:hover:bg-dark-700'
                          )}
                        >
                          {page}
                        </button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </Button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </Container>
    </>
  );
}
