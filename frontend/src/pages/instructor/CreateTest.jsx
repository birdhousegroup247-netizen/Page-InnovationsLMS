import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  assignedTestsAPI,
  categoriesAPI,
  coursesAPI,
  questionsAPI,
} from '../../lib/api';
import {
  FileCheck,
  ArrowLeft,
  ArrowRight,
  Check,
  Search,
  Filter,
  X,
  Plus,
  Trash2,
  Clock,
  Award,
  Users,
  BookOpen,
  Info,
  HelpCircle,
  Settings,
} from 'lucide-react';
import { Container } from '../../components/layout';
import { Button, Spinner } from '../../components/ui';
import { cn } from '../../utils/cn';

const STEPS = [
  { title: 'Basic Info', icon: Info },
  { title: 'Questions', icon: HelpCircle },
  { title: 'Settings', icon: Settings },
  { title: 'Assign Students', icon: Users },
];

export default function CreateTest() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [courses, setCourses] = useState([]);
  const [availableQuestions, setAvailableQuestions] = useState([]);
  const [students, setStudents] = useState([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Test configuration state
  const [testData, setTestData] = useState({
    title: '',
    description: '',
    category_id: '',
    course_id: '',
    difficulty: 'medium',
    time_limit_minutes: 60,
    total_points: 100,
    passing_score: 70,
    max_attempts: 1,
    start_date: '',
    due_date: '',
    instructions: '',
  });

  const [selectedQuestions, setSelectedQuestions] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);

  // Question search/filter state
  const [questionFilters, setQuestionFilters] = useState({
    search: '',
    category: '',
    difficulty: '',
    type: '',
  });

  useEffect(() => {
    if (user && user.role !== 'instructor') {
      navigate('/dashboard');
      return;
    }

    fetchInitialData();
  }, [user]);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [categoriesRes, coursesRes] = await Promise.all([
        categoriesAPI.getAll(),
        coursesAPI.getInstructorCourses(),
      ]);

      setCategories(categoriesRes.data.data.categories || []);
      setCourses(coursesRes.data.data.courses || []);
    } catch (error) {
      console.error('Failed to load initial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    setLoadingQuestions(true);
    try {
      const params = {
        is_approved: true,
        ...questionFilters,
      };

      const response = await questionsAPI.getApproved(params);
      setAvailableQuestions(response.data.data.questions || []);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  const fetchStudents = async (courseId) => {
    if (!courseId) return;

    setLoadingStudents(true);
    try {
      const response = await coursesAPI.getCourseEnrollments(courseId);
      setStudents(response.data.data.enrollments || []);
    } catch (error) {
      console.error('Failed to load students:', error);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (currentStep === 1) {
      fetchQuestions();
    }
  }, [currentStep, questionFilters]);

  useEffect(() => {
    if (currentStep === 2 && testData.course_id) {
      fetchStudents(testData.course_id);
    }
  }, [currentStep, testData.course_id]);

  const handleInputChange = (field, value) => {
    setTestData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const toggleQuestionSelection = (question) => {
    setSelectedQuestions((prev) => {
      const exists = prev.find((q) => q.id === question.id);
      if (exists) {
        return prev.filter((q) => q.id !== question.id);
      } else {
        return [...prev, question];
      }
    });
  };

  const toggleStudentSelection = (studentId) => {
    setSelectedStudents((prev) => {
      if (prev.includes(studentId)) {
        return prev.filter((id) => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const selectAllStudents = () => {
    setSelectedStudents(students.map((s) => s.student_id));
  };

  const deselectAllStudents = () => {
    setSelectedStudents([]);
  };

  const validateStep = () => {
    switch (currentStep) {
      case 0: // Test Details
        if (!testData.title.trim()) {
          alert('Please enter a test title');
          return false;
        }
        if (!testData.category_id) {
          alert('Please select a category');
          return false;
        }
        if (!testData.course_id) {
          alert('Please select a course');
          return false;
        }
        if (testData.time_limit_minutes < 1) {
          alert('Time limit must be at least 1 minute');
          return false;
        }
        if (testData.total_points < 1) {
          alert('Total points must be at least 1');
          return false;
        }
        if (testData.passing_score < 0 || testData.passing_score > 100) {
          alert('Passing score must be between 0 and 100');
          return false;
        }
        return true;

      case 1: // Add Questions
        if (selectedQuestions.length === 0) {
          alert('Please select at least one question');
          return false;
        }
        return true;

      case 2: // Assign Students
        if (selectedStudents.length === 0) {
          alert('Please select at least one student');
          return false;
        }
        if (!testData.start_date) {
          alert('Please set a start date');
          return false;
        }
        if (!testData.due_date) {
          alert('Please set a due date');
          return false;
        }
        if (new Date(testData.due_date) <= new Date(testData.start_date)) {
          alert('Due date must be after start date');
          return false;
        }
        return true;

      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep()) {
      setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
    }
  };

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    if (!validateStep()) return;

    setSubmitting(true);
    try {
      // Step 1: Create the test
      const testPayload = {
        title: testData.title,
        description: testData.description,
        category_id: testData.category_id,
        course_id: testData.course_id,
        difficulty: testData.difficulty,
        time_limit_minutes: parseInt(testData.time_limit_minutes),
        total_points: parseInt(testData.total_points),
        passing_score: parseInt(testData.passing_score),
        max_attempts: parseInt(testData.max_attempts),
        instructions: testData.instructions,
      };

      const createResponse = await assignedTestsAPI.createTest(testPayload);
      const testId = createResponse.data.data.test.id;

      // Step 2: Add questions to the test
      const questionsPayload = {
        question_ids: selectedQuestions.map((q) => q.id),
      };
      await assignedTestsAPI.addQuestionsToTest(testId, questionsPayload);

      // Step 3: Assign test to students
      const assignPayload = {
        student_ids: selectedStudents,
        start_date: testData.start_date,
        due_date: testData.due_date,
      };
      await assignedTestsAPI.assignTestToStudents(testId, assignPayload);

      // Success - redirect to tests list
      navigate('/instructor/tests', {
        state: { message: 'Test created and assigned successfully!' },
      });
    } catch (error) {
      console.error('Failed to create test:', error);
      const errorMessage =
        error.response?.data?.message || 'Failed to create test. Please try again.';
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStepContent = () => {
    if (currentStep === 0) {
      return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Title */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Test Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={testData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            placeholder="e.g., Midterm Exam - Database Design"
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Category <span className="text-red-500">*</span>
          </label>
          <select
            value={testData.category_id}
            onChange={(e) => handleInputChange('category_id', e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          >
            <option value="">Select a category</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {/* Course */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Course <span className="text-red-500">*</span>
          </label>
          <select
            value={testData.course_id}
            onChange={(e) => handleInputChange('course_id', e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          >
            <option value="">Select a course</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </div>

        {/* Difficulty */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Difficulty Level
          </label>
          <select
            value={testData.difficulty}
            onChange={(e) => handleInputChange('difficulty', e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          >
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>

        {/* Time Limit */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Time Limit (minutes) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={testData.time_limit_minutes}
            onChange={(e) => handleInputChange('time_limit_minutes', e.target.value)}
            min="1"
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          />
        </div>

        {/* Total Points */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Total Points <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={testData.total_points}
            onChange={(e) => handleInputChange('total_points', e.target.value)}
            min="1"
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          />
        </div>

        {/* Passing Score */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Passing Score (%) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={testData.passing_score}
            onChange={(e) => handleInputChange('passing_score', e.target.value)}
            min="0"
            max="100"
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          />
        </div>

        {/* Max Attempts */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Maximum Attempts
          </label>
          <input
            type="number"
            value={testData.max_attempts}
            onChange={(e) => handleInputChange('max_attempts', e.target.value)}
            min="1"
            max="10"
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          />
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Description
          </label>
          <textarea
            value={testData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            rows="3"
            placeholder="Describe what this test covers..."
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          />
        </div>

        {/* Instructions */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Instructions for Students
          </label>
          <textarea
            value={testData.instructions}
            onChange={(e) => handleInputChange('instructions', e.target.value)}
            rows="4"
            placeholder="Special instructions, allowed resources, etc..."
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          />
        </div>
      </div>
    </div>
      );
    }

    if (currentStep === 1) {
      return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="text"
                value={questionFilters.search}
                onChange={(e) =>
                  setQuestionFilters((prev) => ({ ...prev, search: e.target.value }))
                }
                placeholder="Search questions..."
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-dark-600 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
              />
            </div>
          </div>

          {/* Difficulty Filter */}
          <div>
            <select
              value={questionFilters.difficulty}
              onChange={(e) =>
                setQuestionFilters((prev) => ({ ...prev, difficulty: e.target.value }))
              }
              className="w-full px-4 py-2 bg-white dark:bg-dark-600 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
            >
              <option value="">All Difficulties</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          {/* Type Filter */}
          <div>
            <select
              value={questionFilters.type}
              onChange={(e) =>
                setQuestionFilters((prev) => ({ ...prev, type: e.target.value }))
              }
              className="w-full px-4 py-2 bg-white dark:bg-dark-600 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
            >
              <option value="">All Types</option>
              <option value="multiple_choice">Multiple Choice</option>
              <option value="true_false">True/False</option>
              <option value="fill_blank">Fill in the Blank</option>
            </select>
          </div>
        </div>
      </div>

      {/* Selected Questions Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
          {selectedQuestions.length} question(s) selected
        </p>
      </div>

      {/* Questions List */}
      {loadingQuestions ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : availableQuestions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400">
          No questions found. Try adjusting your filters.
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {availableQuestions.map((question) => {
            const isSelected = selectedQuestions.find((q) => q.id === question.id);
            return (
              <div
                key={question.id}
                onClick={() => toggleQuestionSelection(question)}
                className={cn(
                  'p-4 border rounded-lg cursor-pointer transition-all',
                  isSelected
                    ? 'bg-brand-blue/10 border-brand-blue dark:border-brand-blue'
                    : 'bg-white dark:bg-dark-800 border-gray-200 dark:border-border-dark hover:border-brand-blue'
                )}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5',
                      isSelected
                        ? 'bg-brand-blue border-brand-blue'
                        : 'border-gray-300 dark:border-gray-600'
                    )}
                  >
                    {isSelected && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary">
                      {question.question_text}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500 dark:text-gray-400">
                      <span
                        className={cn(
                          'px-2 py-0.5 rounded-full',
                          question.difficulty === 'easy' &&
                            'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
                          question.difficulty === 'medium' &&
                            'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
                          question.difficulty === 'hard' &&
                            'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                        )}
                      >
                        {question.difficulty}
                      </span>
                      <span className="capitalize">{question.type?.replace('_', ' ')}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
      );
    }

    if (currentStep === 2) {
      return (
    <div className="space-y-6">
      {/* Date Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Start Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={testData.start_date}
            onChange={(e) => handleInputChange('start_date', e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Due Date & Time <span className="text-red-500">*</span>
          </label>
          <input
            type="datetime-local"
            value={testData.due_date}
            onChange={(e) => handleInputChange('due_date', e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          />
        </div>
      </div>

      {/* Student Selection */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <label className="text-sm font-medium text-gray-700 dark:text-text-dark-primary">
            Select Students <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={selectAllStudents}
              className="text-sm text-brand-blue hover:text-brand-blue-600 font-medium"
            >
              Select All
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              onClick={deselectAllStudents}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
            >
              Deselect All
            </button>
          </div>
        </div>

        {/* Selected Count */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
            {selectedStudents.length} student(s) selected
          </p>
        </div>

        {/* Students List */}
        {loadingStudents ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            No students enrolled in this course.
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-border-dark rounded-lg p-4">
            {students.map((enrollment) => {
              const isSelected = selectedStudents.includes(enrollment.student_id);
              return (
                <label
                  key={enrollment.student_id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors',
                    isSelected
                      ? 'bg-brand-blue/10 border border-brand-blue dark:border-brand-blue'
                      : 'hover:bg-gray-50 dark:hover:bg-dark-700'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleStudentSelection(enrollment.student_id)}
                    className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary">
                      {enrollment.student_name || `Student ${enrollment.student_id}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {enrollment.student_email}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>
    </div>
      );
    }

    if (currentStep === 3) {
      const selectedCourse = courses.find((c) => c.id === parseInt(testData.course_id));
      const selectedCategory = categories.find((c) => c.id === parseInt(testData.category_id));

      return (
      <div className="space-y-6">
        {/* Test Details Summary */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-border-dark p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-brand-blue" />
            Test Details
          </h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600 dark:text-gray-400">Title:</span>
              <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                {testData.title}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Category:</span>
              <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                {selectedCategory?.name}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Course:</span>
              <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                {selectedCourse?.title}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Difficulty:</span>
              <p className="font-medium text-gray-900 dark:text-text-dark-primary capitalize">
                {testData.difficulty}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Time Limit:</span>
              <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                {testData.time_limit_minutes} minutes
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Total Points:</span>
              <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                {testData.total_points}
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Passing Score:</span>
              <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                {testData.passing_score}%
              </p>
            </div>
            <div>
              <span className="text-gray-600 dark:text-gray-400">Max Attempts:</span>
              <p className="font-medium text-gray-900 dark:text-text-dark-primary">
                {testData.max_attempts}
              </p>
            </div>
          </div>
        </div>

        {/* Questions Summary */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-border-dark p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-brand-purple" />
            Questions ({selectedQuestions.length})
          </h3>
          <div className="space-y-2">
            {selectedQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-dark-700 rounded-lg"
              >
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {idx + 1}.
                </span>
                <p className="text-sm text-gray-900 dark:text-text-dark-primary flex-1">
                  {q.question_text}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Assignment Summary */}
        <div className="bg-white dark:bg-dark-800 rounded-lg border border-gray-200 dark:border-border-dark p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-text-dark-primary mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            Assignment Details
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Start Date:</span>
              <span className="font-medium text-gray-900 dark:text-text-dark-primary">
                {testData.start_date
                  ? new Date(testData.start_date).toLocaleString()
                  : 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Due Date:</span>
              <span className="font-medium text-gray-900 dark:text-text-dark-primary">
                {testData.due_date ? new Date(testData.due_date).toLocaleString() : 'Not set'}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Students:</span>
              <span className="font-medium text-gray-900 dark:text-text-dark-primary">
                {selectedStudents.length} student(s)
              </span>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 rounded-lg p-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-400">
            Please review all details carefully. Once created, some settings cannot be changed.
          </p>
        </div>
      </div>
      );
    }

    return null;
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <button
              onClick={() => navigate('/instructor/tests')}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Tests
            </button>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <FileCheck className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  Create Test
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  Configure your test settings
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8">
        {loading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <>
            {/* Stepper */}
            <div className="mb-8">
              <div className="flex items-center justify-between max-w-4xl mx-auto">
                {STEPS.map((step, index) => {
                  const StepIcon = step.icon;
                  const isActive = index === currentStep;
                  const isCompleted = index < currentStep;

                  return (
                    <div key={step.title} className="flex flex-col items-center flex-1 relative">
                      {/* Connector Line */}
                      {index < STEPS.length - 1 && (
                        <div
                          className={cn(
                            'absolute top-6 left-1/2 h-0.5 w-full transition-colors',
                            isCompleted ? 'bg-brand-blue' : 'bg-gray-300 dark:bg-gray-600'
                          )}
                        />
                      )}

                      {/* Step Circle */}
                      <div className="relative z-10 mb-2">
                        <div
                          className={cn(
                            'w-12 h-12 rounded-full flex items-center justify-center transition-all',
                            isActive
                              ? 'bg-brand-blue text-white shadow-lg scale-110'
                              : isCompleted
                              ? 'bg-brand-blue text-white'
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                          )}
                        >
                          <StepIcon className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Step Label */}
                      <span
                        className={cn(
                          'text-sm font-medium text-center transition-colors',
                          isActive
                            ? 'text-brand-blue'
                            : isCompleted
                            ? 'text-gray-700 dark:text-gray-300'
                            : 'text-gray-500 dark:text-gray-400'
                        )}
                      >
                        {step.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Step Content */}
            <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6 mb-6">
              {renderStepContent()}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                leftIcon={<ArrowLeft className="h-4 w-4" />}
                onClick={handleBack}
                disabled={currentStep === 0}
              >
                Back
              </Button>

              {currentStep < STEPS.length - 1 ? (
                <Button
                  variant="primary"
                  rightIcon={<ArrowRight className="h-4 w-4" />}
                  onClick={handleNext}
                >
                  Next
                </Button>
              ) : (
                <Button
                  variant="primary"
                  rightIcon={<Check className="h-4 w-4" />}
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Creating Test...' : 'Create Test'}
                </Button>
              )}
            </div>
          </>
        )}
      </Container>
    </>
  );
}
