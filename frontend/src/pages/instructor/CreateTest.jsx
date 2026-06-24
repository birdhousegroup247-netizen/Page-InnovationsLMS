import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import {
  assignedTestsAPI,
  categoriesAPI,
  coursesAPI,
  instructorAPI,
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
    // Display + scoring toggles — defaulted to "useful defaults" so a
    // quick test still feels right out of the box, but the instructor
    // can flip any of these in the Settings step.
    randomize_questions: true,
    randomize_options: true,
    show_results_immediately: true,
    show_correct_answers: true,
    show_explanations: true,
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

  // Step-2 course narrowing. 'all' = whole category pool, 'general' =
  // questions with no course_id (category-wide), or a specific course id.
  // Defaults to whatever the instructor picked in Step 1 (or 'all' if none).
  const [courseFilter, setCourseFilter] = useState('all');

  // Step-3 student picker state. 'all-mine' pools every instructor
  // course (broadest), 'category' is just courses in the test's
  // category, or a specific course id. Plus a search term over name/email.
  const [studentCourseFilter, setStudentCourseFilter] = useState('category');
  const [studentSearch, setStudentSearch] = useState('');

  useEffect(() => {
    // Note: Role check is handled by InstructorRoute wrapper in App.jsx
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
      // Category is the primary organizer now (required on QuestionModal,
      // required in Step 1 of this wizard). Course is optional metadata
      // — a question with no course belongs to the whole category, a
      // question with a course belongs to that course only. We fetch
      // the full category pool here and narrow further on the client
      // via courseFilter + search/difficulty/type — that way switching
      // the course filter is instant and we can show accurate per-course
      // counts in the dropdown.
      const params = {
        is_approved: true,
        category: testData.category_id || undefined,
        search: questionFilters.search || undefined,
        difficulty: questionFilters.difficulty || undefined,
        type: questionFilters.type || undefined,
        limit: 200,
      };

      const response = await questionsAPI.getApproved(params);
      setAvailableQuestions(response.data.data.questions || []);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Pulls every enrollment across the instructor's courses in one
  // backend call (/api/courses/my/students). Each row from the API is
  // an enrollment with eager-loaded student + course, so we dedupe by
  // student_id and collect a `courses` array per student so the picker
  // can show what they're enrolled in. The previous approach fanned
  // out N parallel /enrollments calls — slow, and the per-course
  // endpoint silently swallowed permissions errors which is why the
  // picker came up empty.
  const [studentsError, setStudentsError] = useState('');
  const fetchStudents = async () => {
    setLoadingStudents(true);
    setStudentsError('');
    try {
      // Primary path: single backend call that returns enrollments
      // across every instructor course. If that returns nothing, fall
      // back to the per-course endpoint so we still surface students
      // even if /my/students has a permissions edge case.
      let rows = [];
      try {
        const response = await coursesAPI.getInstructorStudents();
        rows = response?.data?.data?.students || [];
        console.log('[CreateTest] /my/students rows:', rows.length, rows);
      } catch (err) {
        console.warn('[CreateTest] /my/students failed, falling back', err);
        rows = [];
      }

      if (rows.length === 0 && courses && courses.length > 0) {
        // Fallback: fan out per-course to /api/instructor/courses/:id/enrollments
        const responses = await Promise.all(
          courses.map((c) =>
            instructorAPI
              .getCourseEnrollments(c.id)
              .then((r) => ({
                courseId: c.id,
                courseTitle: c.title,
                categoryId: c.category_id,
                ok: true,
                enrollments: r?.data?.data?.enrollments || [],
              }))
              .catch((err) => {
                console.warn(`[CreateTest] getCourseEnrollments(${c.id}) failed`, err?.response?.status, err?.message);
                return {
                  courseId: c.id,
                  courseTitle: c.title,
                  categoryId: c.category_id,
                  ok: false,
                  enrollments: [],
                };
              })
          )
        );
        // Reshape the per-course responses to look like /my/students rows.
        rows = [];
        for (const { courseId, courseTitle, categoryId, enrollments } of responses) {
          for (const e of enrollments) {
            rows.push({
              student_id: e.student_id,
              student_name: e.student_name,
              student_email: e.student_email,
              student: { avatar_url: e.student_avatar },
              course_id: courseId,
              course: { id: courseId, title: courseTitle, category_id: categoryId },
            });
          }
        }
        console.log('[CreateTest] fallback rows:', rows.length);
      }

      const courseCategoryById = new Map(
        (courses || []).map((c) => [c.id, c.category_id])
      );
      const dedup = new Map();
      for (const r of rows) {
        const studentId = r.student_id ?? r.student?.id;
        if (!studentId) continue;
        const cid = r.course_id ?? r.course?.id;
        const courseInfo = {
          id: cid,
          title: r.course?.title || `Course #${cid}`,
          category_id: r.course?.category_id ?? courseCategoryById.get(cid) ?? null,
        };
        const existing = dedup.get(studentId);
        if (existing) {
          if (!existing.courses.some((c) => c.id === courseInfo.id)) {
            existing.courses.push(courseInfo);
          }
        } else {
          dedup.set(studentId, {
            student_id: studentId,
            student_name: r.student?.full_name || r.student_name,
            student_email: r.student?.email || r.student_email,
            student_avatar: r.student?.avatar_url || r.student_avatar || r.student?.profile_picture,
            courses: [courseInfo],
          });
        }
      }
      setStudents(Array.from(dedup.values()));
    } catch (error) {
      console.error('Failed to load students:', error);
      setStudentsError(error?.response?.data?.message || error?.message || 'Could not load students');
      setStudents([]);
    } finally {
      setLoadingStudents(false);
    }
  };

  useEffect(() => {
    if (currentStep === 1) {
      fetchQuestions();
    }
  }, [currentStep, questionFilters, testData.category_id]);

  // When the instructor picks a course in Step 1, default Step 2's
  // course filter to that course so they see the narrow pool first.
  // 'all' if no course was selected.
  useEffect(() => {
    setCourseFilter(testData.course_id ? String(testData.course_id) : 'all');
  }, [testData.course_id]);

  useEffect(() => {
    if (currentStep === 2) {
      fetchStudents();
    }
  }, [currentStep, courses]);

  // Default the student filter to the test's chosen scope on first
  // arrival at Step 3: a course-scoped test → that course;
  // category-scoped → "category"; nothing → "all-mine".
  useEffect(() => {
    if (testData.course_id) {
      setStudentCourseFilter(String(testData.course_id));
    } else if (testData.category_id) {
      setStudentCourseFilter('category');
    } else {
      setStudentCourseFilter('all-mine');
    }
  }, [testData.course_id, testData.category_id]);

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
        // Course is optional — leaving it blank scopes the test to the
        // whole category so it covers general questions plus questions
        // from any course in the category.
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
      // Step 1: Create the test. Backend's AssignedTest model uses
      // test_name + a unique test_code (both NOT NULL) and end_date,
      // not the title/due_date the wizard renders. Map them here and
      // generate a short unique-ish code from the title + timestamp so
      // the unique constraint doesn't reject duplicate titles.
      const slug = (testData.title || 'test')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 30);
      const testPayload = {
        test_name: testData.title,
        test_code: `${slug || 'test'}-${Date.now().toString(36)}`,
        description: testData.description,
        course_id: testData.course_id || null,
        time_limit_minutes: parseInt(testData.time_limit_minutes),
        passing_score: parseInt(testData.passing_score),
        max_attempts: parseInt(testData.max_attempts),
        total_questions: selectedQuestions.length,
        start_date: testData.start_date || null,
        end_date: testData.due_date || null,
        randomize_questions: !!testData.randomize_questions,
        randomize_options: !!testData.randomize_options,
        show_results_immediately: !!testData.show_results_immediately,
        show_correct_answers: !!testData.show_correct_answers,
        show_explanations: !!testData.show_explanations,
        // Publish straight away so Step 3 (assignment) doesn't bounce
        // with "Only published tests can be assigned". The backend
        // accepts status on create.
        status: 'published',
      };

      const createResponse = await assignedTestsAPI.createTest(testPayload);
      const testId = createResponse.data.data.test.id;

      // Step 2: Add questions to the test
      const questionsPayload = {
        question_ids: selectedQuestions.map((q) => q.id),
      };
      await assignedTestsAPI.addQuestionsToTest(testId, questionsPayload);

      // Step 3: Assign test to students. Backend's assign endpoint
      // takes due_date directly (matches our state name).
      const assignPayload = {
        student_ids: selectedStudents,
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

        {/* Course (optional — narrows the question pool) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Course <span className="text-gray-400 text-xs font-normal">(optional)</span>
          </label>
          <select
            value={testData.course_id}
            onChange={(e) => handleInputChange('course_id', e.target.value)}
            className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          >
            <option value="">All courses (general test for this category)</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500 dark:text-text-dark-muted">
            Leave blank to pull from every question in this category. Pick a course to limit the pool to that course only.
          </p>
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

        {/* Display & scoring options — surfaced here so they're not a
            hidden setting only visible after creation. Defaults are
            sensible for a quick test; instructors can flip any of
            them. Matches the same set on EditTest so updates feel
            symmetric. */}
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
            Display & scoring
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 dark:bg-dark-700 rounded-lg p-4">
            {[
              { key: 'randomize_questions', label: 'Randomize question order' },
              { key: 'randomize_options', label: 'Randomize answer options' },
              { key: 'show_results_immediately', label: 'Show results immediately after submit' },
              { key: 'show_correct_answers', label: 'Show correct answers on review' },
              { key: 'show_explanations', label: 'Show explanations on review' },
            ].map((opt) => (
              <label key={opt.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-text-dark-primary">
                <input
                  type="checkbox"
                  checked={!!testData[opt.key]}
                  onChange={(e) => handleInputChange(opt.key, e.target.checked)}
                  className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
      );
    }

    if (currentStep === 1) {
      // Build the course-breakdown straight from the question pool so
      // we include every course represented in the bank — not just the
      // instructor's own. Admin-created questions or co-instructor
      // questions might point at courses outside the instructor's list,
      // but they're still valid options for the test pool. We grab the
      // title from question.course (eager-loaded on the backend).
      const courseBreakdown = (() => {
        const map = new Map(); // id -> { title, count }
        let general = 0;
        for (const q of availableQuestions) {
          if (q.course_id) {
            const existing = map.get(q.course_id);
            if (existing) {
              existing.count += 1;
            } else {
              map.set(q.course_id, {
                title: q.course?.title || `Course #${q.course_id}`,
                count: 1,
              });
            }
          } else {
            general += 1;
          }
        }
        return { byCourse: map, general };
      })();

      const displayedQuestions = availableQuestions.filter((q) => {
        if (courseFilter === 'all') return true;
        if (courseFilter === 'general') return !q.course_id;
        return String(q.course_id) === String(courseFilter);
      });

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

        {/* Course narrowing — operates on the already-fetched category pool */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-text-dark-primary whitespace-nowrap">
            Show questions from:
          </label>
          <select
            value={courseFilter}
            onChange={(e) => setCourseFilter(e.target.value)}
            className="flex-1 px-4 py-2 bg-white dark:bg-dark-600 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors"
          >
            <option value="all">
              All courses in this category ({availableQuestions.length})
            </option>
            {courseBreakdown.general > 0 && (
              <option value="general">
                General — no specific course ({courseBreakdown.general})
              </option>
            )}
            {Array.from(courseBreakdown.byCourse.entries())
              .sort((a, b) => a[1].title.localeCompare(b[1].title))
              .map(([courseId, info]) => (
                <option key={courseId} value={String(courseId)}>
                  {info.title} ({info.count})
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Selected Questions Summary */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
          {selectedQuestions.length} question(s) selected
          {courseFilter !== 'all' && (
            <span className="text-blue-600 dark:text-blue-300 font-normal">
              {' '}· showing {displayedQuestions.length} of {availableQuestions.length}
            </span>
          )}
        </p>
      </div>

      {/* Questions List */}
      {loadingQuestions ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : availableQuestions.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-dark-700 mb-3">
            <HelpCircle className="w-6 h-6 text-gray-400" />
          </div>
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            No approved questions in this category yet
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            {questionFilters.search || questionFilters.difficulty || questionFilters.type
              ? 'Clear the filters above to widen the search, or add new questions.'
              : 'Add some questions to this category — then come back to build the test.'}
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            {(questionFilters.search || questionFilters.difficulty || questionFilters.type) && (
              <button
                type="button"
                onClick={() => setQuestionFilters({ search: '', category: '', difficulty: '', type: '' })}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg hover:bg-gray-50 dark:hover:bg-dark-600 transition-colors"
              >
                Clear filters
              </button>
            )}
            <Link
              to="/instructor/contribute-questions"
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add questions
            </Link>
          </div>
        </div>
      ) : displayedQuestions.length === 0 ? (
        <div className="text-center py-10 px-4">
          <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
            No questions match this course filter
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Switch to "All courses" above to see the full category pool, or pick a different course.
          </p>
          <button
            type="button"
            onClick={() => setCourseFilter('all')}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
          >
            Show all courses
          </button>
        </div>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {displayedQuestions.map((question) => {
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
      // Per-course counts so the dropdown shows "Course (12)".
      const studentCourseCounts = (() => {
        const counts = new Map();
        for (const s of students) {
          for (const c of s.courses || []) {
            counts.set(c.id, (counts.get(c.id) || 0) + 1);
          }
        }
        return counts;
      })();

      // Filter students by the picked source.
      const filteredStudents = students.filter((s) => {
        // Source filter
        if (studentCourseFilter === 'all-mine') {
          // nothing to do
        } else if (studentCourseFilter === 'category') {
          const inCategory = (s.courses || []).some(
            (c) => String(c.category_id) === String(testData.category_id)
          );
          if (!inCategory) return false;
        } else {
          // specific course id
          const inCourse = (s.courses || []).some(
            (c) => String(c.id) === String(studentCourseFilter)
          );
          if (!inCourse) return false;
        }
        // Search filter (name OR email)
        if (studentSearch.trim()) {
          const q = studentSearch.trim().toLowerCase();
          const name = (s.student_name || '').toLowerCase();
          const email = (s.student_email || '').toLowerCase();
          if (!name.includes(q) && !email.includes(q)) return false;
        }
        return true;
      });

      const categoryStudentCount = students.filter((s) =>
        (s.courses || []).some(
          (c) => String(c.category_id) === String(testData.category_id)
        )
      ).length;

      const selectAllVisible = () => {
        const ids = filteredStudents.map((s) => s.student_id);
        setSelectedStudents((prev) => Array.from(new Set([...prev, ...ids])));
      };
      const deselectAllVisible = () => {
        const visible = new Set(filteredStudents.map((s) => s.student_id));
        setSelectedStudents((prev) => prev.filter((id) => !visible.has(id)));
      };

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
              type="button"
              onClick={selectAllVisible}
              className="text-sm text-brand-blue hover:text-brand-blue-600 font-medium"
            >
              Select All Visible
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              type="button"
              onClick={deselectAllVisible}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
            >
              Deselect Visible
            </button>
            <span className="text-gray-300 dark:text-gray-600">|</span>
            <button
              type="button"
              onClick={deselectAllStudents}
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 font-medium"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Filters: source + search */}
        <div className="bg-gray-50 dark:bg-dark-700 rounded-lg p-4 mb-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Show students from
            </label>
            <select
              value={studentCourseFilter}
              onChange={(e) => setStudentCourseFilter(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-dark-600 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors text-sm"
            >
              <option value="all-mine">All my courses ({students.length})</option>
              {testData.category_id && categoryStudentCount > 0 && (
                <option value="category">
                  Courses in this category ({categoryStudentCount})
                </option>
              )}
              {courses
                .filter((c) => studentCourseCounts.has(c.id))
                .map((c) => (
                  <option key={c.id} value={String(c.id)}>
                    {c.title} ({studentCourseCounts.get(c.id)})
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
              Search by name or email
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
                placeholder="e.g. anna or anna@..."
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-dark-600 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue transition-colors text-sm"
              />
            </div>
          </div>
        </div>

        {/* Selected Count */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-500/30 rounded-lg p-4 mb-4">
          <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
            {selectedStudents.length} student(s) selected
            <span className="text-blue-600 dark:text-blue-300 font-normal">
              {' '}· showing {filteredStudents.length} of {students.length}
            </span>
          </p>
        </div>

        {/* Students List */}
        {loadingStudents ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : studentsError ? (
          <div className="text-center py-10 px-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-700">
            <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
              Couldn't load students
            </p>
            <p className="text-xs text-red-700 dark:text-red-400 mb-3">
              {studentsError}
            </p>
            <button
              type="button"
              onClick={fetchStudents}
              className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 space-y-1">
            <p className="font-medium text-gray-700 dark:text-gray-300">
              {courses.length === 0
                ? "You don't have any courses yet."
                : 'None of your courses has enrolled students yet.'}
            </p>
            <p className="text-xs">
              {courses.length === 0
                ? 'Create a course first, then come back to assign students.'
                : 'Once a student enrolls, they will show up here.'}
            </p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="text-center py-10 px-4">
            <p className="text-gray-700 dark:text-gray-300 font-medium mb-1">
              No students match these filters
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Switch the source dropdown or clear the search.
            </p>
            <button
              type="button"
              onClick={() => { setStudentCourseFilter('all-mine'); setStudentSearch(''); }}
              className="px-4 py-2 text-sm font-medium text-white bg-brand-blue rounded-lg hover:bg-brand-blue/90 transition-colors"
            >
              Show all my students
            </button>
          </div>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto border border-gray-200 dark:border-border-dark rounded-lg p-4">
            {filteredStudents.map((enrollment) => {
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
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-text-dark-primary truncate">
                      {enrollment.student_name || `Student ${enrollment.student_id}`}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {enrollment.student_email}
                    </p>
                    {enrollment.courses && enrollment.courses.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {enrollment.courses.map((c) => (
                          <span
                            key={c.id}
                            className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-gray-100 dark:bg-dark-600 text-gray-700 dark:text-gray-300"
                          >
                            {c.title}
                          </span>
                        ))}
                      </div>
                    )}
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
