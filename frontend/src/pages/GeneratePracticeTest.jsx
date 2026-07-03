import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, BookOpen, ArrowLeft, Play, CheckCircle, SlidersHorizontal } from 'lucide-react';
import { practiceTestsAPI, enrollmentsAPI } from '../lib/api';
import { Container } from '../components/layout';
import { Button, Spinner } from '../components/ui';
import { cn } from '../utils/cn';
import { useToast } from '../components/ui/Toast';

/**
 * Generate Practice Test — three decisions, nothing else:
 *   1. Which of MY courses (none ticked = all of them)
 *   2. How big (preset cards or custom count/minutes)
 *   3. How hard (mixed / easy / medium / hard)
 *
 * The previous version asked students to pick admin categories they'd
 * never seen and hand-tune an easy/medium/hard distribution the backend
 * didn't even receive. All of that is gone.
 */

const PRESETS = [
  { key: 'quick', name: 'Quick Quiz', questions: 10, minutes: 15, blurb: 'A fast knowledge check' },
  { key: 'standard', name: 'Standard Test', questions: 20, minutes: 30, blurb: 'The everyday practice run' },
  { key: 'comprehensive', name: 'Comprehensive Exam', questions: 40, minutes: 60, blurb: 'Full exam conditions' },
  { key: 'challenge', name: 'Challenge Mode', questions: 25, minutes: 45, blurb: 'Fewer questions, less time each' },
];

