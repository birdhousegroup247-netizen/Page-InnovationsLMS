import { useState, useEffect } from 'react';
import { adminBundlesAPI, adminCoursesAPI } from '../../lib/api';
import { Package, Plus, Pencil, Trash2, X, Check, BookOpen } from 'lucide-react';

const BLANK = { title: '', description: '', thumbnail_url: '', price: '', course_ids: [] };

export default function Bundles() {
  const [bundles, setBundles] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { fetchBundles(); fetchCourses(); }, []);

  const fetchBundles = async () => {
    setLoading(true);
    try {
      const res = await adminBundlesAPI.getAll();
      setBundles(res.data.data.bundles || []);
    } catch { setBundles([]); }
    finally { setLoading(false); }
  };

  const fetchCourses = async () => {
    try {
      const res = await adminCoursesAPI.getAll({ limit: 200 });
      const list = res.data.data?.courses || res.data.data || [];
      setCourses(Array.isArray(list) ? list : []);
    } catch { setCourses([]); }
  };

  const openCreate = () => { setEditing(null); setForm(BLANK); setError(''); setShowModal(true); };
  const openEdit = (b) => {
    setEditing(b);
    setForm({
      title: b.title,
      description: b.description || '',
      thumbnail_url: b.thumbnail_url || '',
      price: b.price,
      course_ids: (b.courses || []).map((c) => c.id),
    });
    setError('');
    setShowModal(true);
  };

  const toggleCourse = (id) => {
    setForm((f) => ({
      ...f,
      course_ids: f.course_ids.includes(id)
        ? f.course_ids.filter((x) => x !== id)
        : [...f.course_ids, id],
    }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.title.trim()) return setError('Title is required');
    if (!form.price && form.price !== 0) return setError('Price is required');
    if (form.course_ids.length < 2) return setError('Select at least 2 courses');

    setSaving(true);
    try {
      const payload = { ...form, price: parseFloat(form.price) };
      if (editing) {
        await adminBundlesAPI.update(editing.id, payload);
      } else {
        await adminBundlesAPI.create(payload);
      }
      setShowModal(false);
      fetchBundles();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save bundle');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this bundle?')) return;
    try {
      await adminBundlesAPI.delete(id);
      fetchBundles();
    } catch { alert('Failed to deactivate bundle'); }
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package className="h-6 w-6 text-brand-blue" />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Course Bundles</h1>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue/90 text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Bundle
        </button>
      </div>

      {/* Bundles Grid */}
      {loading ? (
        <div className="text-center py-20 text-gray-500">Loading...</div>
      ) : bundles.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Package className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p>No bundles yet. Create your first bundle.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {bundles.map((b) => {
            const totalValue = (b.courses || []).reduce((s, c) => s + Number(c.price || 0), 0);
            const savings = Math.max(0, totalValue - Number(b.price));
            return (
              <div key={b.id} className="bg-white dark:bg-dark-800 rounded-xl shadow-sm border border-gray-100 dark:border-dark-700 overflow-hidden">
                {b.thumbnail_url && (
                  <img src={b.thumbnail_url} alt={b.title} className="w-full h-32 object-cover" />
                )}
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm line-clamp-2">{b.title}</h3>
                    <span className={`ml-2 flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${b.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{b.description}</p>

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg font-bold text-brand-blue">${Number(b.price).toFixed(2)}</span>
                    {savings > 0 && (
                      <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                        Save ${savings.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 text-xs text-gray-500 mb-4">
                    <BookOpen className="h-3.5 w-3.5" />
                    {(b.courses || []).length} courses included
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(b)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 border border-gray-200 dark:border-dark-600 rounded-lg text-xs hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(b.id)}
                      className="flex items-center justify-center px-3 py-1.5 border border-red-200 rounded-lg text-xs text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-dark-700">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editing ? 'Edit Bundle' : 'Create Bundle'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bundle Title *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-600 rounded-lg text-sm dark:bg-dark-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  placeholder="e.g. Full-Stack Developer Bootcamp"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-dark-600 rounded-lg text-sm dark:bg-dark-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bundle Price ($) *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.price}
                    onChange={(e) => setForm({ ...form, price: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-600 rounded-lg text-sm dark:bg-dark-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    placeholder="99.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Thumbnail URL</label>
                  <input
                    value={form.thumbnail_url}
                    onChange={(e) => setForm({ ...form, thumbnail_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-dark-600 rounded-lg text-sm dark:bg-dark-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
                    placeholder="https://..."
                  />
                </div>
              </div>

              {/* Course Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Courses * <span className="text-gray-400 font-normal">(minimum 2)</span>
                </label>
                <div className="border border-gray-200 dark:border-dark-600 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-50 dark:divide-dark-700">
                  {courses.length === 0 ? (
                    <p className="p-3 text-xs text-gray-400">Loading courses...</p>
                  ) : (
                    courses.map((c) => {
                      const selected = form.course_ids.includes(c.id);
                      return (
                        <label key={c.id} className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors ${selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${selected ? 'bg-brand-blue border-brand-blue' : 'border-gray-300'}`}>
                            {selected && <Check className="h-3 w-3 text-white" />}
                          </div>
                          <input type="checkbox" className="sr-only" checked={selected} onChange={() => toggleCourse(c.id)} />
                          <div className="min-w-0">
                            <p className="text-sm text-gray-900 dark:text-white truncate">{c.title}</p>
                            <p className="text-xs text-gray-400">${Number(c.price || 0).toFixed(2)}</p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
                {form.course_ids.length > 0 && (
                  <p className="text-xs text-brand-blue mt-1">{form.course_ids.length} course(s) selected</p>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-100 dark:border-dark-700">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-brand-blue/90 disabled:opacity-60 transition-colors"
              >
                {saving ? 'Saving...' : editing ? 'Update Bundle' : 'Create Bundle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
