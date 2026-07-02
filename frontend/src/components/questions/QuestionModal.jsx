import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { questionsAPI } from '../../lib/api';
import { Button, Spinner } from '../ui';
import { useToast } from '../ui/Toast';

export default function QuestionModal({ isOpen, onClose, question, onSuccess, courses, categories }) {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    course_id: '',
    category_id: '',
    difficulty: 'medium',
    marks: 1,
    time_limit_seconds: 60
  });

  useEffect(() => {
    if (question) {
      setFormData({
        question_text: question.question_text || '',
        question_type: question.question_type || 'multiple_choice',
        options: question.options || ['', '', '', ''],
        correct_answer: question.correct_answer || '',
        explanation: question.explanation || '',
        course_id: question.course_id || '',
        category_id: question.category_id || '',
        difficulty: question.difficulty || 'medium',
        marks: question.marks || 1,
        time_limit_seconds: question.time_limit_seconds || 60
      });
    }
  }, [question]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    handleChange('options', newOptions);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.question_text.trim()) {
      newErrors.question_text = 'Question text is required';
    }

    // Category is the primary organizer now — every question must live
    // in one. Course is optional: leave it blank for questions that
    // apply category-wide (e.g. "Web Dev" general questions usable in
    // any course-level test), or pick one to tie it to that course.
    if (!formData.category_id) {
      newErrors.category_id = 'Please select a category';
    }

    if (formData.question_type === 'multiple_choice') {
      if (formData.options.some(opt => !opt.trim())) {
        newErrors.options = 'All options must be filled';
      }
      if (!formData.correct_answer.trim()) {
        newErrors.correct_answer = 'Correct answer is required';
      }
    } else if (formData.question_type === 'true_false') {
      if (!formData.correct_answer) {
        newErrors.correct_answer = 'Please select true or false';
      }
    } else if (formData.question_type === 'fill_in_blank') {
      if (!formData.correct_answer.trim()) {
        newErrors.correct_answer = 'Correct answer is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      setLoading(true);

      const payload = {
        ...formData,
        course_id: formData.course_id ? parseInt(formData.course_id) : null,
        category_id: parseInt(formData.category_id),
        marks: parseInt(formData.marks),
        time_limit_seconds: parseInt(formData.time_limit_seconds)
      };

      if (question) {
        await questionsAPI.update(question.id, payload);
      } else {
        await questionsAPI.create(payload);
      }

      onSuccess();
    } catch (error) {
      console.error('Failed to save question:', error);
      showToast('Failed to save question. Please try again.', 'warning');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        <div className="relative bg-white dark:bg-dark-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white dark:bg-dark-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {question ? 'Edit Question' : 'Add Question'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Category — primary organizer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category *
              </label>
              <select
                value={formData.category_id}
                onChange={(e) => handleChange('category_id', e.target.value)}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white ${
                  errors.category_id ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
              >
                <option value="">Select a category</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
              {errors.category_id && (
                <p className="mt-1 text-sm text-red-600">{errors.category_id}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Questions are organized by category (e.g., Web Dev, Databases, Data Science).
              </p>
            </div>

            {/* Course — optional, narrows the question to a specific course */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course (Optional)
              </label>
              <select
                value={formData.course_id}
                onChange={(e) => handleChange('course_id', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
              >
                <option value="">No specific course — applies category-wide</option>
                {courses.map(course => (
                  <option key={course.id} value={course.id}>{course.title}</option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Leave blank for general category questions (usable in any test in this category), or pick a course to narrow it to that course only.
              </p>
            </div>

            {/* Question Text */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Question Text *
              </label>
              <textarea
                value={formData.question_text}
                onChange={(e) => handleChange('question_text', e.target.value)}
                rows={3}
                className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white ${
                  errors.question_text ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="Enter the question..."
              />
              {errors.question_text && (
                <p className="mt-1 text-sm text-red-600">{errors.question_text}</p>
              )}
            </div>

            {/* Question Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Question Type
              </label>
              <select
                value={formData.question_type}
                onChange={(e) => handleChange('question_type', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
              >
                <option value="multiple_choice">Multiple Choice</option>
                <option value="true_false">True/False</option>
                <option value="fill_in_blank">Fill in the Blank</option>
              </select>
            </div>

            {/* Options for Multiple Choice */}
            {formData.question_type === 'multiple_choice' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Options *
                </label>
                {formData.options.map((option, index) => (
                  <input
                    key={index}
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${index + 1}`}
                    className="w-full px-4 py-2 mb-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
                  />
                ))}
                {errors.options && (
                  <p className="mt-1 text-sm text-red-600">{errors.options}</p>
                )}
              </div>
            )}

            {/* Correct Answer */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Correct Answer *
              </label>
              {formData.question_type === 'multiple_choice' ? (
                <input
                  type="text"
                  value={formData.correct_answer}
                  onChange={(e) => handleChange('correct_answer', e.target.value)}
                  placeholder="Enter the exact correct option"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white ${
                    errors.correct_answer ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              ) : formData.question_type === 'true_false' ? (
                <select
                  value={formData.correct_answer}
                  onChange={(e) => handleChange('correct_answer', e.target.value)}
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white ${
                    errors.correct_answer ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                >
                  <option value="">Select answer</option>
                  <option value="true">True</option>
                  <option value="false">False</option>
                </select>
              ) : (
                <input
                  type="text"
                  value={formData.correct_answer}
                  onChange={(e) => handleChange('correct_answer', e.target.value)}
                  placeholder="Enter the correct answer"
                  className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white ${
                    errors.correct_answer ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                />
              )}
              {errors.correct_answer && (
                <p className="mt-1 text-sm text-red-600">{errors.correct_answer}</p>
              )}
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Explanation (Optional)
              </label>
              <textarea
                value={formData.explanation}
                onChange={(e) => handleChange('explanation', e.target.value)}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
                placeholder="Explain why this is the correct answer..."
              />
            </div>

            {/* Difficulty & Marks */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Difficulty
                </label>
                <select
                  value={formData.difficulty}
                  onChange={(e) => handleChange('difficulty', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Marks
                </label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={formData.marks}
                  onChange={(e) => handleChange('marks', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Time (seconds)
                </label>
                <input
                  type="number"
                  min="10"
                  max="300"
                  value={formData.time_limit_seconds}
                  onChange={(e) => handleChange('time_limit_seconds', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white"
                />
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-300">
                Your question will be submitted for admin approval before it can be used in tests.
              </p>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Saving...
                  </>
                ) : (
                  question ? 'Update Question' : 'Submit for Approval'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
