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
import { Button, Input, Select, Badge, Spinner, Modal, Dropdown } from '../../components/ui';
import Container from '../../components/layout/Container';
import StatsCard from '../../components/ui/StatsCard';
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
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
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

  const handleBulkDelete = async () => {
    if (selectedQuestions.length === 0) {
      showToast('No questions selected', 'warning');
      return;
    }

    if (!confirm(`Delete ${selectedQuestions.length} selected questions?`)) {
      return;
    }

    try {
      await adminQuestionsAPI.bulkDelete(selectedQuestions);
      showToast(`${selectedQuestions.length} questions deleted`, 'success');
      setSelectedQuestions([]);
      fetchQuestions();
    } catch (error) {
      showToast('Failed to delete questions', 'error');
    }
  };

  const getDifficultyColor = (difficulty) => {
    const colors = {
      easy: 'green',
      medium: 'yellow',
      hard: 'red'
    };
    return colors[difficulty] || 'gray';
  };

  const getQuestionTypeLabel = (type) => {
    const labels = {
      multiple_choice: 'MCQ',
      true_false: 'T/F',
      fill_blank: 'Fill Blank'
    };
    return labels[type] || type;
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
              <div className="flex gap-3">
                <Button
                  onClick={() => setShowBulkImportModal(true)}
                  className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import CSV
                </Button>
                <Button
                  onClick={handleAddQuestion}
                  className="bg-white text-brand-blue hover:bg-white/90"
                >
                  <Plus className="w-4 h-4 mr-2" />
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
      <div className="bg-white dark:bg-dark-800 rounded-xl p-4 mb-6 shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                type="text"
                placeholder="Search questions..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Course Filter */}
          <Select
            value={filters.course_id}
            onChange={(e) => handleFilterChange('course_id', e.target.value)}
          >
            <option value="">All Courses</option>
            {courses.map(course => (
              <option key={course.id} value={course.id}>{course.title}</option>
            ))}
          </Select>

          {/* Category Filter */}
          <Select
            value={filters.category_id}
            onChange={(e) => handleFilterChange('category_id', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </Select>

          {/* Difficulty Filter */}
          <Select
            value={filters.difficulty}
            onChange={(e) => handleFilterChange('difficulty', e.target.value)}
          >
            <option value="">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </Select>

          {/* Type Filter */}
          <Select
            value={filters.question_type}
            onChange={(e) => handleFilterChange('question_type', e.target.value)}
          >
            <option value="">All Types</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="true_false">True/False</option>
            <option value="fill_blank">Fill in the Blank</option>
          </Select>
        </div>

        {/* Approval Filter */}
        <div className="mt-4 flex items-center gap-4">
          <span className="text-sm text-gray-600 dark:text-gray-400">Status:</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={filters.is_approved === '' ? 'primary' : 'outline'}
              onClick={() => handleFilterChange('is_approved', '')}
            >
              All
            </Button>
            <Button
              size="sm"
              variant={filters.is_approved === 'true' ? 'primary' : 'outline'}
              onClick={() => handleFilterChange('is_approved', 'true')}
            >
              Approved
            </Button>
            <Button
              size="sm"
              variant={filters.is_approved === 'false' ? 'primary' : 'outline'}
              onClick={() => handleFilterChange('is_approved', 'false')}
            >
              Pending
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedQuestions.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
              {selectedQuestions.length} question(s) selected
            </span>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleBulkApprove}>
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

      {/* Questions List */}
      <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : questions.length === 0 ? (
          <div className="text-center py-12">
            <HelpCircle className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No questions found
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Get started by adding your first question
            </p>
            <Button onClick={handleAddQuestion}>
              <Plus className="w-4 h-4 mr-2" />
              Add Question
            </Button>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div className="border-b border-gray-200 dark:border-gray-700 p-4 bg-gray-50 dark:bg-dark-900">
              <div className="flex items-center gap-4">
                <input
                  type="checkbox"
                  checked={selectedQuestions.length === questions.length}
                  onChange={handleSelectAll}
                  className="rounded"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Select All
                </span>
              </div>
            </div>

            {/* Questions */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="p-4 hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedQuestions.includes(question.id)}
                      onChange={() => handleSelectQuestion(question.id)}
                      className="mt-1 rounded"
                    />

                    {/* Question Content */}
                    <div className="flex-1">
                      {/* Question Text */}
                      <div className="mb-2">
                        <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">
                          {question.question_text}
                        </h3>
                      </div>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-3 text-sm">
                        <Badge color={question.is_approved ? 'green' : 'yellow'}>
                          {question.is_approved ? '✓ Approved' : '⏳ Pending'}
                        </Badge>
                        <Badge color="blue">
                          {getQuestionTypeLabel(question.question_type)}
                        </Badge>
                        <Badge color={getDifficultyColor(question.difficulty)}>
                          {question.difficulty}
                        </Badge>
                        {question.course && (
                          <span className="text-gray-700 dark:text-gray-300 font-medium">
                            📚 {question.course.title}
                          </span>
                        )}
                        {question.category && (
                          <span className="text-gray-600 dark:text-gray-400">
                            📁 {question.category.name}
                          </span>
                        )}
                        <span className="text-gray-600 dark:text-gray-400">
                          💯 {question.marks} marks
                        </span>
                        {question.times_used > 0 && (
                          <span className="text-gray-600 dark:text-gray-400">
                            📊 Used {question.times_used}x
                          </span>
                        )}
                        {question.creator && (
                          <span className="text-gray-600 dark:text-gray-400">
                            👤 {question.creator.full_name}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <Dropdown>
                      {({ isOpen, setIsOpen }) => (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsOpen(!isOpen)}
                            className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                          {isOpen && (
                            <Dropdown.Menu align="right">
                              {!question.is_approved && (
                                <>
                                  <Dropdown.Item
                                    icon={CheckCircle}
                                    onClick={() => {
                                      setIsOpen(false);
                                      handleApprove(question.id);
                                    }}
                                  >
                                    Approve Question
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
                                Edit Question
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
                                Delete Question
                              </Dropdown.Item>
                            </Dropdown.Menu>
                          )}
                        </>
                      )}
                    </Dropdown>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
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
            <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 mb-6">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {questionToDelete?.question_text}
              </p>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setShowDeleteModal(false)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={confirmDelete}>
                Delete Question
              </Button>
            </div>
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
          fetchStats();
        }}
      />

      {/* Bulk Import Modal */}
      <BulkImport
        isOpen={showBulkImportModal}
        onClose={() => setShowBulkImportModal(false)}
        onSuccess={() => {
          fetchQuestions();
          fetchStats();
        }}
      />
    </Container>
  </>
  );
}