const DIFFICULTIES = [
  { value: 'mixed', label: 'Mixed' },
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

export default function GeneratePracticeTest() {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(true);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [preset, setPreset] = useState('standard'); // preset key or 'custom'
  const [questionCount, setQuestionCount] = useState(20);
  const [minutes, setMinutes] = useState(30);
  const [difficulty, setDifficulty] = useState('mixed');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    enrollmentsAPI.getMyCourses()
      .then((response) => {
        const rows = response.data?.data?.enrollments || response.data?.data?.courses || [];
        const list = rows
          .map((e) => ({ id: e.course?.id ?? e.course_id ?? e.id, title: e.course?.title ?? e.title }))
          .filter((c) => c.id && c.title);
        setCourses(list);
      })
      .catch((error) => console.error('Failed to fetch courses:', error))
      .finally(() => setCoursesLoading(false));
  }, []);

  const applyPreset = (p) => {
    setPreset(p.key);
    setQuestionCount(p.questions);
    setMinutes(p.minutes);
  };

  const toggleCourse = (courseId) => {
    setSelectedCourses((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  const handleGenerate = async () => {
    if (questionCount < 1) {
      showToast('Choose at least 1 question', 'warning');
      return;
    }
    try {
      setGenerating(true);
      const response = await practiceTestsAPI.generate({
        courses: selectedCourses,       // empty = all enrolled (server-scoped)
        categories: [],
        difficulty,
        question_count: questionCount,
        time_limit_minutes: minutes,
      });
      const newAttemptId = response.data.data?.attempt?.id ?? response.data.data?.attempt_id;
      if (!newAttemptId) throw new Error('No attempt id in generate response');
      navigate(`/practice-tests/${newAttemptId}/take`);
    } catch (error) {
      console.error('Failed to generate practice test:', error);
      showToast(error.response?.data?.message || 'Failed to generate practice test. Please try again.', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const courseSummary = selectedCourses.length === 0
    ? 'all your courses'
    : selectedCourses.length === 1
      ? courses.find((c) => c.id === selectedCourses[0])?.title || '1 course'
      : `${selectedCourses.length} courses`;

  return (
    <>
      {/* Header */}
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
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
                  Quiz yourself on your courses — pick a size and go
                </p>
              </div>
            </div>
          </Container>
        </div>
      </div>

      <Container className="py-8 max-w-4xl">
        {coursesLoading ? (
          <div className="flex flex-col items-center py-20">
            <Spinner size="lg" />
            <p className="mt-4 text-gray-500 dark:text-gray-400 text-sm">Loading your courses…</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-12 text-center">
            <BookOpen className="w-14 h-14 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              Enroll in a course to start practicing
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Practice questions come from the courses you're enrolled in.
            </p>
            <Button variant="primary" onClick={() => navigate('/courses')}>
              Browse Courses
            </Button>
          </div>
        ) : (
          <>
            {/* Step 1 — Courses */}
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-brand-blue" />
                1. What do you want to practice?
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 mb-4">
                Tap to choose courses — or leave them all off to mix questions from everything you're enrolled in.
              </p>
              <div className="flex flex-wrap gap-2">
                {courses.map((course) => {
                  const active = selectedCourses.includes(course.id);
                  return (
                    <button
                      key={course.id}
                      type="button"
                      onClick={() => toggleCourse(course.id)}
                      className={cn(
                        'px-4 py-2 rounded-full border-2 text-sm font-medium transition-all',
                        active
                          ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20 text-brand-blue dark:text-blue-300'
                          : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                      )}
                    >
                      {active && <CheckCircle className="inline w-3.5 h-3.5 mr-1.5 -mt-0.5" />}
                      {course.title}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Step 2 — Size */}
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-brand-blue" />
                2. How big should the test be?
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
                {PRESETS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className={cn(
                      'p-4 rounded-xl border-2 text-left transition-all',
                      preset === p.key
                        ? 'bg-blue-50 dark:bg-blue-900/20 border-brand-blue ring-1 ring-brand-blue/30'
                        : 'bg-white dark:bg-dark-800 border-gray-200 dark:border-gray-700 hover:border-brand-blue'
                    )}
                  >
                    <p className="font-medium text-gray-900 dark:text-white mb-0.5 flex items-center gap-2">
                      {p.name}
                      {preset === p.key && <CheckCircle className="w-4 h-4 text-brand-blue" />}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{p.questions} questions • {p.minutes} min</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{p.blurb}</p>
                  </button>
                ))}
              </div>

              {/* Custom */}
              <div className={cn(
                'mt-4 p-4 rounded-xl border-2 transition-all',
                preset === 'custom'
                  ? 'bg-blue-50 dark:bg-blue-900/20 border-brand-blue ring-1 ring-brand-blue/30'
                  : 'border-gray-200 dark:border-gray-700'
              )}>
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                  Or set your own
                  {preset === 'custom' && <CheckCircle className="w-4 h-4 text-brand-blue" />}
                </p>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    Questions
                    <input
                      type="number" min="1" max="100"
                      value={questionCount}
                      onChange={(e) => { setPreset('custom'); setQuestionCount(parseInt(e.target.value) || 0); }}
                      className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    Minutes
                    <input
                      type="number" min="5" max="180"
                      value={minutes}
                      onChange={(e) => { setPreset('custom'); setMinutes(parseInt(e.target.value) || 0); }}
                      className="w-24 px-3 py-2 rounded-lg border border-gray-300 dark:border-dark-600 bg-white dark:bg-dark-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Step 3 — Difficulty */}
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand-blue" />
                3. How hard?
              </h2>
              <div className="flex flex-wrap gap-2 mt-4">
                {DIFFICULTIES.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDifficulty(d.value)}
                    className={cn(
                      'px-5 py-2 rounded-full border-2 text-sm font-medium transition-all',
                      difficulty === d.value
                        ? 'border-brand-blue bg-blue-50 dark:bg-blue-900/20 text-brand-blue dark:text-blue-300'
                        : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Mixed pulls a spread of easy, medium, and hard questions — the best default for revision.
              </p>
            </div>

            {/* Summary + Generate */}
            <div className="bg-white dark:bg-dark-800 rounded-xl shadow-sm p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <span className="font-semibold text-gray-900 dark:text-white">{questionCount} questions</span>
                {' • '}{minutes} min{' • '}{DIFFICULTIES.find((d) => d.value === difficulty)?.label.toLowerCase()}
                {' • from '}<span className="font-medium text-gray-900 dark:text-white">{courseSummary}</span>
              </p>
              <Button
                variant="primary"
                size="lg"
                onClick={handleGenerate}
                loading={generating}
                leftIcon={<Play className="h-5 w-5" />}
                className="whitespace-nowrap"
              >
                Generate &amp; Start Test
              </Button>
            </div>
          </>
        )}
      </Container>
    </>
  );
}
