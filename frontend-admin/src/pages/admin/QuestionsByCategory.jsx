import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  HelpCircle, ArrowLeft, Plus, Search, Filter, CheckCircle, Clock,
  Upload, Trash2,
} from 'lucide-react';
import { adminQuestionsAPI, categoriesAPI } from '../../lib/api';
import { Button, Input, Select, Badge, Spinner, Modal } from '../../components/ui';
import Container from '../../components/layout/Container';
import { EmptyState, PageHeader } from '../../components/layout';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import emptyQuestions from '../../assets/empty-questions.svg';

/**
 * QuestionsByCategory — clean question list inside one category.
 *
 * Reached from /questions by clicking a category tile. Each question row
 * is itself a button that opens the question detail page (/questions/:id).
 * The chevron / edit-trash sub-actions stay separate so a curious click
 * never drops the admin into edit mode by mistake.
 */
export default function QuestionsByCategory() {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { showToast } = useToast();

  const isUncategorized = categoryId === 'uncategorized';

  const [category, setCategory] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    search: '',
    question_type: '',
    difficulty: '',
    is_approved: '',
  });
  const [searchDebounced, setSearchDebounced] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── Initial / category fetch ─────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (isUncategorized) {
        setCategory({ id: null, name: 'Uncategorized', color: null });
        return;
      }
      try {
        const res = await categoriesAPI.getAll();
        if (cancelled) return;
        const cat = (res.data.data?.categories || []).find(
          (c) => String(c.id) === String(categoryId)
        );
        setCategory(cat || { id: categoryId, name: 'Category' });
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [categoryId, isUncategorized]);

  // ── Debounce search ──────────────────────────────────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setSearchDebounced(filters.search), 350);
    return () => clearTimeout(t);
  }, [filters.search]);

  // ── Questions fetch ──────────────────────────────────────────────────────
  useEffect(() => {
    fetchQuestions(1);
  }, [categoryId, searchDebounced, filters.question_type, filters.difficulty, filters.is_approved]);

  const fetchQuestions = async (page = 1) => {
    setLoading(true);
    try {
      const params = {
        page,
        limit: 20,
        ...(isUncategorized ? { no_category: 'true' } : { category: categoryId }),
      };
      if (searchDebounced) params.search = searchDebounced;
      if (filters.question_type) params.type = filters.question_type;
      if (filters.difficulty) params.difficulty = filters.difficulty;
      if (filters.is_approved !== '') params.is_approved = filters.is_approved;

      const res = await adminQuestionsAPI.getAll(params);
      const data = res.data.data;
      setQuestions(data.questions || []);
      setPagination({
        page: data.page || 1,
        pages: data.pages || 1,
        total: data.total || 0,
      });
    } catch (e) {
      showToast('Failed to load questions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (q, e) => {
    e?.stopPropagation();
    try {
      await adminQuestionsAPI.approve(q.id);
      showToast('Question approved', 'success');
      fetchQuestions(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve', 'error');
    }
  };

  const handleDelete = (q, e) => {
    e?.stopPropagation();
    setDeleteTarget(q);
  };

  const confirmDelete = async () => {
    try {
      await adminQuestionsAPI.delete(deleteTarget.id);
      showToast('Question deleted', 'success');
      setDeleteTarget(null);
      fetchQuestions(pagination.page);
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to delete', 'error');
    }
  };

  const typeLabel = (t) => ({ multiple_choice: 'MCQ', true_false: 'T/F', fill_blank: 'Fill Blank' }[t] || t);
  const difficultyVariant = (d) => ({ easy: 'success', medium: 'warning', hard: 'danger' }[d?.toLowerCase()] || 'default');

  return (
    <>
      <PageHeader
        icon={HelpCircle}
        title={category?.name || 'Questions'}
        subtitle={`${pagination.total} ${pagination.total === 1 ? 'question' : 'questions'} · click any row to open`}
        actions={
          <>
            <Button
              onClick={() => navigate('/questions')}
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              Back
            </Button>
            <Button
              onClick={() => navigate(`/questions/new?category=${categoryId}`)}
              variant="ghost"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              Add Question
            </Button>
          </>
        }
      />

      <Container className="py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Input
              placeholder="Search question text..."
              leftIcon={<Search className="w-4 h-4" />}
              value={filters.search}
              onChange={(e) => setFilters((p) => ({ ...p, search: e.target.value }))}
            />
            <Select
              value={filters.question_type}
              onChange={(e) => setFilters((p) => ({ ...p, question_type: e.target.value }))}
              options={[
                { value: '', label: 'All types' },
                { value: 'multiple_choice', label: 'Multiple choice' },
                { value: 'true_false', label: 'True / False' },
                { value: 'fill_blank', label: 'Fill in the blank' },
              ]}
            />
            <Select
              value={filters.difficulty}
              onChange={(e) => setFilters((p) => ({ ...p, difficulty: e.target.value }))}
              options={[
                { value: '', label: 'All difficulties' },
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
            />
            <Select
              value={filters.is_approved}
              onChange={(e) => setFilters((p) => ({ ...p, is_approved: e.target.value }))}
              options={[
                { value: '', label: 'All statuses' },
                { value: 'true', label: 'Approved' },
                { value: 'false', label: 'Pending' },
              ]}
            />
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        ) : questions.length === 0 ? (
          <EmptyState
            image={emptyQuestions}
            title="No questions yet"
            description={
              filters.search || filters.question_type || filters.difficulty || filters.is_approved !== ''
                ? 'Try clearing your filters to see more.'
                : 'Add the first question in this category to get started.'
            }
            action={
              <Button
                onClick={() => navigate(`/questions/new?category=${categoryId}`)}
                leftIcon={<Plus className="h-4 w-4" />}
              >
                Add Question
              </Button>
            }
          />
        ) : (
          <div className="space-y-3">
            {questions.map((q) => (
              <button
                key={q.id}
                type="button"
                onClick={() => navigate(`/questions/${q.id}`)}
                className="w-full bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark hover:border-brand-blue hover:shadow-md rounded-xl p-4 text-left transition-all group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-brand-blue line-clamp-2">
                      {q.question_text}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge variant="info" size="sm">{typeLabel(q.question_type)}</Badge>
                      {q.difficulty && (
                        <Badge variant={difficultyVariant(q.difficulty)} size="sm" className="capitalize">
                          {q.difficulty}
                        </Badge>
                      )}
                      <Badge variant={q.is_approved ? 'success' : 'warning'} size="sm">
                        {q.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                      {q.course?.title && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          · {q.course.title}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!q.is_approved && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleApprove(q, e)}
                        title="Approve"
                        className="text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(q, e)}
                      title="Delete"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.pages > 1 && (
          <div className="mt-6">
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.pages}
              onPageChange={(p) => fetchQuestions(p)}
              size="sm"
            />
          </div>
        )}
      </Container>

      <Modal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete Question"
        size="sm"
      >
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          This question will be permanently removed. This action can't be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
          <Button variant="danger" onClick={confirmDelete}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
