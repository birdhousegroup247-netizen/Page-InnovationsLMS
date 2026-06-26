import { useState, useEffect } from 'react';
import { adminBadgesAPI } from '../../lib/api';
import { Award, Plus, Trash2, RefreshCw, Edit2, X, Check } from 'lucide-react';
import { Button } from '../../components/ui';
import Container from '../../components/layout/Container';
import { PageHeader } from '../../components/layout';

const CONDITION_TYPES = [
  { value: 'course_complete', label: 'Courses Completed' },
  { value: 'test_pass', label: 'Tests Passed' },
  { value: 'enrollment_count', label: 'Enrollments' },
  { value: 'streak', label: 'Day Streak' },
  { value: 'score_perfect', label: 'Perfect Score (100%)' },
];

const EMPTY_FORM = { slug: '', name: '', description: '', icon: '🏆', condition_type: 'course_complete', condition_value: 1 };

export default function Badges() {
  const [badges, setBadges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await adminBadgesAPI.getAll();
      setBadges(r.data.data.badges || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setShowForm(true);
  };

  const openEdit = (badge) => {
    setEditingId(badge.id);
    setForm({
      slug: badge.slug,
      name: badge.name,
      description: badge.description || '',
      icon: badge.icon || '🏆',
      condition_type: badge.condition_type,
      condition_value: badge.condition_value,
    });
    setError('');
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!form.slug.trim() || !form.name.trim()) {
      setError('Slug and name are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await adminBadgesAPI.update(editingId, form);
      } else {
        await adminBadgesAPI.create(form);
      }
      setShowForm(false);
      fetchAll();
    } catch (e) {
      setError(e.response?.data?.message || 'Failed to save badge');
    }
    setSaving(false);
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete badge "${name}"? Students who already earned it will keep it.`)) return;
    try {
      await adminBadgesAPI.delete(id);
      fetchAll();
    } catch { /* silent */ }
  };

  return (
    <>
      <PageHeader
        icon={Award}
        title="Badges"
        subtitle="Achievements students can earn"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchAll}
              leftIcon={<RefreshCw className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={openCreate}
              leftIcon={<Plus className="h-4 w-4" />}
              className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
            >
              New Badge
            </Button>
          </>
        }
      />

      <Container className="py-8">
        {/* Badge list */}
        {loading ? (
          <div className="text-center text-gray-500 dark:text-text-secondary py-12">Loading...</div>
        ) : badges.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl">
            <Award className="w-12 h-12 mx-auto text-gray-400 dark:text-text-secondary mb-3" />
            <p className="text-gray-500 dark:text-text-secondary mb-4">No badges yet. Create your first one.</p>
            <button onClick={openCreate} className="px-4 py-2 bg-brand-blue text-white rounded-lg text-sm">
              Create Badge
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {badges.map((badge) => (
              <div key={badge.id} className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-4 flex items-start gap-3">
                <span className="text-3xl flex-shrink-0">{badge.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900 dark:text-white font-medium">{badge.name}</p>
                  {badge.description && (
                    <p className="text-gray-500 dark:text-text-secondary text-xs mt-0.5 line-clamp-2">{badge.description}</p>
                  )}
                  <p className="text-xs text-brand-blue mt-1">
                    {CONDITION_TYPES.find((t) => t.value === badge.condition_type)?.label} × {badge.condition_value}
                  </p>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(badge)}
                    title="Edit badge"
                    aria-label="Edit badge"
                    className="p-1.5 text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(badge.id, badge.name)}
                    title="Delete badge"
                    aria-label="Delete badge"
                    className="p-1.5 text-gray-500 dark:text-text-secondary hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{editingId ? 'Edit Badge' : 'New Badge'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-500 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && <p className="text-red-500 dark:text-red-400 text-sm mb-3">{error}</p>}

            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="flex-shrink-0">
                  <label className="text-xs text-gray-600 dark:text-text-secondary block mb-1">Icon</label>
                  <input
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm({ ...form, icon: e.target.value })}
                    className="w-14 px-2 py-2 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white text-center text-lg focus:outline-none focus:border-brand-blue"
                    maxLength={2}
                  />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-600 dark:text-text-secondary block mb-1">Name *</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="e.g. First Course"
                    className="w-full px-3 py-2 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-text-secondary text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-text-secondary block mb-1">Slug * (unique, no spaces)</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  placeholder="e.g. first-course"
                  className="w-full px-3 py-2 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-text-secondary text-sm focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div>
                <label className="text-xs text-gray-600 dark:text-text-secondary block mb-1">Description</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short description of how to earn this"
                  className="w-full px-3 py-2 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-text-secondary text-sm focus:outline-none focus:border-brand-blue"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="text-xs text-gray-600 dark:text-text-secondary block mb-1">Trigger</label>
                  <select
                    value={form.condition_type}
                    onChange={(e) => setForm({ ...form, condition_type: e.target.value })}
                    className="w-full px-3 py-2 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-brand-blue"
                  >
                    {CONDITION_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="text-xs text-gray-600 dark:text-text-secondary block mb-1">Threshold</label>
                  <input
                    type="number"
                    min={1}
                    value={form.condition_value}
                    onChange={(e) => setForm({ ...form, condition_value: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-900 dark:text-white text-sm focus:outline-none focus:border-brand-blue"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-4 py-2 bg-gray-100 dark:bg-dark-700 hover:bg-gray-200 dark:hover:bg-dark-600 text-gray-700 dark:text-text-secondary rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-light text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
              >
                <Check className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Badge'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
