import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, Clock, Award, ArrowLeft, Play } from 'lucide-react';
import { practiceTestsAPI, categoriesAPI, coursesAPI } from '../lib/api';
import { Container } from '../components/layout';
import { Button, Spinner } from '../components/ui';
import { cn } from '../utils/cn';

export default function GeneratePracticeTest() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [config, setConfig] = useState({
    course_ids: [],
    category_ids: [],
    difficulty: {
      easy: 5,
      medium: 10,
      hard: 5
    },
    total_questions: 20,
    time_limit_minutes: 30
  });

  useEffect(() => {
    fetchCourses();
    fetchCategories();
  }, []);

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
      setCategories(response.data.data || []);
    } catch (error) {
      console.error('Failed to fetch categories:', error);
    }
  };

  const handleDifficultyChange = (difficulty, value) => {
    const newDiff = {
      ...config.difficulty,
      [difficulty]: parseInt(value) || 0
    };
    const total = newDiff.easy + newDiff.medium + newDiff.hard;
    setConfig(prev => ({
      ...prev,
      difficulty: newDiff,
      total_questions: total
    }));
  };

  const handleCourseToggle = (courseId) => {
    setConfig(prev => ({
      ...prev,
      course_ids: prev.course_ids.includes(courseId)
        ? prev.course_ids.filter(id => id !== courseId)
        : [...prev.course_ids, courseId]
    }));
  };

  const handleCategoryToggle = (categoryId) => {
    setConfig(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId]
    }));
  };

  const handleGenerate = async () => {
    if (config.total_questions === 0) {
      alert('Please select at least one question');
      return;
    }

    try {
      setGenerating(true);
      const response = await practiceTestsAPI.generate(config);
      const attemptId = response.data.data.attempt_id;
      navigate(`/practice-tests/${attemptId}/take`);
    } catch (error) {
      console.error('Failed to generate practice test:', error);
      alert('Failed to generate practice test. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const presets = [
    { name: 'Quick Quiz', easy: 5, medium: 3, hard: 2, time: 15 },
    { name: 'Standard Test', easy: 5, medium: 10, hard: 5, time: 30 },
    { name: 'Comprehensive Exam', easy: 10, medium: 20, hard: 10, time: 60 },
    { name: 'Challenge Mode', easy: 2, medium: 8, hard: 15, time: 45 },
  ];

  const applyPreset = (preset) => {
    setConfig(prev => ({
      ...prev,
      difficulty: {
        easy: preset.easy,
        medium: preset.medium,
        hard: preset.hard
      },
      total_questions: preset.easy + preset.medium + preset.hard,
      time_limit_minutes: preset.time
    }));
  };

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-purple-600 via-blue-600 to-cyan-600 relative overflow-hidden">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-white/10 rounded-full blur-3xl animate-float-delayed" />

        <div className="relative z-10 py-12 sm:py-16">
          <Container>
            <button
              onClick={() => navigate('/practice-tests')}
              className="inline-flex items-center gap-2 text-white/90 hover:text-white mb-6 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Practice Tests
            </button>
            <div className="flex items-center gap-4 mb-3">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white animate-fade-in">
                  Generate Practice Test
                </h1>
                <p className="text-lg text-white/90 animate-fade-in mt-1">
                  Create a custom test to practice your skills
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8 max-w-4xl">
        {/* Presets */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Quick Presets
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {presets.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="p-4 bg-white dark:bg-dark-800 rounded-xl border-2 border-gray-200 dark:border-gray-700 hover:border-brand-blue dark:hover:border-brand-blue transition-all"
              >
                <p className="font-medium text-gray-900 dark:text-white mb-1">
                  {preset.name}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {preset.easy + preset.medium + preset.hard} questions • {preset.time} min
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Courses */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Select Courses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {courses.map((course) => (
              <label
                key={course.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                  config.course_ids.includes(course.id)
                    ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                )}
              >
                <input
                  type="checkbox"
                  checked={config.course_ids.includes(course.id)}
                  onChange={() => handleCourseToggle(course.id)}
                  className="w-4 h-4 text-brand-blue rounded focus:ring-2 focus:ring-brand-blue"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {course.title}
                </span>
              </label>
            ))}
          </div>
          {config.course_ids.length > 0 && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">
                ✓ Mixing {config.course_ids.length} course(s): {
                  courses
                    .filter(c => config.course_ids.includes(c.id))
                    .map(c => c.title)
                    .join(', ')
                }
              </p>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
            Select one or multiple courses to practice questions from specific topics (MySQL, PostgreSQL, JavaScript, etc.)
          </p>
        </div>

        {/* Categories */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Select Categories (Optional)
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((category) => (
              <label
                key={category.id}
                className={cn(
                  'flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all',
                  config.category_ids.includes(category.id)
                    ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                )}
              >
                <input
                  type="checkbox"
                  checked={config.category_ids.includes(category.id)}
                  onChange={() => handleCategoryToggle(category.id)}
                  className="w-4 h-4 text-brand-blue rounded focus:ring-2 focus:ring-brand-blue"
                />
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {category.name}
                </span>
              </label>
            ))}
          </div>
          {config.category_ids.length === 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-3">
              No categories selected - questions will be from all categories
            </p>
          )}
        </div>

        {/* Difficulty Distribution */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Award className="w-5 h-5" />
            Difficulty Distribution
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Easy Questions
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={config.difficulty.easy}
                onChange={(e) => handleDifficultyChange('easy', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Medium Questions
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={config.difficulty.medium}
                onChange={(e) => handleDifficultyChange('medium', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Hard Questions
              </label>
              <input
                type="number"
                min="0"
                max="50"
                value={config.difficulty.hard}
                onChange={(e) => handleDifficultyChange('hard', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
              />
            </div>
          </div>

          {/* Total Questions */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Total Questions
              </span>
              <span className="text-2xl font-bold text-brand-blue">
                {config.total_questions}
              </span>
            </div>
          </div>
        </div>

        {/* Time Limit */}
        <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Time Limit
          </h2>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Minutes
            </label>
            <input
              type="number"
              min="5"
              max="180"
              value={config.time_limit_minutes}
              onChange={(e) => setConfig(prev => ({
                ...prev,
                time_limit_minutes: parseInt(e.target.value) || 30
              }))}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
            />
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              Recommended: {Math.ceil(config.total_questions * 1.5)} - {config.total_questions * 2} minutes
            </p>
          </div>
        </div>

        {/* Generate Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleGenerate}
            disabled={generating || config.total_questions === 0}
            size="lg"
            className="px-8"
          >
            {generating ? (
              <>
                <Spinner size="sm" className="mr-2" />
                Generating Test...
              </>
            ) : (
              <>
                <Play className="w-5 h-5 mr-2" />
                Generate & Start Test
              </>
            )}
          </Button>
        </div>
      </Container>
    </>
  );
}
