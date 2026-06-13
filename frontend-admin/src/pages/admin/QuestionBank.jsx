import { useState, useEffect, useRef } from 'react';
import {
  HelpCircle,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Upload,
  MoreVertical,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { adminQuestionsAPI, categoriesAPI, coursesAPI } from '../../lib/api';
import { Button, Input, Select, Badge, Spinner, Modal, Dropdown, Table } from '../../components/ui';
import Container from '../../components/layout/Container';
import StatsCard from '../../components/ui/StatsCard';
import { EmptyState, PageHeader } from '../../components/layout';
import emptyQuestions from '../../assets/empty-questions.svg';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import QuestionModal from '../../components/questions/QuestionModal';
import BulkImport from '../../components/questions/BulkImport';

export default function QuestionBank() {
  const { showToast } = useToast();
  const expandedRef = useRef(new Set());

  const [stats, setStats] = useState({ total: 0, approved: 0, pending: 0, multiple_choice: 0, true_false: 0, fill_blank: 0 });
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [breakdown, setBreakdown] = useState({ category_counts: [], uncategorized_count: 0 });
  const [loadingInit, setLoadingInit] = useState(true);

  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [categoryData, setCategoryData] = useState({});

  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  const [filters, setFilters] = useState({ search: '', course_id: '', difficulty: '', question_type: '', is_approved: '' });

  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionToDelete, setQuestionToDelete] = useState(null);
  const [modalDefaultCategoryId, setModalDefaultCategoryId] = useState(null);

  useEffect(() => {
    initData();
  }, []);

  const initData = async () => {
    setLoadingInit(true);
    try {
      const [catRes, courseRes, breakdownRes, statsRes] = await Promise.all([
        categoriesAPI.getAll(),
        coursesAPI.getAll(),
        adminQuestionsAPI.getCategoryBreakdown(),
        adminQuestionsAPI.getAll({ page: 1, limit: 1 }),
      ]);
      setCategories(Array.isArray(catRes.data.data?.categories) ? catRes.data.data.categories : []);
      setCourses(courseRes.data.data?.courses || []);
      const bd = breakdownRes.data.data;
      setBreakdown({ category_counts: bd.category_counts || [], uncategorized_count: bd.uncategorized_count || 0 });
      if (statsRes.data.data?.stats) setStats(statsRes.data.data.stats);
    } catch (e) {
      console.error('Init failed:', e);
    } finally {
      setLoadingInit(false);
    }
  };

  const buildParams = (catKey, page, activeFilters) => {
    const f = activeFilters || filters;
    const params = {
      page,
      limit: 20,
      ...(catKey === 'uncategorized' ? { no_category: 'true' } : { category: catKey }),
    };
    // Only include non-empty filter values
    if (f.search) params.search = f.search;
    if (f.course_id) params.course_id = f.course_id;
    if (f.difficulty) params.difficulty = f.difficulty;
    if (f.question_type) params.type = f.question_type;
    if (f.is_approved !== '') params.is_approved = f.is_approved;
    return params;
  };

  const fetchCategoryQuestions = async (catKey, page = 1, activeFilters = null) => {
    setCategoryData(prev => ({ ...prev, [catKey]: { ...prev[catKey], loading: true } }));
    try {
      const res = await adminQuestionsAPI.getAll(buildParams(catKey, page, activeFilters));
      const d = res.data.data;
      setCategoryData(prev => ({
        ...prev,
        [catKey]: {
          questions: d.questions || [],
          page,
          pages: d.pagination?.pages || 0,
          total: d.pagination?.total || 0,
          loading: false,
        },
      }));
    } catch {
      setCategoryData(prev => ({ ...prev, [catKey]: { ...prev[catKey], loading: false, questions: [] } }));
    }
  };

  const toggleAccordion = (catKey) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catKey)) {
        next.delete(catKey);
      } else {
        next.add(catKey);
        if (!categoryData[catKey]) {
          fetchCategoryQuestions(catKey, 1);
        }
      }
      expandedRef.current = next;
      return next;
    });
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    setCategoryData({});
    expandedRef.current.forEach(catKey => fetchCategoryQuestions(catKey, 1, newFilters));
  };

  const handleSelectQuestion = (id) => {
    setSelectedQuestions(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleSelectAllInCategory = (catKey) => {
    const qs = categoryData[catKey]?.questions || [];
    const ids = qs.map(q => q.id);
    const allSelected = ids.every(id => selectedQuestions.includes(id));
    if (allSelected) {
      setSelectedQuestions(prev => prev.filter(id => !ids.includes(id)));
    } else {
      setSelectedQuestions(prev => [...new Set([...prev, ...ids])]);
    }
  };

  const handleAddQuestion = (categoryId = null) => {
    setSelectedQuestion(null);
    setModalDefaultCategoryId(categoryId);
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question) => {
    setSelectedQuestion(question);
    setModalDefaultCategoryId(null);
    setShowQuestionModal(true);
  };

  const handleDeleteQuestion = (question) => {
    setQuestionToDelete(question);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await adminQuestionsAPI.delete(questionToDelete.id);
      showToast('Question deleted', 'success');
      setShowDeleteModal(false);
      setQuestionToDelete(null);
      refreshAll();
    } catch {
      showToast('Failed to delete question', 'error');
    }
  };

  const handleApprove = async (id) => {
    try {
      await adminQuestionsAPI.approve(id);
      showToast('Question approved', 'success');
      refreshAll();
    } catch {
      showToast('Failed to approve question', 'error');
    }
  };

  const handleBulkApprove = async () => {
    if (!selectedQuestions.length) return showToast('No questions selected', 'warning');
    try {
      await adminQuestionsAPI.bulkApprove(selectedQuestions);
      showToast(`${selectedQuestions.length} questions approved`, 'success');
      setSelectedQuestions([]);
      refreshAll();
    } catch {
      showToast('Failed to approve questions', 'error');
    }
  };

  const confirmBulkDelete = async () => {
    try {
      await adminQuestionsAPI.bulkDelete(selectedQuestions);
      showToast(`${selectedQuestions.length} questions deleted`, 'success');
      setSelectedQuestions([]);
      setShowBulkDeleteModal(false);
      refreshAll();
    } catch {
      showToast('Failed to delete questions', 'error');
    }
  };

  const refreshAll = async () => {
    const openKeys = Array.from(expandedRef.current);
    setCategoryData({});
    openKeys.forEach(key => fetchCategoryQuestions(key, 1));
    try {
      const [bdRes, statsRes] = await Promise.all([
        adminQuestionsAPI.getCategoryBreakdown(),
        adminQuestionsAPI.getAll({ page: 1, limit: 1 }),
      ]);
      const bd = bdRes.data.data;
      setBreakdown({ category_counts: bd.category_counts || [], uncategorized_count: bd.uncategorized_count || 0 });
      if (statsRes.data.data?.stats) setStats(statsRes.data.data.stats);
    } catch {}
  };

  const getCountForCat = (catKey) => {
    if (catKey === 'uncategorized') return breakdown.uncategorized_count;
    return breakdown.category_counts.find(c => String(c.category_id) === catKey)?.question_count || 0;
  };

  const getDifficultyVariant = (d) => ({ easy: 'success', medium: 'warning', hard: 'danger' }[d?.toLowerCase()] || 'default');
  const getTypeLabel = (t) => ({ multiple_choice: 'MCQ', true_false: 'T/F', fill_blank: 'Fill Blank' }[t] || t);
  const truncate = (t, n = 80) => t && t.length > n ? t.slice(0, n) + '...' : t || '';

  // Build accordion list: all categories + uncategorized at the bottom
  const accordionRows = [
    ...categories.map(c => ({ key: String(c.id), label: c.name, color: c.color, catId: c.id })),
    { key: 'uncategorized', label: 'Uncategorized', color: null, catId: null },
  ];

  if (loadingInit) {
    return (
      <div className="flex items-center justify-center min-h-64 py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <>
      <PageHeader
        icon={HelpCircle}
        title="Question Bank"
        subtitle="Browse and manage questions by category"
        actions={
          <>
            <Button
              onClick={() => setShowBulkImportModal(true)}
              variant="ghost"
              size="sm"
              leftIcon={<Upload className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              Import CSV
            </Button>
            <Button
              onClick={() => handleAddQuestion()}
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
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <StatsCard title="Total Questions" value={stats.total} icon={HelpCircle} color="blue" />
          <StatsCard title="Approved" value={stats.approved} icon={CheckCircle} color="green" />
          <StatsCard title="Pending" value={stats.pending} icon={Clock} color="yellow" />
          <StatsCard title="MCQ" value={stats.multiple_choice} icon={HelpCircle} color="purple" />
          <StatsCard title="True/False" value={stats.true_false} icon={HelpCircle} color="indigo" />
          <StatsCard title="Fill Blank" value={stats.fill_blank} icon={HelpCircle} color="pink" />
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm mb-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <Input
                placeholder="Search questions..."
                value={filters.search}
                onChange={e => handleFilterChange('search', e.target.value)}
                className="pl-10 !h-12"
              />
            </div>
            <Select
              value={filters.course_id}
              onChange={e => handleFilterChange('course_id', e.target.value)}
              className="!h-12"
              options={[{ value: '', label: 'All Courses' }, ...courses.map(c => ({ value: c.id, label: c.title }))]}
            />
            <Select
              value={filters.difficulty}
              onChange={e => handleFilterChange('difficulty', e.target.value)}
              className="!h-12"
              options={[
                { value: '', label: 'All Difficulties' },
                { value: 'easy', label: 'Easy' },
                { value: 'medium', label: 'Medium' },
                { value: 'hard', label: 'Hard' },
              ]}
            />
            <Select
              value={filters.question_type}
              onChange={e => handleFilterChange('question_type', e.target.value)}
              className="!h-12"
              options={[
                { value: '', label: 'All Types' },
                { value: 'multiple_choice', label: 'Multiple Choice' },
                { value: 'true_false', label: 'True/False' },
                { value: 'fill_blank', label: 'Fill in the Blank' },
              ]}
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
              {[['', 'All'], ['true', 'Approved'], ['false', 'Pending']].map(([val, label]) => (
                <Button
                  key={val}
                  className="!h-10"
                  variant={filters.is_approved === val ? 'primary' : 'outline'}
                  onClick={() => handleFilterChange('is_approved', val)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <Button
              className="!h-10"
              variant={bulkSelectMode ? 'primary' : 'outline'}
              onClick={() => {
                setBulkSelectMode(b => !b);
                if (bulkSelectMode) setSelectedQuestions([]);
              }}
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              {bulkSelectMode ? 'Exit Select' : 'Select Multiple'}
            </Button>
          </div>
        </div>

        {/* Bulk Actions */}
        {bulkSelectMode && selectedQuestions.length > 0 && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6 flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="success" onClick={handleBulkApprove}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Selected
              </Button>
              <Button size="sm" variant="danger" onClick={() => setShowBulkDeleteModal(true)}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Category Accordions */}
        <div className="space-y-3">
          {accordionRows.map(({ key, label, color, catId }) => {
            const isExpanded = expandedCategories.has(key);
            const count = getCountForCat(key);
            const data = categoryData[key];
            const questions = data?.questions || [];

            return (
              <div
                key={key}
                className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm overflow-hidden"
              >
                {/* Accordion Header */}
                <button
                  onClick={() => toggleAccordion(key)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    {isExpanded
                      ? <ChevronDown className="w-5 h-5 text-gray-400 flex-shrink-0" />
                      : <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                    {color && (
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    )}
                    <span className="font-semibold text-gray-900 dark:text-white">{label}</span>
                    <span className="bg-gray-100 dark:bg-dark-600 text-gray-600 dark:text-gray-300 text-xs font-medium px-2 py-0.5 rounded-full">
                      {count} question{count !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {/* Add button — stop propagation so it doesn't toggle the accordion */}
                  <div onClick={e => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="ghost"
                      leftIcon={<Plus className="w-3 h-3" />}
                      onClick={() => handleAddQuestion(catId ? String(catId) : null)}
                      className="text-gray-500 hover:text-blue-600"
                    >
                      Add
                    </Button>
                  </div>
                </button>

                {/* Accordion Body */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-border-dark">
                    {data?.loading ? (
                      <div className="flex justify-center py-10">
                        <Spinner />
                      </div>
                    ) : questions.length === 0 ? (
                      <div className="py-10 text-center">
                        <p className="text-gray-400 text-sm">
                          No questions in this category
                          {(filters.search || filters.course_id || filters.difficulty || filters.question_type)
                            ? ' matching the current filters'
                            : ''}
                          .
                        </p>
                        <Button
                          size="sm"
                          className="mt-3"
                          onClick={() => handleAddQuestion(catId ? String(catId) : null)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add Question
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Table>
                          <Table.Header>
                            <Table.Row>
                              {bulkSelectMode && (
                                <Table.Head className="w-10">
                                  <input
                                    type="checkbox"
                                    checked={questions.length > 0 && questions.every(q => selectedQuestions.includes(q.id))}
                                    onChange={() => handleSelectAllInCategory(key)}
                                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                                  />
                                </Table.Head>
                              )}
                              <Table.Head className="min-w-[280px]">Question</Table.Head>
                              <Table.Head>Course</Table.Head>
                              <Table.Head>Type</Table.Head>
                              <Table.Head>Difficulty</Table.Head>
                              <Table.Head>Marks</Table.Head>
                              <Table.Head>Status</Table.Head>
                              <Table.Head className="w-16">Actions</Table.Head>
                            </Table.Row>
                          </Table.Header>
                          <Table.Body>
                            {questions.map(q => (
                              <Table.Row key={q.id}>
                                {bulkSelectMode && (
                                  <Table.Cell>
                                    <input
                                      type="checkbox"
                                      checked={selectedQuestions.includes(q.id)}
                                      onChange={() => handleSelectQuestion(q.id)}
                                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-600"
                                    />
                                  </Table.Cell>
                                )}
                                <Table.Cell>
                                  <span
                                    className="text-sm font-medium text-gray-900 dark:text-white"
                                    title={q.question_text}
                                  >
                                    {truncate(q.question_text, 80)}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {q.course?.title || <span className="text-gray-400 italic text-xs">No course</span>}
                                  </span>
                                </Table.Cell>
                                <Table.Cell>
                                  <Badge variant="primary" size="sm">{getTypeLabel(q.question_type)}</Badge>
                                </Table.Cell>
                                <Table.Cell>
                                  <Badge variant={getDifficultyVariant(q.difficulty)} size="sm">{q.difficulty}</Badge>
                                </Table.Cell>
                                <Table.Cell>
                                  <span className="text-sm font-medium text-gray-900 dark:text-white">{q.marks}</span>
                                </Table.Cell>
                                <Table.Cell>
                                  <Badge variant={q.is_approved ? 'success' : 'warning'} size="sm">
                                    {q.is_approved ? 'Approved' : 'Pending'}
                                  </Badge>
                                </Table.Cell>
                                <Table.Cell>
                                  <Dropdown>
                                    {({ isOpen, setIsOpen, menuRef }) => (
                                      <>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setIsOpen(!isOpen)}
                                          className="text-gray-600 dark:text-gray-400"
                                        >
                                          <MoreVertical className="w-4 h-4" />
                                        </Button>
                                        {isOpen && (
                                          <Dropdown.Menu align="right" menuRef={menuRef}>
                                            {!q.is_approved && (
                                              <>
                                                <Dropdown.Item
                                                  icon={CheckCircle}
                                                  onClick={() => { setIsOpen(false); handleApprove(q.id); }}
                                                >
                                                  Approve
                                                </Dropdown.Item>
                                                <Dropdown.Separator />
                                              </>
                                            )}
                                            <Dropdown.Item
                                              icon={Edit}
                                              onClick={() => { setIsOpen(false); handleEditQuestion(q); }}
                                            >
                                              Edit
                                            </Dropdown.Item>
                                            <Dropdown.Separator />
                                            <Dropdown.Item
                                              icon={Trash2}
                                              onClick={() => { setIsOpen(false); handleDeleteQuestion(q); }}
                                              danger
                                            >
                                              Delete
                                            </Dropdown.Item>
                                          </Dropdown.Menu>
                                        )}
                                      </>
                                    )}
                                  </Dropdown>
                                </Table.Cell>
                              </Table.Row>
                            ))}
                          </Table.Body>
                        </Table>
                        {data.pages > 1 && (
                          <div className="px-4 py-4 border-t border-gray-200 dark:border-border-dark">
                            <Pagination
                              currentPage={data.page}
                              totalPages={data.pages}
                              onPageChange={page => fetchCategoryQuestions(key, page)}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Container>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="Delete Question">
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {questionToDelete?.question_text}
              </p>
            </div>
            <Modal.Footer>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>Cancel</Button>
              <Button variant="danger" onClick={confirmDelete}>Delete Question</Button>
            </Modal.Footer>
          </div>
        </Modal>
      )}

      {/* Question Add/Edit Modal */}
      <QuestionModal
        isOpen={showQuestionModal}
        onClose={() => {
          setShowQuestionModal(false);
          setSelectedQuestion(null);
          setModalDefaultCategoryId(null);
        }}
        question={selectedQuestion}
        onSuccess={refreshAll}
        defaultCategoryId={modalDefaultCategoryId}
      />

      {/* Bulk Import Modal */}
      <BulkImport
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={refreshAll}
      />

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Delete Questions"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Delete <strong>{selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''}</strong>? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowBulkDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmBulkDelete}>Delete</Button>
        </div>
      </Modal>
    </>
  );
}
