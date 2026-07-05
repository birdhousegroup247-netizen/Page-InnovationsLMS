import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FileCheck, Save, Trash2 } from 'lucide-react';
import { assignedTestsAPI } from '../../lib/api';
import { Container } from '../../components/layout';
import { Button, Spinner } from '../../components/ui';
import { toLocalInput, toUTCISO } from '../../utils/datetimeLocal';

// Focused edit page: lets an instructor update the high-level
// settings on an existing test (name, description, dates, time
// limit, passing score, max attempts, status, randomize options).
// Editing questions/students is intentionally not exposed here —
// changing those after attempts have been recorded breaks scoring.
// For a structural rebuild the instructor can delete + recreate.
export default function EditTest() {
  const { testId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    test_name: '',
    description: '',
    time_limit_minutes: 60,
    passing_score: 70,
    max_attempts: 1,
    start_date: '',
    end_date: '',
    status: 'draft',
    randomize_questions: true,
    randomize_options: true,
    show_results_immediately: true,
    show_correct_answers: true,
    show_explanations: true,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await assignedTestsAPI.getTestById(testId);
        const t = res?.data?.data?.test;
        if (!t) throw new Error('Test not found');
        if (!alive) return;
        setForm({
          test_name: t.test_name || t.title || '',
          description: t.description || '',
          time_limit_minutes: t.time_limit_minutes || 60,
          passing_score: t.passing_score || 70,
          max_attempts: t.max_attempts || 1,
          start_date: toLocalInput(t.start_date),
          end_date: toLocalInput(t.end_date || t.due_date),
          status: t.status || 'draft',
          randomize_questions: t.randomize_questions ?? true,
          randomize_options: t.randomize_options ?? true,
          show_results_immediately: t.show_results_immediately ?? true,
          show_correct_answers: t.show_correct_answers ?? true,
          show_explanations: t.show_explanations ?? true,
        });
      } catch (e) {
        setError(e?.response?.data?.message || e?.message || 'Failed to load test');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [testId]);

  const update = (field, value) => setForm((p) => ({ ...p, [field]: value }));

  const onSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        test_name: form.test_name.trim(),
        description: form.description,
        time_limit_minutes: parseInt(form.time_limit_minutes) || 60,
        passing_score: parseInt(form.passing_score) || 70,
        max_attempts: parseInt(form.max_attempts) || 1,
        start_date: toUTCISO(form.start_date),
        end_date: toUTCISO(form.end_date),
        status: form.status,
        randomize_questions: !!form.randomize_questions,
        randomize_options: !!form.randomize_options,
        show_results_immediately: !!form.show_results_immediately,
        show_correct_answers: !!form.show_correct_answers,
        show_explanations: !!form.show_explanations,
      };
      await assignedTestsAPI.updateTest(testId, payload);
      navigate('/instructor/tests', { state: { message: 'Test updated' } });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!window.confirm('Delete this test? Students who were assigned will lose access. This cannot be undone.')) return;
    setDeleting(true);
    try {
      await assignedTestsAPI.deleteTest(testId);
      navigate('/instructor/tests', { state: { message: 'Test deleted' } });
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to delete test');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <Container className="py-12 flex justify-center">
        <Spinner size="lg" />
      </Container>
    );
  }

  return (
    <>
      <div className="bg-gradient-to-br from-brand-blue via-brand-purple to-brand-red relative overflow-hidden">
        <Container className="py-10 sm:py-12 relative">
          <button
            onClick={() => navigate('/instructor/tests')}
            className="text-white/80 hover:text-white text-sm flex items-center gap-1 mb-3"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Tests
          </button>
          <div className="flex items-center gap-3">
            <FileCheck className="h-8 w-8 text-white" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Edit Test</h1>
              <p className="text-white/80 text-sm">Update settings, schedule, and visibility.</p>
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-8">
        {error && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-800 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={onSave} className="space-y-6 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">
              Test Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={form.test_name}
              onChange={(e) => update('test_name', e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">Description</label>
            <textarea
              rows={3}
              value={form.description || ''}
              onChange={(e) => update('description', e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">Start Date</label>
              <input
                type="datetime-local"
                value={form.start_date}
                onChange={(e) => update('start_date', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">Due Date</label>
              <input
                type="datetime-local"
                value={form.end_date}
                onChange={(e) => update('end_date', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">Time Limit (min)</label>
              <input
                type="number"
                min={1}
                value={form.time_limit_minutes}
                onChange={(e) => update('time_limit_minutes', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">Passing Score (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.passing_score}
                onChange={(e) => update('passing_score', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">Max Attempts</label>
              <input
                type="number"
                min={1}
                value={form.max_attempts}
                onChange={(e) => update('max_attempts', e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-text-dark-primary mb-2">Status</label>
            <select
              value={form.status}
              onChange={(e) => update('status', e.target.value)}
              className="w-full px-4 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-gray-100"
            >
              <option value="draft">Draft (hidden from students)</option>
              <option value="published">Published (visible to assigned students)</option>
              <option value="archived">Archived (hidden + read-only)</option>
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                  checked={!!form[opt.key]}
                  onChange={(e) => update(opt.key, e.target.checked)}
                  className="w-4 h-4 text-brand-blue border-gray-300 rounded focus:ring-brand-blue"
                />
                {opt.label}
              </label>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row justify-between gap-3 pt-4 border-t border-gray-200 dark:border-border-dark">
            <Button
              type="button"
              variant="outline"
              leftIcon={<Trash2 className="h-4 w-4" />}
              onClick={onDelete}
              disabled={saving || deleting}
            >
              {deleting ? 'Deleting…' : 'Delete Test'}
            </Button>
            <div className="flex gap-3">
              <Button type="button" variant="ghost" onClick={() => navigate('/instructor/tests')} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" leftIcon={!saving && <Save className="h-4 w-4" />} disabled={saving} loading={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </Button>
            </div>
          </div>
        </form>
      </Container>
    </>
  );
}
