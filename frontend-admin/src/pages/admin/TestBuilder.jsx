import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  Settings,
  Users,
  CheckCircle,
  Plus,
  X,
  Trash2
} from 'lucide-react';
import { adminTestsAPI, adminQuestionsAPI, adminCategoriesAPI, coursesAPI, adminUsersAPI } from '../../lib/api';
import { Button, Input, Select, Badge, Spinner } from '../../components/ui';
import Container from '../../components/layout/Container';
import { useToast } from '../../components/ui/Toast';

export default function TestBuilder() {
  const navigate = useNavigate();
  const { testId } = useParams();
  const { showToast } = useToast();
  const isEditing = !!testId;

  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Assignment mode: 'all' = all course students, 'selected' = manual pick
  const [assignmentMode, setAssignmentMode] = useState('all');

  // Form data
  const [formData, setFormData] = useState({
    test_name: '',
    description: '',
    course_id: '',
    due_date: '',
    time_limit_minutes: 60,
    passing_score: 70,
    max_attempts: 1,
    allow_retake: false,
    randomize_questions: true,
    randomize_options: true,
    show_results_immediately: true,
    show_correct_answers: true,
    show_explanations: true,
    questions: [],
    assigned_students: []
  });

  // Selection method for questions
  const [selectionMethod, setSelectionMethod] = useState('manual'); // 'manual' or 'auto'

  // Category-first browsing
  const [selectedCategory, setSelectedCategory] = useState('');
  const [questionFilters, setQuestionFilters] = useState({ search: '', difficulty: '', type: '', course_id: '' });

  // Legacy manual filter (kept for auto-config)
  const [manualFilter, setManualFilter] = useState({
    course_id: '',
    search: ''
  });

  // Auto-selection config
  const [autoConfig, setAutoConfig] = useState({
    selected_courses: [], // Multi-course selection
    category_id: '',
    difficulty: {
      easy: 5,
      medium: 10,
      hard: 5
    },
    total_questions: 20
  });

  // Available data
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [students, setStudents] = useState([]);

  // Errors
  const [errors, setErrors] = useState({});

  // Load initial data
  useEffect(() => {
    fetchCourses();
    fetchCategories();
    fetchQuestions();
    fetchStudents();
    if (isEditing) {
      fetchTestData();
    }
  }, [testId]);

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
      const response = await adminCategoriesAPI.getAll();
      setCategories(response.data.data?.categories || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const fetchQuestions = async () => {
    try {
      const response = await adminQuestionsAPI.getAll({ limit: 2000, is_approved: 'true' });
      setQuestions(response.data.data?.questions || []);
    } catch (error) {
      console.error('Failed to fetch questions:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      const response = await adminUsersAPI.getAll({ role: 'student', limit: 1000 });
      setStudents(response.data.data?.users || []);
    } catch (error) {
      console.error('Failed to fetch students:', error);
    }
  };

  const fetchTestData = async () => {
    try {
      setLoading(true);
      const response = await adminTestsAPI.getById(testId);
      const test = response.data.data;

      setFormData({
        test_name: test.test_name || '',
        description: test.description || '',
        course_id: test.course_id || '',
        due_date: test.end_date ? test.end_date.split('T')[0] : '',
        time_limit_minutes: test.time_limit_minutes || 60,
        passing_score: test.passing_score || 70,
        max_attempts: test.max_attempts || 1,
        allow_retake: test.allow_retake ?? false,
        randomize_questions: test.randomize_questions ?? true,
        randomize_options: test.randomize_options ?? true,
        show_results_immediately: test.show_results_immediately ?? true,
        show_correct_answers: test.show_correct_answers ?? true,
        show_explanations: test.show_explanations ?? true,
        questions: test.test_questions?.map(tq => tq.question) || [],
        assigned_students: []
      });
    } catch (error) {
      console.error('Failed to fetch test data:', error);
      showToast('Failed to load test data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleAutoConfigChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.');
      setAutoConfig(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: parseInt(value) || 0
        }
      }));
    } else {
      setAutoConfig(prev => ({ ...prev, [field]: value }));
    }

    // Update total
    if (field.startsWith('difficulty.')) {
      const { easy, medium, hard } = autoConfig.difficulty;
      const total = (field === 'difficulty.easy' ? parseInt(value) || 0 : easy) +
                   (field === 'difficulty.medium' ? parseInt(value) || 0 : medium) +
                   (field === 'difficulty.hard' ? parseInt(value) || 0 : hard);
      setAutoConfig(prev => ({ ...prev, total_questions: total }));
    }
  };

  const handleSelectQuestion = (question) => {
    if (formData.questions.find(q => q.id === question.id)) {
      setFormData(prev => ({
        ...prev,
        questions: prev.questions.filter(q => q.id !== question.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        questions: [...prev.questions, question]
      }));
    }
  };

  const handleAutoSelectQuestions = async () => {
    try {
      const { selected_courses, category_id, difficulty } = autoConfig;
      const selectedQuestions = [];

      // Filter questions by courses if specified
      let availableQuestions = questions;
      if (selected_courses.length > 0) {
        availableQuestions = questions.filter(q =>
          selected_courses.includes(q.course_id)
        );
      }

      // Further filter by category if specified
      if (category_id) {
        availableQuestions = availableQuestions.filter(
          q => q.category_id === parseInt(category_id)
        );
      }

      // Select questions by difficulty
      ['easy', 'medium', 'hard'].forEach(diff => {
        const count = difficulty[diff];
        if (count > 0) {
          const diffQuestions = availableQuestions
            .filter(q => q.difficulty === diff)
            .sort(() => Math.random() - 0.5) // Shuffle
            .slice(0, count);
          selectedQuestions.push(...diffQuestions);
        }
      });

      if (selectedQuestions.length === 0) {
        showToast('No questions match the criteria', 'warning');
        return;
      }

      setFormData(prev => ({ ...prev, questions: selectedQuestions }));
      showToast(`Selected ${selectedQuestions.length} questions`, 'success');
    } catch (error) {
      console.error('Failed to auto-select questions:', error);
      showToast('Failed to select questions', 'error');
    }
  };

  const handleSelectStudent = (student) => {
    if (formData.assigned_students.find(s => s.id === student.id)) {
      setFormData(prev => ({
        ...prev,
        assigned_students: prev.assigned_students.filter(s => s.id !== student.id)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        assigned_students: [...prev.assigned_students, student]
      }));
    }
  };

  const handleSelectAllStudents = () => {
    if (formData.assigned_students.length === students.length) {
      setFormData(prev => ({ ...prev, assigned_students: [] }));
    } else {
      setFormData(prev => ({ ...prev, assigned_students: [...students] }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.test_name.trim()) {
        newErrors.test_name = 'Test title is required';
      }
      if (!formData.course_id) {
        newErrors.course_id = 'Please select a course';
      }
    }

    if (step === 2) {
      if (formData.questions.length === 0) {
        newErrors.questions = 'Please select at least one question';
      }
    }

    if (step === 4) {
      if (assignmentMode === 'all' && !formData.course_id) {
        newErrors.course_id = 'Please select a course in Step 1 to use "All course students"';
      }
      if (assignmentMode === 'selected' && formData.assigned_students.length === 0) {
        newErrors.assigned_students = 'Please select at least one student';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    } else {
      showToast('Please fix the errors before continuing', 'error');
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Generate a test code from the test name
  const generateTestCode = (name) => {
    return name.toUpperCase().replace(/[^A-Z0-9]/g, '-').replace(/-+/g, '-').slice(0, 20) + '-' + Date.now().toString(36).toUpperCase();
  };

  const handleSubmit = async (status = 'draft') => {
    if (!validateStep(4)) {
      showToast('Please fix the errors before submitting', 'error');
      return;
    }

    setLoading(true);

    try {
      const question_ids = formData.questions.map(q => q.id);

      const testPayload = {
        test_name: formData.test_name,
        test_code: generateTestCode(formData.test_name),
        description: formData.description,
        course_id: formData.course_id || null,
        end_date: formData.due_date || null,
        time_limit_minutes: formData.time_limit_minutes,
        passing_score: formData.passing_score,
        max_attempts: formData.max_attempts,
        allow_retake: formData.allow_retake,
        randomize_questions: formData.randomize_questions,
        randomize_options: formData.randomize_options,
        show_results_immediately: formData.show_results_immediately,
        show_correct_answers: formData.show_correct_answers,
        show_explanations: formData.show_explanations,
        status: 'draft', // always create as draft first
      };

      let savedTestId = testId;

      if (isEditing) {
        await adminTestsAPI.update(testId, testPayload);
        // Re-add questions on edit
        if (question_ids.length > 0) {
          await adminTestsAPI.addQuestions(testId, { question_ids });
        }
        showToast('Test updated successfully', 'success');
      } else {
        const response = await adminTestsAPI.create(testPayload);
        const createdTest = response.data.data?.test || response.data.data;
        savedTestId = createdTest.id;

        if (question_ids.length > 0) {
          await adminTestsAPI.addQuestions(savedTestId, { question_ids });
        }
        showToast('Test saved successfully', 'success');
      }

      // If publishing, use the publish endpoint which handles assignment
      if (status === 'published') {
        await adminTestsAPI.publish(savedTestId, {
          assign_to: assignmentMode,
          student_ids: assignmentMode === 'selected' ? formData.assigned_students.map(s => s.id) : [],
          due_date: formData.due_date || null,
        });
        showToast('Test published and assigned successfully!', 'success');
      }

      setTimeout(() => navigate('/tests'), 1500);
    } catch (error) {
      console.error('Failed to save test:', error);
      showToast(error.response?.data?.message || 'Failed to save test', 'error');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { number: 1, title: 'Basic Info', icon: Info },
    { number: 2, title: 'Questions', icon: FileText },
    { number: 3, title: 'Settings', icon: Settings },
    { number: 4, title: 'Assign Students', icon: Users }
  ];

  if (loading && isEditing) {
    return (
      <Container>
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      </Container>
    );
  }

  return (
    <>
      <PageHeader
        icon={FileText}
        title={isEditing ? 'Edit Test' : 'Create New Test'}
        subtitle={isEditing ? 'Update test configuration and settings' : 'Build and configure your test step by step'}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/tests')}
            leftIcon={<ArrowLeft className="h-4 w-4" />}
            className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
          >
            Back to Tests
          </Button>
        }
      />

      <Container className="py-8">

      {/* Stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex flex-col items-center flex-1 relative">
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div
                    className={`absolute top-6 left-1/2 h-0.5 w-full transition-colors ${
                      isCompleted
                        ? 'bg-brand-blue'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                )}

                {/* Step Circle */}
                <div className="relative z-10 mb-2">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-brand-blue text-white shadow-lg scale-110'
                        : isCompleted
                        ? 'bg-brand-blue text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                </div>

                {/* Step Label */}
                <span
                  className={`text-sm font-medium text-center transition-colors ${
                    isActive
                      ? 'text-brand-blue'
                      : isCompleted
                      ? 'text-gray-700 dark:text-gray-300'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6 mb-6">
        {/* Step 1: Basic Info */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Test Title *
              </label>
              <Input
                value={formData.test_name}
                onChange={(e) => handleChange('test_name', e.target.value)}
                placeholder="e.g., Week 5 Quiz - JavaScript Fundamentals"
                className={errors.test_name ? 'border-red-500' : ''}
              />
              {errors.test_name && (
                <p className="mt-1 text-sm text-red-600">{errors.test_name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700"
                placeholder="Describe the test objectives and topics covered..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Course *
                </label>
                <Select
                  value={formData.course_id}
                  onChange={(e) => handleChange('course_id', e.target.value)}
                  className={errors.course_id ? 'border-red-500' : ''}
                >
                  <option value="">Select a course</option>
                  {courses.map(course => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </Select>
                {errors.course_id && (
                  <p className="mt-1 text-sm text-red-600">{errors.course_id}</p>
                )}
              </div>

            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time Limit (minutes)
                </label>
                <Input
                  type="number"
                  min="5"
                  max="300"
                  value={formData.time_limit_minutes}
                  onChange={(e) => handleChange('time_limit_minutes', e.target.value)}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Max Attempts
                </label>
                <Input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.max_attempts}
                  onChange={(e) => handleChange('max_attempts', e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Question Selection */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Select Questions</h2>
              {formData.questions.length > 0 && (
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                    {formData.questions.length} selected
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setFormData(prev => ({ ...prev, questions: [] }))}>
                    Clear all
                  </Button>
                </div>
              )}
            </div>

            {errors.questions && (
              <p className="text-sm text-red-600">{errors.questions}</p>
            )}

            {/* Category chips — primary filter */}
            <div>
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filter by Category</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('')}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                    selectedCategory === ''
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                  }`}
                >
                  All ({questions.length})
                </button>
                {categories.map(cat => {
                  const count = questions.filter(q => q.category_id === cat.id).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(String(cat.id))}
                      className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                        selectedCategory === String(cat.id)
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white dark:bg-dark-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                      }`}
                    >
                      {cat.name} ({count})
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Secondary filters */}
            <div className="flex flex-wrap gap-3">
              <div className="flex-1 min-w-[160px]">
                <Input
                  placeholder="Search questions..."
                  value={questionFilters.search}
                  onChange={(e) => setQuestionFilters(prev => ({ ...prev, search: e.target.value }))}
                />
              </div>
              <Select
                value={questionFilters.difficulty}
                onChange={(e) => setQuestionFilters(prev => ({ ...prev, difficulty: e.target.value }))}
                className="w-36"
              >
                <option value="">All levels</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </Select>
              <Select
                value={questionFilters.type}
                onChange={(e) => setQuestionFilters(prev => ({ ...prev, type: e.target.value }))}
                className="w-44"
              >
                <option value="">All types</option>
                <option value="multiple_choice">Multiple choice</option>
                <option value="true_false">True / False</option>
                <option value="fill_blank">Fill in blank</option>
              </Select>
              <Select
                value={questionFilters.course_id}
                onChange={(e) => setQuestionFilters(prev => ({ ...prev, course_id: e.target.value }))}
                className="w-44"
              >
                <option value="">All courses</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </Select>
            </div>

            {/* Question list */}
            {(() => {
              const filtered = questions.filter(q => {
                if (selectedCategory && q.category_id !== parseInt(selectedCategory)) return false;
                if (questionFilters.difficulty && q.difficulty !== questionFilters.difficulty) return false;
                if (questionFilters.type && q.question_type !== questionFilters.type) return false;
                if (questionFilters.course_id && q.course_id !== parseInt(questionFilters.course_id)) return false;
                if (questionFilters.search && !q.question_text.toLowerCase().includes(questionFilters.search.toLowerCase())) return false;
                return true;
              });

              if (filtered.length === 0) {
                return (
                  <div className="text-center py-10 text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
                    No questions match the selected filters.
                  </div>
                );
              }

              return (
                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-200 dark:divide-gray-700">
                    {filtered.map(question => {
                      const isSelected = !!formData.questions.find(q => q.id === question.id);
                      return (
                        <div
                          key={question.id}
                          onClick={() => handleSelectQuestion(question)}
                          className={`p-4 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-dark-700 ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-5 h-5 rounded border-2 flex-shrink-0 mt-0.5 flex items-center justify-center transition-colors ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-300 dark:border-gray-600'}`}>
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-gray-900 dark:text-white">{question.question_text}</p>
                              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                {question.category && (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                                    {question.category.name}
                                  </span>
                                )}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  question.difficulty === 'easy' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                                  question.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                                  'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                }`}>
                                  {question.difficulty}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {question.question_type.replace('_', ' ')}
                                </span>
                                <span className="text-xs text-gray-400">{question.marks} pt</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="px-4 py-2 bg-gray-50 dark:bg-dark-700 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500">
                    Showing {filtered.length} question{filtered.length !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })()}

            {/* Selected Questions summary */}
            {formData.questions.length > 0 && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 dark:text-white mb-3">
                  Selected Questions ({formData.questions.length})
                </h3>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {formData.questions.map((question, index) => (
                    <div
                      key={question.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-500">
                          {index + 1}.
                        </span>
                        <p className="text-sm text-gray-900 dark:text-white line-clamp-1">
                          {question.question_text}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSelectQuestion(question)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Test Settings */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Test Settings
            </h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Passing Score (%)
              </label>
              <Input
                type="number"
                min="0"
                max="100"
                value={formData.passing_score}
                onChange={(e) => handleChange('passing_score', e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                Students need to score at least {formData.passing_score}% to pass
              </p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Question Display Options
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700">
                <input
                  type="checkbox"
                  checked={formData.randomize_questions}
                  onChange={(e) => handleChange('randomize_questions', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Shuffle Questions
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Questions appear in random order for each student
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700">
                <input
                  type="checkbox"
                  checked={formData.randomize_options}
                  onChange={(e) => handleChange('randomize_options', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Shuffle Options
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Answer options appear in random order
                  </p>
                </div>
              </label>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Results Display Options
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700">
                <input
                  type="checkbox"
                  checked={formData.show_results_immediately}
                  onChange={(e) => handleChange('show_results_immediately', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Show Results Immediately
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Students see their score right after submission
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700">
                <input
                  type="checkbox"
                  checked={formData.show_correct_answers}
                  onChange={(e) => handleChange('show_correct_answers', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Show Correct Answers
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Display correct answers after submission
                  </p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700">
                <input
                  type="checkbox"
                  checked={formData.show_explanations}
                  onChange={(e) => handleChange('show_explanations', e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    Show Explanations
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Display explanations for each answer
                  </p>
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Step 4: Assign Students */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Assign Students
            </h2>

            {/* Assignment mode selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setAssignmentMode('all')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  assignmentMode === 'all'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${assignmentMode === 'all' ? 'border-blue-500' : 'border-gray-400'}`}>
                    {assignmentMode === 'all' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">All course students</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Every student currently enrolled in the selected course will receive this test automatically. New enrollees will also get it.
                    </p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setAssignmentMode('selected')}
                className={`p-4 rounded-xl border-2 text-left transition-all ${
                  assignmentMode === 'selected'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 rounded-full border-2 mt-0.5 flex items-center justify-center ${assignmentMode === 'selected' ? 'border-blue-500' : 'border-gray-400'}`}>
                    {assignmentMode === 'selected' && <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-white">Select specific students</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Manually choose which students get this test.
                    </p>
                  </div>
                </div>
              </button>
            </div>

            {/* Due date (optional) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Due Date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <Input
                type="date"
                value={formData.due_date}
                onChange={(e) => handleChange('due_date', e.target.value)}
              />
            </div>

            {/* Student list — only shown when 'selected' mode */}
            {assignmentMode === 'selected' && (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {formData.assigned_students.length} of {students.length} selected
                  </p>
                  <Button variant="outline" size="sm" onClick={handleSelectAllStudents}>
                    {formData.assigned_students.length === students.length ? 'Deselect All' : 'Select All'}
                  </Button>
                </div>

                {errors.assigned_students && (
                  <p className="text-sm text-red-600">{errors.assigned_students}</p>
                )}

                <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {students.map(student => {
                      const isSelected = !!formData.assigned_students.find(s => s.id === student.id);
                      return (
                        <div
                          key={student.id}
                          className={`p-4 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer ${isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}
                          onClick={() => handleSelectStudent(student)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-300">
                                {student.full_name?.charAt(0) || student.first_name?.[0]}
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {student.full_name || `${student.first_name} ${student.last_name}`}
                                </p>
                                <p className="text-xs text-gray-500">{student.email}</p>
                              </div>
                            </div>
                            {isSelected && <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {assignmentMode === 'all' && (
              <div className={`p-4 rounded-lg border ${errors.course_id ? 'bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700' : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'}`}>
                <p className={`text-sm ${errors.course_id ? 'text-red-700 dark:text-red-300' : 'text-green-800 dark:text-green-300'}`}>
                  {errors.course_id
                    ? `⚠ ${errors.course_id}`
                    : '✓ When published, this test will be automatically sent to all students enrolled in the selected course.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        {currentStep > 1 && (
          <Button variant="outline" onClick={handleBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        )}
        <div className="ml-auto flex gap-3">
          {currentStep < 4 ? (
            <Button onClick={handleNext}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => handleSubmit('draft')}
                disabled={loading}
              >
                Save as Draft
              </Button>
              <Button
                onClick={() => handleSubmit('published')}
                disabled={loading}
              >
                {loading ? 'Publishing...' : 'Publish Test'}
                <Check className="w-4 h-4 ml-2" />
              </Button>
            </>
          )}
        </div>
      </div>
      </Container>
    </>
  );
}
