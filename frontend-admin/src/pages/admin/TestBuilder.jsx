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
import { adminTestsAPI, adminQuestionsAPI, coursesAPI, adminUsersAPI } from '../../lib/api';
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

  // Form data
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    course_id: '',
    due_date: '',
    time_limit_minutes: 60,
    passing_score: 70,
    max_attempts: 1,
    shuffle_questions: true,
    shuffle_options: true,
    show_results_immediately: true,
    show_correct_answers: true,
    show_explanations: true,
    questions: [],
    assigned_students: []
  });

  // Selection method for questions
  const [selectionMethod, setSelectionMethod] = useState('manual'); // 'manual' or 'auto'

  // Manual selection filter
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

  const fetchQuestions = async (courseFilter = null) => {
    try {
      const params = { limit: 1000, is_approved: 'true' };

      // Add course filter if provided
      if (courseFilter && courseFilter.length > 0) {
        params.courses = courseFilter.join(',');
      }

      const response = await adminQuestionsAPI.getAll(params);
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
        title: test.title || '',
        description: test.description || '',
        course_id: test.course_id || '',
        due_date: test.due_date ? test.due_date.split('T')[0] : '',
        time_limit_minutes: test.time_limit_minutes || 60,
        passing_score: test.passing_score || 70,
        max_attempts: test.max_attempts || 1,
        shuffle_questions: test.shuffle_questions ?? true,
        shuffle_options: test.shuffle_options ?? true,
        show_results_immediately: test.show_results_immediately ?? true,
        show_correct_answers: test.show_correct_answers ?? true,
        show_explanations: test.show_explanations ?? true,
        questions: test.questions || [],
        assigned_students: test.assigned_students || []
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
      if (!formData.title.trim()) {
        newErrors.title = 'Test title is required';
      }
      if (!formData.course_id) {
        newErrors.course_id = 'Please select a course';
      }
      if (!formData.due_date) {
        newErrors.due_date = 'Due date is required';
      }
    }

    if (step === 2) {
      if (formData.questions.length === 0) {
        newErrors.questions = 'Please select at least one question';
      }
    }

    if (step === 4) {
      if (formData.assigned_students.length === 0) {
        newErrors.assigned_students = 'Please assign at least one student';
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

  const handleSubmit = async (status = 'draft') => {
    if (!validateStep(4)) {
      showToast('Please fix the errors before submitting', 'error');
      return;
    }

    setLoading(true);

    try {
      const testData = {
        ...formData,
        status,
        question_ids: formData.questions.map(q => q.id),
        student_ids: formData.assigned_students.map(s => s.id)
      };

      let response;
      if (isEditing) {
        response = await adminTestsAPI.update(testId, testData);
        showToast('Test updated successfully', 'success');
      } else {
        response = await adminTestsAPI.create(testData);
        const createdTest = response.data.data;

        // Add questions to test
        if (testData.question_ids.length > 0) {
          await adminTestsAPI.addQuestions(createdTest.id, {
            question_ids: testData.question_ids
          });
        }

        // Assign students
        if (testData.student_ids.length > 0) {
          await adminTestsAPI.assignStudents(createdTest.id, {
            student_ids: testData.student_ids
          });
        }

        showToast('Test created successfully', 'success');
      }

      setTimeout(() => {
        navigate('/tests');
      }, 1500);
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
      {/* Header */}
      <div className="bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <Button
              variant="outline"
              onClick={() => navigate('/tests')}
              className="mb-4 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white border border-white/30"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Tests
            </Button>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  {isEditing ? 'Edit Test' : 'Create New Test'}
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  {isEditing ? 'Update test configuration and settings' : 'Build and configure your test step by step'}
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">

      {/* Progress Steps */}
      <div className="bg-white dark:bg-dark-800 rounded-lg shadow-md p-6 mb-6">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = currentStep === step.number;
            const isCompleted = currentStep > step.number;

            return (
              <div key={step.number} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center mb-2 ${
                      isActive
                        ? 'bg-blue-600 dark:bg-blue-500 text-white'
                        : isCompleted
                        ? 'bg-green-500 dark:bg-green-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <p
                    className={`text-sm font-medium ${
                      isActive
                        ? 'text-blue-600 dark:text-blue-400'
                        : isCompleted
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-gray-500'
                    }`}
                  >
                    {step.title}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-4 ${
                      currentStep > step.number
                        ? 'bg-green-500'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                )}
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
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder="e.g., Week 5 Quiz - JavaScript Fundamentals"
                className={errors.title ? 'border-red-500' : ''}
              />
              {errors.title && (
                <p className="mt-1 text-sm text-red-600">{errors.title}</p>
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Due Date *
                </label>
                <Input
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => handleChange('due_date', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className={errors.due_date ? 'border-red-500' : ''}
                />
                {errors.due_date && (
                  <p className="mt-1 text-sm text-red-600">{errors.due_date}</p>
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
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Select Questions
            </h2>

            {/* Selection Method */}
            <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Selection Method
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectionMethod('manual')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectionMethod === 'manual'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">Manual Selection</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Choose specific questions from the question bank
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectionMethod('auto')}
                  className={`p-4 rounded-lg border-2 transition-colors ${
                    selectionMethod === 'auto'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  <p className="font-medium text-gray-900 dark:text-white">Auto-Generate</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Randomly select questions by difficulty and category
                  </p>
                </button>
              </div>
            </div>

            {/* Auto-Selection Config */}
            {selectionMethod === 'auto' && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900 dark:text-white">
                  Auto-Generation Settings
                </h3>

                {/* Multi-Course Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Courses *
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-white dark:bg-dark-800">
                    {courses.map(course => (
                      <label
                        key={course.id}
                        className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-dark-700 rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={autoConfig.selected_courses.includes(course.id)}
                          onChange={(e) => {
                            const newCourses = e.target.checked
                              ? [...autoConfig.selected_courses, course.id]
                              : autoConfig.selected_courses.filter(id => id !== course.id);
                            handleAutoConfigChange('selected_courses', newCourses);
                          }}
                          className="w-4 h-4 text-blue-600 dark:text-blue-500 bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
                        />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {course.title}
                        </span>
                      </label>
                    ))}
                  </div>
                  {autoConfig.selected_courses.length > 0 && (
                    <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                      ✓ Mixing {autoConfig.selected_courses.length} course(s): {
                        courses
                          .filter(c => autoConfig.selected_courses.includes(c.id))
                          .map(c => c.title)
                          .join(', ')
                      }
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Select one or multiple courses to mix questions
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Category (Optional)
                  </label>
                  <Select
                    value={autoConfig.category_id}
                    onChange={(e) => handleAutoConfigChange('category_id', e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Difficulty Distribution
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Easy
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={autoConfig.difficulty.easy}
                        onChange={(e) => handleAutoConfigChange('difficulty.easy', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Medium
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={autoConfig.difficulty.medium}
                        onChange={(e) => handleAutoConfigChange('difficulty.medium', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Hard
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={autoConfig.difficulty.hard}
                        onChange={(e) => handleAutoConfigChange('difficulty.hard', e.target.value)}
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    Total: {autoConfig.total_questions} questions
                  </p>
                </div>

                <Button onClick={handleAutoSelectQuestions} className="w-full">
                  Generate Questions
                </Button>
              </div>
            )}

            {/* Selected Questions Summary */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Selected Questions
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.questions.length} question(s) selected
                  </p>
                </div>
                {formData.questions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFormData(prev => ({ ...prev, questions: [] }))}
                  >
                    Clear All
                  </Button>
                )}
              </div>
            </div>

            {errors.questions && (
              <p className="text-sm text-red-600">{errors.questions}</p>
            )}

            {/* Manual Question List */}
            {selectionMethod === 'manual' && (
              <>
                {/* Filter Controls */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Search questions..."
                      value={manualFilter.search}
                      onChange={(e) => setManualFilter(prev => ({ ...prev, search: e.target.value }))}
                    />
                  </div>
                  <div className="w-64">
                    <Select
                      value={manualFilter.course_id}
                      onChange={(e) => setManualFilter(prev => ({ ...prev, course_id: e.target.value }))}
                    >
                      <option value="">All Courses</option>
                      {courses.map(course => (
                        <option key={course.id} value={course.id}>{course.title}</option>
                      ))}
                    </Select>
                  </div>
                </div>

                <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {questions
                      .filter(q => {
                        // Filter by course
                        if (manualFilter.course_id && q.course_id !== parseInt(manualFilter.course_id)) {
                          return false;
                        }
                        // Filter by search
                        if (manualFilter.search && !q.question_text.toLowerCase().includes(manualFilter.search.toLowerCase())) {
                          return false;
                        }
                        return true;
                      })
                      .map(question => {
                    const isSelected = formData.questions.find(q => q.id === question.id);
                    return (
                      <div
                        key={question.id}
                        className={`p-4 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer ${
                          isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                        }`}
                        onClick={() => handleSelectQuestion(question)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {question.question_text}
                            </p>
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              {question.course && (
                                <Badge color="purple">
                                  📚 {question.course.title}
                                </Badge>
                              )}
                              <Badge
                                color={
                                  question.difficulty === 'easy'
                                    ? 'green'
                                    : question.difficulty === 'medium'
                                    ? 'yellow'
                                    : 'red'
                                }
                              >
                                {question.difficulty}
                              </Badge>
                              <Badge color="blue">
                                {question.question_type.replace('_', ' ')}
                              </Badge>
                              <span className="text-xs text-gray-500">
                                {question.marks} mark(s)
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <CheckCircle className="w-5 h-5 text-blue-600 ml-4" />
                          )}
                        </div>
                      </div>
                    );
                      })}
                  </div>
                </div>
              </>
            )}

            {/* Selected Questions List */}
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
                  checked={formData.shuffle_questions}
                  onChange={(e) => handleChange('shuffle_questions', e.target.checked)}
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
                  checked={formData.shuffle_options}
                  onChange={(e) => handleChange('shuffle_options', e.target.checked)}
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

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">
                    Selected Students
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {formData.assigned_students.length} student(s) selected
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAllStudents}
                >
                  {formData.assigned_students.length === students.length
                    ? 'Deselect All'
                    : 'Select All'}
                </Button>
              </div>
            </div>

            {errors.assigned_students && (
              <p className="text-sm text-red-600">{errors.assigned_students}</p>
            )}

            <div className="max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {students.map(student => {
                  const isSelected = formData.assigned_students.find(s => s.id === student.id);
                  return (
                    <div
                      key={student.id}
                      className={`p-4 hover:bg-gray-50 dark:hover:bg-dark-700 cursor-pointer ${
                        isSelected ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                      onClick={() => handleSelectStudent(student)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {student.first_name?.[0]}{student.last_name?.[0]}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {student.email}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
