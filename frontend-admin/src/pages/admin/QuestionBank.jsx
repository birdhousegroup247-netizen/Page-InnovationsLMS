import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle,
  Plus,
  Search,
  Filter,
  CheckCircle,
  Clock,
  Edit,
  Trash2,
  Eye,
  Copy,
  Download,
  Upload,
  MoreVertical
} from 'lucide-react';
import { adminQuestionsAPI, categoriesAPI, coursesAPI } from '../../lib/api';
import { Button, Input, Select, Badge, Spinner, Modal, Dropdown, Table } from '../../components/ui';
import Container from '../../components/layout/Container';
import StatsCard from '../../components/ui/StatsCard';
import { EmptyState } from '../../components/layout';
import emptyQuestions from '../../assets/empty-questions.svg';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import QuestionModal from '../../components/questions/QuestionModal';
import BulkImport from '../../components/questions/BulkImport';

export default function QuestionBank() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  // State
  const [questions, setQuestions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    multiple_choice: 0,
    true_false: 0,
    fill_blank: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    course_id: '',
    category_id: '',
    difficulty: '',
    question_type: '',
    is_approved: '',
  });

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });

  // Modals
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [showBulkImportModal, setShowBulkImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState(null);
  const [questionToDelete, setQuestionToDelete] = useState(null);

  // Fetch courses and categories
  useEffect(() => {
    fetchCourses();
    fetchCategories();
  }, []);

  // Fetch questions when filters or pagination change
  useEffect(() => {
    fetchQuestions();
  }, [filters, pagination.page]);

  const fetchCourses = async () => {
    try {
      const response = await coursesAPI.getAll();
      setCourses(response.data.data.courses || []);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await categoriesAPI.getAll();
      setCategories(Array.isArray(response.data.data?.categories) ? response.data.data.categories : []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const params = {
        ...filters,
        page: pagination.page,
        limit: pagination.limit
      };

      const response = await adminQuestionsAPI.getAll(params);
      const data = response.data.data;

      setQuestions(data.questions || []);
      setPagination(prev => ({
        ...prev,
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0
      }));

      // Update stats
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Failed to fetch questions:', error);
      showToast('Failed to load questions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handleSelectQuestion = (questionId) => {
    setSelectedQuestions(prev => {
      if (prev.includes(questionId)) {
        return prev.filter(id => id !== questionId);
      }
      return [...prev, questionId];
    });
  };

  const handleSelectAll = () => {
    if (selectedQuestions.length === questions.length) {
      setSelectedQuestions([]);
    } else {
      setSelectedQuestions(questions.map(q => q.id));
    }
  };

  const handleAddQuestion = () => {
    setSelectedQuestion(null);
    setShowQuestionModal(true);
  };

  const handleEditQuestion = (question) => {
    setSelectedQuestion(question);
    setShowQuestionModal(true);
  };

  const handleDeleteQuestion = (question) => {
    setQuestionToDelete(question);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await adminQuestionsAPI.delete(questionToDelete.id);
      showToast('Question deleted successfully', 'success');
      setShowDeleteModal(false);
      setQuestionToDelete(null);
      fetchQuestions();
    } catch (error) {
      showToast('Failed to delete question', 'error');
    }
  };

  const handleApprove = async (questionId) => {
    try {
      await adminQuestionsAPI.approve(questionId);
      showToast('Question approved successfully', 'success');
      fetchQuestions();
    } catch (error) {
      showToast('Failed to approve question', 'error');
    }
  };

  const handleBulkApprove = async () => {
    if (selectedQuestions.length === 0) {
      showToast('No questions selected', 'warning');
      return;
    }

    try {
      await adminQuestionsAPI.bulkApprove(selectedQuestions);
      showToast(`${selectedQuestions.length} questions approved`, 'success');
      setSelectedQuestions([]);
      fetchQuestions();
    } catch (error) {
      showToast('Failed to approve questions', 'error');
    }
  };

  const handleBulkDelete = () => {
    if (selectedQuestions.length === 0) {
      showToast('No questions selected', 'warning');
      return;
    }
    setShowBulkDeleteModal(true);
  };

  const confirmBulkDelete = async () => {
    try {
      await adminQuestionsAPI.bulkDelete(selectedQuestions);
      showToast(`${selectedQuestions.length} questions deleted`, 'success');
      setSelectedQuestions([]);
      setShowBulkDeleteModal(false);
      fetchQuestions();
    } catch (error) {
      showToast('Failed to delete questions', 'error');
    }
  };

  const toggleBulkSelectMode = () => {
    setBulkSelectMode(!bulkSelectMode);
    if (bulkSelectMode) {
      // Exiting bulk mode - clear selections
      setSelectedQuestions([]);
    }
  };

  const getDifficultyVariant = (difficulty) => {
    const variants = {
      easy: 'success',
      medium: 'warning',
      hard: 'danger'
    };
    return variants[difficulty?.toLowerCase()] || 'default';
  };

  const getQuestionTypeLabel = (type) => {
    const labels = {
      multiple_choice: 'MCQ',
      true_false: 'T/F',
      fill_blank: 'Fill Blank'
    };
    return labels[type] || type;
  };

  const truncateText = (text, maxLength = 60) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                  <HelpCircle className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                    Question Bank
                  </h1>
                  <p className="text-lg text-white/90 animate-fade-in mt-1">
                    Manage your question repository for tests and exams
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => setShowBulkImportModal(true)}
                  variant="ghost"
                  leftIcon={<Upload className="h-4 w-4" />}
                  className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none animate-scale-in"
                >
                  Import CSV
                </Button>
                <Button
                  onClick={handleAddQuestion}
                  variant="ghost"
                  leftIcon={<Plus className="h-4 w-4" />}
                  className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none animate-scale-in"
                >
                  Add Question
                </Button>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
        <StatsCard
          title="Total Questions"
          value={stats.total}
          icon={HelpCircle}
          color="blue"
        />
        <StatsCard
          title="Approved"
          value={stats.approved}
          icon={CheckCircle}
          color="green"
        />
        <StatsCard
          title="Pending"
          value={stats.pending}
          icon={Clock}
          color="yellow"
        />
        <StatsCard
          title="MCQ"
          value={stats.multiple_choice}
          icon={HelpCircle}
          color="purple"
        />
        <StatsCard
          title="True/False"
          value={stats.true_false}
          icon={HelpCircle}
          color="indigo"
        />
        <StatsCard
          title="Fill Blank"
          value={stats.fill_blank}
          icon={HelpCircle}
          color="pink"
        />
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-800 p-4 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10 !h-12"
              />
            </div>
          </div>

          {/* Course Filter */}
          <Select
            value={filters.course_id}
            onChange={(e) => handleFilterChange('course_id', e.target.value)}
            placeholder="Filter by course"
            className="!h-12"
            options={[
              { value: '', label: 'All Courses' },
              ...courses.map(course => ({ value: course.id, label: course.title }))
            ]}
          />

          {/* Difficulty Filter */}
          <Select
            value={filters.difficulty}
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
            placeholder="Filter by difficulty"
            className="!h-12"
            options={[
              { value: '', label: 'All Difficulties' },
              { value: 'easy', label: 'Easy' },
              { value: 'medium', label: 'Medium' },
              { value: 'hard', label: 'Hard' }
            ]}
          />

          {/* Type Filter */}
          <Select
            value={filters.question_type}
            onChange={(e) => handleFilterChange('question_type', e.target.value)}
            placeholder="Filter by question type"
            className="!h-12"
            options={[
              { value: '', label: 'All Types' },
              { value: 'multiple_choice', label: 'Multiple Choice' },
              { value: 'true_false', label: 'True/False' },
              { value: 'fill_blank', label: 'Fill in the Blank' }
            ]}
          />
        </div>

        {/* Approval Filter and Bulk Select Toggle */}
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <div className="flex gap-2">
              <Button
                className="!h-12 !min-h-[48px]"
                variant={filters.is_approved === '' ? 'primary' : 'outline'}
                onClick={() => handleFilterChange('is_approved', '')}
              >
                All
              </Button>
              <Button
                className="!h-12 !min-h-[48px]"
                variant={filters.is_approved === 'true' ? 'primary' : 'outline'}
                onClick={() => handleFilterChange('is_approved', 'true')}
              >
                Approved
              </Button>
              <Button
                className="!h-12 !min-h-[48px]"
                variant={filters.is_approved === 'false' ? 'primary' : 'outline'}
                onClick={() => handleFilterChange('is_approved', 'false')}
              >
                Pending
              </Button>
            </div>
          </div>

          {/* Bulk Select Toggle */}
          <Button
            className="!h-12 !min-h-[48px]"
            variant={bulkSelectMode ? 'primary' : 'outline'}
            onClick={toggleBulkSelectMode}
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            {bulkSelectMode ? 'Exit Select Mode' : 'Select Multiple'}
          </Button>
        </div>
      </div>

      {/* Bulk Actions */}
      {bulkSelectMode && selectedQuestions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedQuestions.length} question(s) selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" variant="success" onClick={handleBulkApprove}>
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve Selected
              </Button>
              <Button size="sm" variant="danger" onClick={handleBulkDelete}>
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Selected
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Questions Table */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : questions.length === 0 ? (
          <EmptyState
            image={emptyQuestions}
            icon={<HelpCircle className="w-16 h-16" />}
            title="No questions found"
            description={filters.search || filters.course_id || filters.difficulty ? "No questions match your current filters." : "Get started by adding your first question to the bank."}
            action={
              <Button onClick={handleAddQuestion}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            }
          />
        ) : (
          <>
            <Table>
              <Table.Header>
                <Table.Row>
                  {bulkSelectMode && (
                    <Table.Head className="w-12">
                      <input
                        type="checkbox"
                        checked={selectedQuestions.length === questions.length && questions.length > 0}
                        onChange={handleSelectAll}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400"
                      />
                    </Table.Head>
                  )}
                  <Table.Head className="min-w-[300px]">Question</Table.Head>
                  <Table.Head>Type</Table.Head>
                  <Table.Head>Difficulty</Table.Head>
                  <Table.Head>Marks</Table.Head>
                  <Table.Head>Category</Table.Head>
                  <Table.Head>Status</Table.Head>
                  <Table.Head className="w-20">Actions</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {questions.map((question) => (
                  <Table.Row key={question.id}>
                    {/* Checkbox */}
                    {bulkSelectMode && (
                      <Table.Cell>
                        <input
                          type="checkbox"
                          checked={selectedQuestions.includes(question.id)}
                          onChange={() => handleSelectQuestion(question.id)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 dark:text-blue-500 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                      </Table.Cell>
                    )}

                    {/* Question Text */}
                    <Table.Cell>
                      <div className="max-w-md">
                        <span
                          className="text-sm font-medium text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400"
                          title={question.question_text}
                        >
                          {truncateText(question.question_text, 80)}
                        </span>
                      </div>
                    </Table.Cell>

                    {/* Type */}
                    <Table.Cell>
                      <Badge variant="primary" size="sm">
                        {getQuestionTypeLabel(question.question_type)}
                      </Badge>
                    </Table.Cell>

                    {/* Difficulty */}
                    <Table.Cell>
                      <Badge variant={getDifficultyVariant(question.difficulty)} size="sm">
                        {question.difficulty}
                      </Badge>
                    </Table.Cell>

                    {/* Marks */}
                    <Table.Cell>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {question.marks}
                      </span>
                    </Table.Cell>

                    {/* Category */}
                    <Table.Cell>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {question.category?.name || question.course?.title || '-'}
                      </span>
                    </Table.Cell>

                    {/* Status */}
                    <Table.Cell>
                      <Badge variant={question.is_approved ? 'success' : 'warning'} size="sm">
                        {question.is_approved ? 'Approved' : 'Pending'}
                      </Badge>
                    </Table.Cell>

                    {/* Actions */}
                    <Table.Cell>
                      <Dropdown>
                        {({ isOpen, setIsOpen, menuRef }) => (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setIsOpen(!isOpen)}
                              aria-label="More actions"
                              className="text-gray-600 dark:text-gray-400"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                            {isOpen && (
                              <Dropdown.Menu align="right" menuRef={menuRef}>
                                {!question.is_approved && (
                                  <>
                                    <Dropdown.Item
                                      icon={CheckCircle}
                                      onClick={() => {
                                        setIsOpen(false);
                                        handleApprove(question.id);
                                      }}
                                    >
                                      Approve
                                    </Dropdown.Item>
                                    <Dropdown.Separator />
                                  </>
                                )}
                                <Dropdown.Item
                                  icon={Edit}
                                  onClick={() => {
                                    setIsOpen(false);
                                    handleEditQuestion(question);
                                  }}
                                >
                                  Edit
                                </Dropdown.Item>
                                <Dropdown.Item
                                  icon={Eye}
                                  onClick={() => {
                                    setIsOpen(false);
                                    // Preview functionality
                                  }}
                                >
                                  Preview
                                </Dropdown.Item>
                                <Dropdown.Separator />
                                <Dropdown.Item
                                  icon={Trash2}
                                  onClick={() => {
                                    setIsOpen(false);
                                    handleDeleteQuestion(question);
                                  }}
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

            {/* Pagination */}
            <div className="px-4 py-4 border-t border-gray-200 dark:border-border-dark">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.pages}
                onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
              />
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <Modal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          title="Delete Question"
        >
          <div className="p-6">
            <p className="text-gray-700 dark:text-gray-300 mb-6">
              Are you sure you want to delete this question? This action cannot be undone.
            </p>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {questionToDelete?.question_text}
              </p>
            </div>
            <Modal.Footer>
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Delete Question
              </Button>
            </Modal.Footer>
          </div>
        </Modal>
      )}

      {/* Question Modal (Add/Edit) */}
      <QuestionModal
        isOpen={showQuestionModal}
        onClose={() => {
          setShowQuestionModal(false);
          setSelectedQuestion(null);
        }}
        question={selectedQuestion}
        onSuccess={() => {
          fetchQuestions();
        }}
      />

      {/* Bulk Import Modal */}
      <BulkImport
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          fetchQuestions();
        }}
      />
    </Container>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        isOpen={showBulkDeleteModal}
        onClose={() => setShowBulkDeleteModal(false)}
        title="Delete Questions"
        size="sm"
      >
        <p className="text-gray-600 dark:text-text-dark-secondary mb-6">
          Are you sure you want to delete <strong>{selectedQuestions.length} question{selectedQuestions.length !== 1 ? 's' : ''}</strong>? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => setShowBulkDeleteModal(false)}>Cancel</Button>
          <Button variant="danger" onClick={confirmBulkDelete}>Delete</Button>
        </div>
      </Modal>
  </>
  );
}
