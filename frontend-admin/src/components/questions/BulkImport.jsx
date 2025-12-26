import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, X, Download } from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { adminQuestionsAPI } from '../../lib/api';
import { useToast } from '../ui/Toast';

export default function BulkImport({ isOpen, onClose, onSuccess }) {
  const { showToast } = useToast();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Upload, 2: Preview, 3: Results

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        showToast('Please select a valid CSV file', 'error');
        return;
      }
      setFile(selectedFile);
      parseCSV(selectedFile);
    }
  };

  const parseCSV = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        const lines = text.split('\n').filter(line => line.trim());

        if (lines.length < 2) {
          showToast('CSV file is empty or invalid', 'error');
          return;
        }

        // Parse header
        const headers = lines[0].split(',').map(h => h.trim());

        // Validate required headers
        const requiredHeaders = ['question_text', 'question_type', 'correct_answer', 'difficulty'];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));

        if (missingHeaders.length > 0) {
          showToast(`Missing required headers: ${missingHeaders.join(', ')}`, 'error');
          return;
        }

        // Parse rows
        const questions = [];
        const parseErrors = [];

        for (let i = 1; i < lines.length; i++) {
          try {
            const values = parseCSVLine(lines[i]);
            const question = {};

            headers.forEach((header, index) => {
              question[header] = values[index] || '';
            });

            // Validate question
            const validation = validateQuestion(question, i + 1);
            if (validation.errors.length > 0) {
              parseErrors.push(...validation.errors);
            } else {
              questions.push(processQuestion(question));
            }
          } catch (error) {
            parseErrors.push({ row: i + 1, message: `Failed to parse row: ${error.message}` });
          }
        }

        setPreview(questions);
        setErrors(parseErrors);

        if (questions.length > 0) {
          setStep(2);
          showToast(`Parsed ${questions.length} questions successfully`, 'success');
        } else {
          showToast('No valid questions found in CSV', 'error');
        }
      } catch (error) {
        showToast('Failed to parse CSV file', 'error');
        console.error(error);
      }
    };
    reader.readAsText(file);
  };

  // Parse CSV line handling quoted values
  const parseCSVLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        values.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current.trim());

    return values;
  };

  const validateQuestion = (question, rowNumber) => {
    const errors = [];

    // Validate question text
    if (!question.question_text || question.question_text.length < 10) {
      errors.push({ row: rowNumber, message: 'Question text must be at least 10 characters' });
    }

    // Validate question type
    const validTypes = ['multiple_choice', 'true_false', 'fill_blank'];
    if (!validTypes.includes(question.question_type)) {
      errors.push({ row: rowNumber, message: `Invalid question type: ${question.question_type}` });
    }

    // Validate difficulty
    const validDifficulties = ['easy', 'medium', 'hard'];
    if (!validDifficulties.includes(question.difficulty.toLowerCase())) {
      errors.push({ row: rowNumber, message: `Invalid difficulty: ${question.difficulty}` });
    }

    // Validate options for MCQ
    if (question.question_type === 'multiple_choice') {
      if (!question.options) {
        errors.push({ row: rowNumber, message: 'Options are required for multiple choice questions' });
      }
    }

    // Validate correct answer
    if (!question.correct_answer) {
      errors.push({ row: rowNumber, message: 'Correct answer is required' });
    }

    return { errors };
  };

  const processQuestion = (question) => {
    const processed = {
      question_text: question.question_text,
      question_type: question.question_type,
      correct_answer: question.correct_answer,
      difficulty: question.difficulty.toLowerCase(),
      explanation: question.explanation || '',
      category_id: question.category_id || null,
      subcategory: question.subcategory || '',
      marks: parseFloat(question.marks) || 1.0,
      time_limit_seconds: parseInt(question.time_limit_seconds) || 60,
      tags: question.tags ? question.tags.split('|').map(t => t.trim()) : []
    };

    // Parse options for MCQ
    if (question.question_type === 'multiple_choice') {
      try {
        // Try JSON parse first
        processed.options = JSON.parse(question.options);
      } catch {
        // Fall back to pipe-separated
        processed.options = question.options.split('|').map(o => o.trim()).filter(Boolean);
      }
    } else if (question.question_type === 'true_false') {
      processed.options = ['True', 'False'];
    }

    return processed;
  };

  const handleImport = async () => {
    if (preview.length === 0) {
      showToast('No questions to import', 'error');
      return;
    }

    setLoading(true);

    try {
      const response = await adminQuestionsAPI.bulkImport({ questions: preview });

      showToast(`Successfully imported ${response.data.data.created} questions`, 'success');
      setStep(3);

      setTimeout(() => {
        onSuccess();
        handleClose();
      }, 2000);
    } catch (error) {
      console.error('Failed to import questions:', error);
      showToast(error.response?.data?.message || 'Failed to import questions', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setPreview([]);
    setErrors([]);
    setStep(1);
    onClose();
  };

  const downloadTemplate = () => {
    const template = `question_text,question_type,options,correct_answer,explanation,category_id,subcategory,difficulty,marks,time_limit_seconds,tags
"What is React?",multiple_choice,"A library|A framework|A database|A language","A library","React is a JavaScript library for building user interfaces","1","React Basics",easy,1,60,"javascript|react"
"JavaScript is compiled language",true_false,"","False","JavaScript is an interpreted language","1","JS Fundamentals",medium,1,30,"javascript|basics"
"The capital of France is ___",fill_blank,"","Paris","Paris is the capital and largest city of France","2","Geography",easy,1,45,"geography|europe"`;

    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions-template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Bulk Import Questions"
      size="xl"
    >
      <div className="p-6">
        {/* Step 1: Upload */}
        {step === 1 && (
          <div>
            {/* Instructions */}
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                CSV Format Instructions
              </h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>First row must contain column headers</li>
                <li>Required columns: question_text, question_type, correct_answer, difficulty</li>
                <li>Question types: multiple_choice, true_false, fill_blank</li>
                <li>For MCQ, options can be JSON array or pipe-separated (Option 1|Option 2)</li>
                <li>Tags should be pipe-separated (tag1|tag2|tag3)</li>
                <li>Difficulty: easy, medium, or hard</li>
              </ul>
            </div>

            {/* Download Template */}
            <div className="mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={downloadTemplate}
                className="w-full"
              >
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
            </div>

            {/* File Upload */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Upload CSV File
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500">CSV files only</p>
                  {file && (
                    <div className="mt-4 flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <FileText className="w-4 h-4" />
                      {file.name}
                    </div>
                  )}
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Preview */}
        {step === 2 && (
          <div>
            {/* Summary */}
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-300">
                    Valid Questions
                  </span>
                </div>
                <p className="text-2xl font-bold text-green-600">{preview.length}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <span className="text-sm font-medium text-red-900 dark:text-red-300">
                    Errors
                  </span>
                </div>
                <p className="text-2xl font-bold text-red-600">{errors.length}</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300">
                    Total Rows
                  </span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{preview.length + errors.length}</p>
              </div>
            </div>

            {/* Errors */}
            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-h-40 overflow-y-auto">
                <h4 className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">
                  Validation Errors
                </h4>
                <ul className="text-sm text-red-800 dark:text-red-400 space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>
                      Row {error.row}: {error.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Preview Table */}
            <div className="mb-6 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Question</th>
                    <th className="px-3 py-2 text-left">Type</th>
                    <th className="px-3 py-2 text-left">Difficulty</th>
                    <th className="px-3 py-2 text-left">Marks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {preview.map((question, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                      <td className="px-3 py-2 text-gray-500">{index + 1}</td>
                      <td className="px-3 py-2">
                        <p className="line-clamp-2 text-gray-900 dark:text-white">
                          {question.question_text}
                        </p>
                      </td>
                      <td className="px-3 py-2">
                        <Badge color="blue">
                          {question.question_type.replace('_', ' ')}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
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
                      </td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">
                        {question.marks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep(1)}
              >
                Back
              </Button>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleImport}
                  disabled={loading || preview.length === 0}
                >
                  {loading ? 'Importing...' : `Import ${preview.length} Questions`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Import Successful!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {preview.length} questions have been imported successfully
            </p>
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
