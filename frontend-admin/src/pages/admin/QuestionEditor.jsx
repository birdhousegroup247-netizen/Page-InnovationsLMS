import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  HelpCircle, ArrowLeft, Plus, Trash2, Upload, Save,
} from 'lucide-react';
import { adminQuestionsAPI, categoriesAPI, coursesAPI } from '../../lib/api';
import { Button, Input, Select, Spinner } from '../../components/ui';
import Container from '../../components/layout/Container';
import { PageHeader } from '../../components/layout';
import { useToast } from '../../components/ui/Toast';
import BulkImport from '../../components/questions/BulkImport';

/**
 * QuestionEditor — full-page Create / Edit Question form.
 *
 * Replaces the cramped modal version: same form, but with room to breathe,
 * a real header with Save / Cancel / Import CSV, and the live preview moved
 * to the right column on wide screens (vs. shoved at the bottom).
 *
 * Routes:
 *   /questions/new            — create, no defaults
 *   /questions/new?category=X — create, category pre-selected (from the
 *                               category drill-down's "Add Question")
 *   /questions/:questionId/edit — edit existing question
 */
export default function QuestionEditor() {
  const navigate = useNavigate();
  const { questionId } = useParams();
  const [searchParams] = useSearchParams();
  const { showToast } = useToast();

  const isEditing = !!questionId;
  const preselectedCategory = searchParams.get('category');

  const emptyForm = {
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    course_id: '',
    category_id: preselectedCategory && preselectedCategory !== 'uncategorized' ? preselectedCategory : '',
    subcategory: '',
    difficulty: 'medium',
    tags: '',
    marks: 1.0,
    time_limit_seconds: 60,
  };

  const [formData, setFormData] = useState(emptyForm);
  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const [showBulkImport, setShowBulkImport] = useState(false);

  // ── Load courses, categories, and (if editing) the question itself ──────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [coursesRes, categoriesRes] = await Promise.all([
          coursesAPI.getAll(),
          categoriesAPI.getAll(),
        ]);
        if (cancelled) return;
        setCourses(coursesRes.data.data?.courses || []);
        setCategories(Array.isArray(categoriesRes.data.data?.categories) ? categoriesRes.data.data.categories : []);
      } catch (e) {
        console.error('Failed to load lookup data:', e);
      }

      if (isEditing) {
        try {
          const res = await adminQuestionsAPI.getById(questionId);
          if (cancelled) return;
          const q = res.data.data?.question || res.data.data;
          setFormData({
            question_text: q.question_text || '',
            question_type: q.question_type || 'multiple_choice',
            options: Array.isArray(q.options) ? q.options : ['', '', '', ''],
            correct_answer: q.correct_answer || '',
            explanation: q.explanation || '',
            course_id: q.course_id || '',
            category_id: q.category_id || '',
            subcategory: q.subcategory || '',
            difficulty: q.difficulty || 'medium',
            tags: Array.isArray(q.tags) ? q.tags.join(', ') : (q.tags || ''),
            marks: q.marks ?? 1.0,
            time_limit_seconds: q.time_limit_seconds ?? 60,
          });
        } catch (e) {
          showToast('Failed to load question', 'error');
          navigate('/questions');
        } finally {
          if (!cancelled) setLoading(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [questionId, isEditing]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: null }));
  };

  const handleOptionChange = (index, value) => {
    const next = [...formData.options];
    next[index] = value;
    setFormData((prev) => ({ ...prev, options: next }));
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData((prev) => ({ ...prev, options: [...prev.options, ''] }));
    }
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      setFormData((prev) => ({ ...prev, options: prev.options.filter((_, i) => i !== index) }));
    }
  };

  const validateForm = () => {
    const e = {};
    if (!formData.course_id) e.course_id = 'Please select a course for this question';
    if (!formData.question_text.trim()) e.question_text = 'Question text is required';
    else if (formData.question_text.trim().length < 10) e.question_text = 'Question must be at least 10 characters';

    if (formData.question_type === 'multiple_choice') {
      const validOptions = formData.options.filter((o) => o.trim());
      if (validOptions.length < 2) e.options = 'At least 2 options are required';
      if (!formData.correct_answer.trim()) e.correct_answer = 'Correct answer is required';
    } else if (!formData.correct_answer || (typeof formData.correct_answer === 'string' && !formData.correct_answer.trim())) {
      e.correct_answer = 'Correct answer is required';
    }

    if (formData.marks <= 0) e.marks = 'Marks must be greater than 0';
    if (formData.time_limit_seconds < 10 || formData.time_limit_seconds > 600) {
      e.time_limit_seconds = 'Time limit must be between 10 and 600 seconds';
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
        marks: parseFloat(formData.marks),
        time_limit_seconds: parseInt(formData.time_limit_seconds, 10),
      };
      if (formData.question_type === 'multiple_choice') {
        payload.options = formData.options.filter((o) => o.trim());
      } else if (formData.question_type === 'true_false') {
        payload.options = ['True', 'False'];
      } else {
        delete payload.options;
      }

      if (isEditing) {
        await adminQuestionsAPI.update(questionId, payload);
        showToast('Question updated', 'success');
        navigate(`/questions/${questionId}`);
      } else {
        const res = await adminQuestionsAPI.create(payload);
        showToast('Question created', 'success');
        const newId = res.data.data?.question?.id;
        if (newId) navigate(`/questions/${newId}`);
        else navigate('/questions');
      }
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to save question', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64 py-32">
        <Spinner size="lg" />
      </div>
    );
  }

  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';
  const sectionClass = 'bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-6';

  return (
    <>
      <PageHeader
        icon={HelpCircle}
        title={isEditing ? 'Edit Question' : 'Add New Question'}
        subtitle={isEditing ? 'Update the question, options, and meta' : 'Build a new question for the bank'}
        actions={
          <>
            <Button
              onClick={() => navigate(-1)}
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              Cancel
            </Button>
            {!isEditing && (
              <Button
                onClick={() => setShowBulkImport(true)}
                variant="ghost"
                size="sm"
                leftIcon={<Upload className="h-4 w-4" />}
                className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
              >
                Import CSV
              </Button>
            )}
            <Button
              onClick={handleSubmit}
              variant="ghost"
              size="sm"
              disabled={saving}
              leftIcon={<Save className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Question'}
            </Button>
          </>
        }
      />

      <Container className="py-8">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / main column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Type */}
            <div className={sectionClass}>
              <label className={labelClass}>Question Type *</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { v: 'multiple_choice', l: 'Multiple Choice' },
                  { v: 'true_false', l: 'True / False' },
                  { v: 'fill_blank', l: 'Fill in the Blank' },
                ].map((t) => (
                  <button
                    key={t.v}
                    type="button"
                    onClick={() => handleChange('question_type', t.v)}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                      formData.question_type === t.v
                        ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {t.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Question Text */}
            <div className={sectionClass}>
              <label className={labelClass}>Question Text *</label>
              <textarea
                value={formData.question_text}
                onChange={(e) => handleChange('question_text', e.target.value)}
                rows={5}
                placeholder="Enter your question here..."
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:border-gray-600 dark:text-white ${
                  errors.question_text ? 'border-red-500' : 'border-gray-300'
                }`}
              />
              {errors.question_text && <p className="mt-1 text-sm text-red-600">{errors.question_text}</p>}
              <p className="mt-1 text-xs text-gray-500">
                {formData.question_text.length} characters (minimum 10)
              </p>
            </div>

            {/* Options (MCQ) */}
            {formData.question_type === 'multiple_choice' && (
              <div className={sectionClass}>
                <label className={labelClass}>Options * (2–6 options)</label>
                <div className="space-y-2">
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-500 w-8 flex-shrink-0">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      <Input
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${String.fromCharCode(65 + index)}`}
                        className="flex-1"
                      />
                      {formData.options.length > 2 && (
                        <Button type="button" size="sm" variant="outline" onClick={() => removeOption(index)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {formData.options.length < 6 && (
                  <Button type="button" size="sm" variant="outline" onClick={addOption} className="mt-3" leftIcon={<Plus className="w-4 h-4" />}>
                    Add Option
                  </Button>
                )}
                {errors.options && <p className="mt-1 text-sm text-red-600">{errors.options}</p>}
              </div>
            )}

            {/* Correct Answer */}
            <div className={sectionClass}>
              <label className={labelClass}>Correct Answer *</label>
              {formData.question_type === 'multiple_choice' ? (
                <select
                  value={formData.correct_answer}
                  onChange={(e) => handleChange('correct_answer', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:border-gray-600 dark:text-white ${
                    errors.correct_answer ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select correct answer</option>
                  {formData.options.map((option, index) => option.trim() && (
                    <option key={index} value={option}>
                      {String.fromCharCode(65 + index)}. {option}
                    </option>
                  ))}
                </select>
              ) : formData.question_type === 'true_false' ? (
                <select
                  value={formData.correct_answer}
                  onChange={(e) => handleChange('correct_answer', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:border-gray-600 dark:text-white ${
                    errors.correct_answer ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select correct answer</option>
                  <option value="True">True</option>
                  <option value="False">False</option>
                </select>
              ) : (
                <Input
                  value={formData.correct_answer}
                  onChange={(e) => handleChange('correct_answer', e.target.value)}
                  placeholder="Enter the correct answer"
                  className={errors.correct_answer ? 'border-red-500' : ''}
                />
              )}
              {errors.correct_answer && <p className="mt-1 text-sm text-red-600">{errors.correct_answer}</p>}
            </div>

            {/* Explanation */}
            <div className={sectionClass}>
              <label className={labelClass}>Explanation <span className="text-gray-400 text-xs font-normal">(optional)</span></label>
              <textarea
                value={formData.explanation}
                onChange={(e) => handleChange('explanation', e.target.value)}
                rows={3}
                placeholder="Explain why this answer is correct..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500">
                Shown to students after they submit their answer.
              </p>
            </div>
          </div>

          {/* Right / sidebar column — meta + preview */}
          <div className="space-y-6">
            <div className={sectionClass}>
              <label className={labelClass}>Course *</label>
              <select
                value={formData.course_id}
                onChange={(e) => handleChange('course_id', e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:border-gray-600 dark:text-white ${
                  errors.course_id ? 'border-red-500' : 'border-gray-300'
                }`}
              >
                <option value="">Select a course</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.title}</option>
                ))}
              </select>
              {errors.course_id && <p className="mt-1 text-sm text-red-600">{errors.course_id}</p>}

              <label className={`${labelClass} mt-5`}>Category</label>
              <select
                value={formData.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
              >
                <option value="">— None —</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <div>
                  <label className={labelClass}>Difficulty *</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => handleChange('difficulty', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Marks *</label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0.5"
                    max="100"
                    value={formData.marks}
                    onChange={(e) => handleChange('marks', e.target.value)}
                    className={errors.marks ? 'border-red-500' : ''}
                  />
                  {errors.marks && <p className="mt-1 text-sm text-red-600">{errors.marks}</p>}
                </div>
              </div>

              <label className={`${labelClass} mt-5`}>Time Limit (seconds)</label>
              <Input
                type="number"
                min="10"
                max="600"
                value={formData.time_limit_seconds}
                onChange={(e) => handleChange('time_limit_seconds', e.target.value)}
                className={errors.time_limit_seconds ? 'border-red-500' : ''}
              />
              {errors.time_limit_seconds && <p className="mt-1 text-sm text-red-600">{errors.time_limit_seconds}</p>}

              <label className={`${labelClass} mt-5`}>Subcategory</label>
              <Input
                value={formData.subcategory}
                onChange={(e) => handleChange('subcategory', e.target.value)}
                placeholder="e.g., React Basics"
              />

              <label className={`${labelClass} mt-5`}>Tags <span className="text-gray-400 text-xs font-normal">(comma-separated)</span></label>
              <Input
                value={formData.tags}
                onChange={(e) => handleChange('tags', e.target.value)}
                placeholder="e.g., javascript, arrays, loops"
              />
            </div>

            {/* Live preview */}
            <div className={sectionClass}>
              <h4 className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-3">Preview</h4>
              <div className="p-4 rounded-lg bg-gray-50 dark:bg-dark-700">
                <p className="text-sm text-gray-900 dark:text-white mb-3 whitespace-pre-wrap">
                  {formData.question_text || 'Your question will appear here…'}
                </p>
                {formData.question_type === 'multiple_choice' && (
                  <div className="space-y-2">
                    {formData.options.map((option, index) => option.trim() && (
                      <label key={index} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                        <input type="radio" name="preview" disabled />
                        <span>{String.fromCharCode(65 + index)}. {option}</span>
                      </label>
                    ))}
                  </div>
                )}
                {formData.question_type === 'true_false' && (
                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    <label className="flex items-center gap-2"><input type="radio" name="preview" disabled /> True</label>
                    <label className="flex items-center gap-2"><input type="radio" name="preview" disabled /> False</label>
                  </div>
                )}
                {formData.question_type === 'fill_blank' && (
                  <Input placeholder="Student's answer goes here…" disabled />
                )}
              </div>
            </div>
          </div>
        </form>
      </Container>

      {/* CSV import — secondary entry point, keeps the modal because the flow
          is short-lived and step-based. */}
      {showBulkImport && (
        <BulkImport
          isOpen={showBulkImport}
          onClose={() => setShowBulkImport(false)}
          onSuccess={() => {
            setShowBulkImport(false);
            showToast('Questions imported', 'success');
            navigate('/questions');
          }}
        />
      )}
    </>
  );
}
