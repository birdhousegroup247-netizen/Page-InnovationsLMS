import { useState } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, Download } from 'lucide-react';
import { Modal, Button, Badge } from '../ui';
import { adminCoursesAPI } from '../../lib/api';
import { useToast } from '../ui/Toast';

/**
 * BulkImportCourses — seed many courses at once from a CSV.
 * Columns: title (required), category (required — created if missing),
 * description, price, level, instructor_email, duration_hours, status.
 * Frontend parses the CSV, backend resolves category/instructor + slug.
 */
export default function BulkImportCourses({ isOpen, onClose, onSuccess }) {
  const { showToast } = useToast();

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [errors, setErrors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1 upload, 2 preview, 3 results
  const [result, setResult] = useState(null);

  const parseLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') inQuotes = !inQuotes;
      else if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; }
      else current += char;
    }
    values.push(current.trim());
    return values;
  };

  const handleFileSelect = (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.type !== 'text/csv' && !f.name.endsWith('.csv')) {
      showToast('Please select a valid CSV file', 'error');
      return;
    }
    setFile(f);
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const lines = (ev.target.result || '').split('\n').filter((l) => l.trim());
        if (lines.length < 2) return showToast('CSV is empty or invalid', 'error');

        const headers = lines[0].split(',').map((h) => h.trim());
        const required = ['title', 'category'];
        const missing = required.filter((h) => !headers.includes(h));
        if (missing.length) return showToast(`Missing required headers: ${missing.join(', ')}`, 'error');

        const rows = [];
        const rowErrors = [];
        for (let i = 1; i < lines.length; i++) {
          const values = parseLine(lines[i]);
          const row = {};
          headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
          if (!row.title || row.title.length < 3) {
            rowErrors.push({ row: i + 1, message: 'Title is required (min 3 chars)' });
            continue;
          }
          if (!row.category) {
            rowErrors.push({ row: i + 1, message: 'Category is required' });
            continue;
          }
          rows.push({
            title: row.title,
            description: row.description || '',
            price: row.price || '0',
            level: (row.level || 'beginner').toLowerCase(),
            category: row.category,
            instructor_email: row.instructor_email || '',
            duration_hours: row.duration_hours || '',
            status: (row.status || 'draft').toLowerCase(),
          });
        }
        setPreview(rows);
        setErrors(rowErrors);
        if (rows.length) { setStep(2); showToast(`Parsed ${rows.length} courses`, 'success'); }
        else showToast('No valid courses found in CSV', 'error');
      } catch (err) {
        showToast('Failed to parse CSV file', 'error');
      }
    };
    reader.readAsText(f);
  };

  const handleImport = async () => {
    if (!preview.length) return;
    setLoading(true);
    try {
      const res = await adminCoursesAPI.bulkImport({ courses: preview });
      setResult(res.data?.data || null);
      setStep(3);
      showToast(res.data?.message || 'Imported', 'success');
      onSuccess?.();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to import courses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setFile(null); setPreview([]); setErrors([]); setResult(null); setStep(1);
    onClose();
  };

  const downloadTemplate = () => {
    const template = `title,description,price,level,category,instructor_email,duration_hours,status
"Intro to Python","Learn Python from scratch",0,beginner,"Software Development",,20,draft
"UI/UX Fundamentals","Design thinking and Figma",25000,intermediate,"Product Design",jane@example.com,15,published`;
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'courses-template.csv'; a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Import Courses from CSV" size="xl">
      <div className="p-6">
        {step === 1 && (
          <div>
            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">CSV Format</h4>
              <ul className="text-sm text-blue-800 dark:text-blue-400 space-y-1 list-disc list-inside">
                <li>Required columns: title, category</li>
                <li>Optional: description, price, level, instructor_email, duration_hours, status</li>
                <li>Level: beginner, intermediate, advanced</li>
                <li>Status: draft, published, archived, pending</li>
                <li>Category is created automatically if it doesn't exist</li>
                <li>instructor_email defaults to you if left blank</li>
              </ul>
            </div>

            <div className="mb-6">
              <Button type="button" variant="outline" onClick={downloadTemplate} className="w-full">
                <Download className="w-4 h-4 mr-2" /> Download CSV Template
              </Button>
            </div>

            <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center hover:border-brand-blue transition-colors">
              <input type="file" accept=".csv" onChange={handleFileSelect} className="hidden" id="course-csv-upload" />
              <label htmlFor="course-csv-upload" className="cursor-pointer flex flex-col items-center">
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Click to upload or drag and drop</p>
                <p className="text-xs text-gray-500">CSV files only</p>
                {file && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-brand-blue">
                    <FileText className="w-4 h-4" /> {file.name}
                  </div>
                )}
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="mb-6 grid grid-cols-3 gap-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-900 dark:text-green-300">Valid</p>
                <p className="text-2xl font-bold text-green-600">{preview.length}</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                <p className="text-sm font-medium text-red-900 dark:text-red-300">Errors</p>
                <p className="text-2xl font-bold text-red-600">{errors.length}</p>
              </div>
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Total Rows</p>
                <p className="text-2xl font-bold text-blue-600">{preview.length + errors.length}</p>
              </div>
            </div>

            {errors.length > 0 && (
              <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-h-40 overflow-y-auto">
                <ul className="text-sm text-red-800 dark:text-red-400 space-y-1">
                  {errors.map((er, i) => (<li key={i}>Row {er.row}: {er.message}</li>))}
                </ul>
              </div>
            )}

            <div className="mb-6 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-dark-700 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">#</th>
                    <th className="px-3 py-2 text-left">Title</th>
                    <th className="px-3 py-2 text-left">Category</th>
                    <th className="px-3 py-2 text-left">Level</th>
                    <th className="px-3 py-2 text-left">Price</th>
                    <th className="px-3 py-2 text-left">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {preview.map((c, i) => (
                    <tr key={i} className="hover:bg-gray-50 dark:hover:bg-dark-700">
                      <td className="px-3 py-2 text-gray-500">{i + 1}</td>
                      <td className="px-3 py-2 text-gray-900 dark:text-white line-clamp-1">{c.title}</td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{c.category}</td>
                      <td className="px-3 py-2"><Badge color="blue">{c.level}</Badge></td>
                      <td className="px-3 py-2 text-gray-600 dark:text-gray-400">{c.price}</td>
                      <td className="px-3 py-2">
                        <Badge color={c.status === 'published' ? 'green' : 'yellow'}>{c.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
              <div className="flex gap-3">
                <Button type="button" variant="outline" onClick={handleClose}>Cancel</Button>
                <Button type="button" onClick={handleImport} disabled={loading || !preview.length}>
                  {loading ? 'Importing…' : `Import ${preview.length} Courses`}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 3 && result && (
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {result.created} course{result.created === 1 ? '' : 's'} created
            </h3>
            {result.errors?.length > 0 && (
              <div className="mt-4 mb-4 text-left p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-h-40 overflow-y-auto">
                <p className="text-sm font-medium text-red-900 dark:text-red-300 mb-1 flex items-center gap-1">
                  <AlertCircle className="w-4 h-4" /> {result.errors.length} row(s) skipped:
                </p>
                <ul className="text-xs text-red-800 dark:text-red-400 space-y-0.5">
                  {result.errors.map((er, i) => (<li key={i}>Row {er.row}: {er.message}</li>))}
                </ul>
              </div>
            )}
            <Button onClick={handleClose}>Done</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
