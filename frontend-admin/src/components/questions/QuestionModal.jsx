import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { Modal, Button, Input, Select, Badge } from '../ui';
import { adminQuestionsAPI, categoriesAPI, coursesAPI } from '../../lib/api';
import { useToast } from '../ui/Toast';

export default function QuestionModal({ isOpen, onClose, question, onSuccess, defaultCategoryId }) {
  const { showToast } = useToast();
  const isEditing = !!question;

  // Form state
  const [formData, setFormData] = useState({
    question_text: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: '',
    explanation: '',
    course_id: '',
    category_id: '',
    subcategory: '',
    difficulty: 'medium',
    tags: '',
    marks: 1.0,
    time_limit_seconds: 60
  });

  const [courses, setCourses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  // Load question data when editing
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
        subcategory: question.subcategory || '',
        difficulty: question.difficulty || 'medium',
        tags: Array.isArray(question.tags) ? question.tags.join(', ') : question.tags || '',
        marks: question.marks || 1.0,
        time_limit_seconds: question.time_limit_seconds || 60
      });
    } else {
      resetForm(defaultCategoryId);
    }
  }, [question, defaultCategoryId]);

  // Fetch courses and categories
  useEffect(() => {
    fetchCourses();
    fetchCategories();
  }, []);

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

  const resetForm = (categoryId = '') => {
    setFormData({
      question_text: '',
      question_type: 'multiple_choice',
      options: ['', '', '', ''],
      correct_answer: '',
      explanation: '',
      course_id: '',
      category_id: categoryId || '',
      subcategory: '',
      difficulty: 'medium',
      tags: '',
      marks: 1.0,
      time_limit_seconds: 60
    });
    setErrors({});
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const handleOptionChange = (index, value) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData(prev => ({ ...prev, options: [...prev.options, ''] }));
    }
  };

  const removeOption = (index) => {
    if (formData.options.length > 2) {
      const newOptions = formData.options.filter((_, i) => i !== index);
      setFormData(prev => ({ ...prev, options: newOptions }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate course selection
    if (!formData.course_id) {
      newErrors.course_id = 'Please select a course for this question';
    }

    // Validate question text
    if (!formData.question_text.trim()) {
      newErrors.question_text = 'Question text is required';
    } else if (formData.question_text.trim().length < 10) {
      newErrors.question_text = 'Question must be at least 10 characters';
    }

    // Validate based on question type
    if (formData.question_type === 'multiple_choice') {
      // Validate options
      const validOptions = formData.options.filter(opt => opt.trim());
      if (validOptions.length < 2) {
        newErrors.options = 'At least 2 options are required';
      }

      // Validate correct answer
      if (!formData.correct_answer.trim()) {
        newErrors.correct_answer = 'Correct answer is required';
      }
    } else if (formData.question_type === 'true_false') {
      if (!formData.correct_answer) {
        newErrors.correct_answer = 'Correct answer is required';
      }
    } else if (formData.question_type === 'fill_blank') {
      if (!formData.correct_answer.trim()) {
        newErrors.correct_answer = 'Correct answer is required';
      }
    }

    // Validate marks
    if (formData.marks <= 0) {
      newErrors.marks = 'Marks must be greater than 0';
    }

    // Validate time limit
    if (formData.time_limit_seconds < 10 || formData.time_limit_seconds > 600) {
      newErrors.time_limit_seconds = 'Time limit must be between 10 and 600 seconds';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      showToast('Please fix the errors in the form', 'error');
      return;
    }

    setLoading(true);

    try {
      // Prepare data
      const submitData = {
        ...formData,
        tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
        marks: parseFloat(formData.marks),
        time_limit_seconds: parseInt(formData.time_limit_seconds)
      };

      // For MCQ, filter out empty options
      if (formData.question_type === 'multiple_choice') {
        submitData.options = formData.options.filter(opt => opt.trim());
      } else {
        // For other types, options not needed
        delete submitData.options;
      }

      // For True/False, set options automatically
      if (formData.question_type === 'true_false') {
        submitData.options = ['True', 'False'];
      }

      if (isEditing) {
        await adminQuestionsAPI.update(question.id, submitData);
        showToast('Question updated successfully', 'success');
      } else {
        await adminQuestionsAPI.create(submitData);
        showToast('Question created successfully', 'success');
      }

      onSuccess();
      handleClose();
    } catch (error) {
      console.error('Failed to save question:', error);
      showToast(error.response?.data?.message || 'Failed to save question', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={isEditing ? 'Edit Question' : 'Add New Question'}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="p-6">
        {/* Question Type */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Question Type *
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleChange('question_type', 'multiple_choice')}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                formData.question_type === 'multiple_choice'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              Multiple Choice
            </button>
            <button
              type="button"
              onClick={() => handleChange('question_type', 'true_false')}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                formData.question_type === 'true_false'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              True/False
            </button>
            <button
              type="button"
              onClick={() => handleChange('question_type', 'fill_blank')}
              className={`p-3 rounded-lg border-2 text-sm font-medium transition-colors ${
                formData.question_type === 'fill_blank'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
              }`}
            >
              Fill in the Blank
            </button>
          </div>
        </div>

        {/* Question Text */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Question Text *
          </label>
          <textarea
            value={formData.question_text}
            onChange={(e) => handleChange('question_text', e.target.value)}
            rows={4}
            className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700 dark:border-gray-600 ${
              errors.question_text ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter your question here..."
          />
          {errors.question_text && (
            <p className="mt-1 text-sm text-red-600">{errors.question_text}</p>
          )}
          <p className="mt-1 text-xs text-gray-500">
            {formData.question_text.length} characters (minimum 10)
          </p>
        </div>

        {/* Options (for Multiple Choice) */}
        {formData.question_type === 'multiple_choice' && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Options * (2-6 options)
            </label>
            <div className="space-y-2">
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-500 w-8">
                    {String.fromCharCode(65 + index)}.
                  </span>
                  <Input
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    className="flex-1"
                  />
                  {formData.options.length > 2 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => removeOption(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            {formData.options.length < 6 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addOption}
                className="mt-2"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Option
              </Button>
            )}
            {errors.options && (
              <p className="mt-1 text-sm text-red-600">{errors.options}</p>
            )}
          </div>
        )}

        {/* Correct Answer */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Correct Answer *
          </label>
          {formData.question_type === 'multiple_choice' ? (
            <Select
              value={formData.correct_answer}
              onChange={(e) => handleChange('correct_answer', e.target.value)}
              className={errors.correct_answer ? 'border-red-500' : ''}
            >
              <option value="">Select correct answer</option>
              {formData.options.map((option, index) => (
                option.trim() && (
                  <option key={index} value={option}>
                    {String.fromCharCode(65 + index)}. {option}
                  </option>
                )
              ))}
            </Select>
          ) : formData.question_type === 'true_false' ? (
            <Select
              value={formData.correct_answer}
              onChange={(e) => handleChange('correct_answer', e.target.value)}
              className={errors.correct_answer ? 'border-red-500' : ''}
            >
              <option value="">Select correct answer</option>
              <option value="True">True</option>
              <option value="False">False</option>
            </Select>
          ) : (
            <Input
              value={formData.correct_answer}
              onChange={(e) => handleChange('correct_answer', e.target.value)}
              placeholder="Enter the correct answer"
              className={errors.correct_answer ? 'border-red-500' : ''}
            />
          )}
          {errors.correct_answer && (
            <p className="mt-1 text-sm text-red-600">{errors.correct_answer}</p>
          )}
        </div>

        {/* Explanation */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Explanation (Optional)
          </label>
          <textarea
            value={formData.explanation}
            onChange={(e) => handleChange('explanation', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-dark-700"
            placeholder="Explain why this answer is correct..."
          />
          <p className="mt-1 text-xs text-gray-500">
            This will be shown to students after they submit their answer
          </p>
        </div>

        {/* Course Selection */}
        <div className="mb-6">
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
          <p className="mt-1 text-xs text-gray-500">
            Questions are organized by course (e.g., MySQL, PostgreSQL, JavaScript)
          </p>
        </div>

        {/* Category and Difficulty */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category (Optional)
            </label>
            <Select
              value={formData.category_id}
              onChange={(e) => handleChange('category_id', e.target.value)}
            >
              <option value="">Select category</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </Select>
            <p className="mt-1 text-xs text-gray-500">
              Category is optional since course already has one
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Difficulty *
            </label>
            <Select
              value={formData.difficulty}
              onChange={(e) => handleChange('difficulty', e.target.value)}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </Select>
          </div>
        </div>

        {/* Marks and Time Limit */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Marks *
            </label>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              max="100"
              value={formData.marks}
              onChange={(e) => handleChange('marks', e.target.value)}
              className={errors.marks ? 'border-red-500' : ''}
            />
            {errors.marks && (
              <p className="mt-1 text-sm text-red-600">{errors.marks}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Time Limit (seconds) *
            </label>
            <Input
              type="number"
              min="10"
              max="600"
              value={formData.time_limit_seconds}
              onChange={(e) => handleChange('time_limit_seconds', e.target.value)}
              className={errors.time_limit_seconds ? 'border-red-500' : ''}
            />
            {errors.time_limit_seconds && (
              <p className="mt-1 text-sm text-red-600">{errors.time_limit_seconds}</p>
            )}
          </div>
        </div>

        {/* Subcategory and Tags */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Subcategory
            </label>
            <Input
              value={formData.subcategory}
              onChange={(e) => handleChange('subcategory', e.target.value)}
              placeholder="e.g., React Basics"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tags (comma-separated)
            </label>
            <Input
              value={formData.tags}
              onChange={(e) => handleChange('tags', e.target.value)}
              placeholder="e.g., javascript, arrays, loops"
            />
          </div>
        </div>

        {/* Preview */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-dark-700 rounded-lg border border-gray-200 dark:border-gray-600">
          <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
            Preview
          </h4>
          <div className="bg-white dark:bg-dark-800 p-4 rounded-lg">
            <p className="text-gray-900 dark:text-white mb-3">
              {formData.question_text || 'Your question will appear here...'}
            </p>
            {formData.question_type === 'multiple_choice' && (
              <div className="space-y-2">
                {formData.options.map((option, index) => (
                  option.trim() && (
                    <div key={index} className="flex items-center gap-2">
                      <input type="radio" name="preview" disabled />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {String.fromCharCode(65 + index)}. {option}
                      </span>
                    </div>
                  )
                ))}
              </div>
            )}
            {formData.question_type === 'true_false' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input type="radio" name="preview" disabled />
                  <span className="text-sm text-gray-700 dark:text-gray-300">True</span>
                </div>
                <div className="flex items-center gap-2">
                  <input type="radio" name="preview" disabled />
                  <span className="text-sm text-gray-700 dark:text-gray-300">False</span>
                </div>
              </div>
            )}
            {formData.question_type === 'fill_blank' && (
              <Input placeholder="Student's answer will go here..." disabled />
            )}
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading}
          >
            {loading ? 'Saving...' : (isEditing ? 'Update Question' : 'Create Question')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
