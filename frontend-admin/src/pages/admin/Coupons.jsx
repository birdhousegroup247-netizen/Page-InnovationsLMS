import { useState, useEffect } from 'react';
import { adminCouponsAPI } from '../../lib/api';
import { Tag, Plus, Pencil, Trash2, RefreshCw, X, Check } from 'lucide-react';

const BLANK = {
  code: '', description: '', discount_type: 'percentage', discount_value: '',
  min_purchase_amount: '', max_uses: 1, per_user_limit: 1,
  applies_to: 'all', expires_at: '',
};

export default function Coupons() {
  const [coupons, setCoupons] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, obj = edit
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  useEffect(() => { fetchAll(); fetchStats(); }, []);

  const fetchAll = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (filterActive !== '') params.is_active = filterActive;
      const r = await adminCouponsAPI.getAll(params);
      setCoupons(r.data.data.coupons);
      setPagination(r.data.data.pagination);
    } catch { /* silent */ }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const r = await adminCouponsAPI.getStats();
      setStats(r.data.data);
    } catch { /* silent */ }
  };

  const openCreate = () => { setEditing(null); setForm(BLANK); setError(''); setShowModal(true); };
  const openEdit = (c) => {
    setEditing(c);
    setForm({
      code: c.code, description: c.description || '', discount_type: c.discount_type,
      discount_value: c.discount_value, min_purchase_amount: c.min_purchase_amount || '',
      max_uses: c.max_uses || '', per_user_limit: c.per_user_limit,
      applies_to: c.applies_to, expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
    });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.code || !form.discount_value) { setError('Code and discount value are required'); return; }
    setSaving(true); setError('');
    try {
      const payload = {
        ...form,
        discount_value: parseFloat(form.discount_value),
        min_purchase_amount: form.min_purchase_amount ? parseFloat(form.min_purchase_amount) : 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        expires_at: form.expires_at || null,
      };
      if (editing) {
        await adminCouponsAPI.update(editing.id, payload);
      } else {
        await adminCouponsAPI.create(payload);
      }
      setShowModal(false);
      fetchAll(); fetchStats();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const handleToggle = async (c) => {
    try { await adminCouponsAPI.update(c.id, { is_active: !c.is_active }); fetchAll(); fetchStats(); }
    catch { /* silent */ }
  };

  const handleDelete = async (c) => {
    if (!confirm(`Deactivate coupon "${c.code}"?`)) return;
    try { await adminCouponsAPI.delete(c.id); fetchAll(); fetchStats(); }
    catch { /* silent */ }
  };

  const fmt = (c) =>
    c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Tag className="w-6 h-6 text-brand-blue" /> Coupon Manager
          </h1>
          {stats && (
            <p className="text-text-secondary text-sm mt-1">
              {stats.active} active · {stats.totalRedemptions} total redemptions
            </p>
          )}
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Coupon
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchAll()}
          placeholder="Search code or description..."
          className="flex-1 bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 text-sm placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
        <select
          value={filterActive}
          onChange={(e) => { setFilterActive(e.target.value); fetchAll(); }}
          className="bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
        <button onClick={() => fetchAll()} className="p-2 bg-dark-700 border border-dark-600 rounded-lg text-text-secondary hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-dark-800 rounded-xl border border-dark-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-dark-700 text-text-secondary">
              <th className="text-left p-4 font-medium">Code</th>
              <th className="text-left p-4 font-medium">Discount</th>
              <th className="text-left p-4 font-medium">Uses</th>
              <th className="text-left p-4 font-medium">Expires</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-secondary">Loading...</td></tr>
            ) : coupons.length === 0 ? (
              <tr><td colSpan={6} className="p-8 text-center text-text-secondary">No coupons found</td></tr>
            ) : coupons.map((c) => (
              <tr key={c.id} className="border-b border-dark-700 hover:bg-dark-700/50 transition-colors">
                <td className="p-4">
                  <span className="font-mono font-bold text-white">{c.code}</span>
                  {c.description && <p className="text-xs text-text-secondary mt-0.5">{c.description}</p>}
                </td>
                <td className="p-4 text-brand-blue font-semibold">{fmt(c)}</td>
                <td className="p-4 text-text-secondary">
                  {c.uses_count}/{c.max_uses ?? '∞'}
                </td>
                <td className="p-4 text-text-secondary text-xs">
                  {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}
                </td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.is_active ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2 justify-end">
                    <button onClick={() => openEdit(c)} className="p-1.5 rounded hover:bg-dark-600 text-text-secondary hover:text-white">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => handleToggle(c)} className="p-1.5 rounded hover:bg-dark-600 text-text-secondary hover:text-white" title={c.is_active ? 'Deactivate' : 'Activate'}>
                      {c.is_active ? <X className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    </button>
                    <button onClick={() => handleDelete(c)} className="p-1.5 rounded hover:bg-dark-600 text-red-400 hover:text-red-300">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-dark-700 text-sm text-text-secondary">
            <span>{pagination.total} total</span>
            <div className="flex gap-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => fetchAll(p)}
                  className={`w-8 h-8 rounded ${pagination.page === p ? 'bg-brand-blue text-white' : 'hover:bg-dark-600'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-dark-800 rounded-xl border border-dark-700 w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-white">{editing ? 'Edit Coupon' : 'New Coupon'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 rounded hover:bg-dark-700 text-text-secondary"><X className="w-4 h-4" /></button>
            </div>

            {error && <p className="text-red-400 text-sm mb-4 bg-red-900/20 px-3 py-2 rounded">{error}</p>}

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-xs text-text-secondary mb-1 block">Code *</label>
                <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  disabled={!!editing}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-50" />
                {editing && <p className="text-xs text-text-muted mt-1">Code cannot be changed after creation</p>}
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Type *</label>
                <select value={form.discount_type} onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 text-sm">
                  <option value="percentage">Percentage (%)</option>
                  <option value="flat">Flat ($)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Value *</label>
                <input type="number" min="0" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                  placeholder={form.discount_type === 'percentage' ? '10 = 10%' : '50 = $50 off'}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Max Uses (1 = one-time, blank = unlimited)</label>
                <input type="number" min="1" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Per-user Limit</label>
                <input type="number" min="1" value={form.per_user_limit} onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Min Purchase ($)</label>
                <input type="number" min="0" value={form.min_purchase_amount} onChange={(e) => setForm({ ...form, min_purchase_amount: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-xs text-text-secondary mb-1 block">Expires (blank = never)</label>
                <input type="date" value={form.expires_at} onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
              <div className="col-span-2">
                <label className="text-xs text-text-secondary mb-1 block">Internal Note</label>
                <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="e.g. VIP student discount"
                  className="w-full bg-dark-700 border border-dark-600 text-white rounded-lg px-3 py-2 text-sm" />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2 bg-dark-700 border border-dark-600 text-text-secondary rounded-lg text-sm hover:bg-dark-600">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Saving...' : editing ? 'Save Changes' : 'Create Coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
