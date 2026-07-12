import { useState } from 'react';
import { Upload, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { Modal, Button, Select } from '../ui';
import { adminEnrollmentsAPI } from '../../lib/api';
import { useToast } from '../ui/Toast';

/**
 * BulkEnroll — enroll many students into ONE course at once.
 * Admin picks a course, then pastes emails or uploads a CSV (any file
 * with an `email` column works — we just harvest every email-looking
 * token). Students are comped exactly like a single manual enroll.
 */
export default function BulkEnroll({ isOpen, onClose, onSuccess, courses = [] }) {
  const { showToast } = useToast();

  const [courseId, setCourseId] = useState('');
  const [emailsText, setEmailsText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const parseEmails = (text) =>
    [...new Set(
      (text.match(/[^\s,;]+@[^\s,;]+\.[^\s,;]+/g) || []).map((e) => e.trim().toLowerCase())
    )];

  const emails = parseEmails(emailsText);

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const found = parseEmails(ev.target.result || '');
      if (found.length === 0) {
        showToast('No email addresses found in that file', 'error');
        return;
      }
      // Merge with anything already typed
      setEmailsText((prev) => {
        const merged = parseEmails(`${prev}\n${found.join('\n')}`);
        return merged.join('\n');
      });
      showToast(`Loaded ${found.length} email(s) from file`, 'success');
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (!courseId) return showToast('Pick a course first', 'error');
    if (emails.length === 0) return showToast('Add at least one email', 'error');
    setLoading(true);
    try {
      const res = await adminEnrollmentsAPI.bulkEnroll({ course_id: courseId, emails });
      setResult(res.data?.data || null);
      showToast(res.data?.message || 'Done', 'success');
      onSuccess?.();
    } catch (err) {
      showToast(err.response?.data?.message || 'Bulk enroll failed', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setCourseId('');
    setEmailsText('');
    setResult(null);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Bulk Enroll Students" size="lg">
      <div className="p-6">
        {!result ? (
          <>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Course
              </label>
              <Select
                value={courseId}
                onChange={(e) => setCourseId(e.target.value)}
                options={[
                  { value: '', label: 'Select a course…' },
                  ...courses.map((c) => ({ value: String(c.id), label: c.title })),
                ]}
              />
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Student emails{' '}
                  <span className="text-gray-400">({emails.length} detected)</span>
                </label>
                <label className="inline-flex items-center gap-1.5 text-sm text-brand-blue cursor-pointer hover:underline">
                  <Upload className="w-4 h-4" />
                  Upload CSV
                  <input type="file" accept=".csv,.txt" onChange={handleFile} className="hidden" />
                </label>
              </div>
              <textarea
                value={emailsText}
                onChange={(e) => setEmailsText(e.target.value)}
                rows={8}
                placeholder={'Paste emails (one per line or comma-separated), or upload a CSV.\nada@example.com\nemeka@example.com'}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-brand-blue dark:bg-dark-700 dark:text-white text-sm font-mono"
              />
              <p className="text-xs text-gray-500 mt-1">
                Students must already have an account. Unknown emails are skipped and listed back to you.
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
              <Button onClick={handleSubmit} disabled={loading || !courseId || emails.length === 0}>
                {loading ? 'Enrolling…' : `Enroll ${emails.length} student${emails.length === 1 ? '' : 's'}`}
              </Button>
            </div>
          </>
        ) : (
          <div>
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg text-center">
                <CheckCircle className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-green-600">{result.enrolled}</p>
                <p className="text-xs text-green-800 dark:text-green-300">Enrolled</p>
              </div>
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg text-center">
                <Users className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-yellow-600">{result.already_enrolled}</p>
                <p className="text-xs text-yellow-800 dark:text-yellow-300">Already in</p>
              </div>
              <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                <AlertCircle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-2xl font-bold text-red-600">
                  {(result.not_found?.length || 0) + (result.errors?.length || 0)}
                </p>
                <p className="text-xs text-red-800 dark:text-red-300">Skipped</p>
              </div>
            </div>

            {result.not_found?.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-h-40 overflow-y-auto">
                <p className="text-sm font-medium text-red-900 dark:text-red-300 mb-1">
                  No account found ({result.not_found.length}):
                </p>
                <p className="text-xs text-red-800 dark:text-red-400 break-words">
                  {result.not_found.join(', ')}
                </p>
              </div>
            )}

            {result.errors?.length > 0 && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg max-h-40 overflow-y-auto">
                <p className="text-sm font-medium text-red-900 dark:text-red-300 mb-1">Errors:</p>
                <ul className="text-xs text-red-800 dark:text-red-400 space-y-0.5">
                  {result.errors.map((er, i) => (
                    <li key={i}>{er.email}: {er.message}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleClose}>Done</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
