import { useState, useEffect } from 'react';
import { adminCouponsAPI } from '../../lib/api';
import { Tag, Plus, Pencil, Trash2, RefreshCw, X, Check, Search } from 'lucide-react';
import { Button, Input, Select, Badge, Spinner, Modal } from '../../components/ui';
import Container from '../../components/layout/Container';
import { PageHeader } from '../../components/layout';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';

const BLANK = {
  code: '', description: '', discount_type: 'percentage', discount_value: '',
  min_purchase_amount: '', max_uses: 1, per_user_limit: 1,
  applies_to: 'all', expires_at: '',
};

export default function Coupons() {
  const { showToast } = useToast();
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
    } catch {
      showToast('Failed to load coupons', 'error');
    }
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
        showToast('Coupon updated', 'success');
      } else {
        await adminCouponsAPI.create(payload);
        showToast('Coupon created', 'success');
      }
      setShowModal(false);
      fetchAll(); fetchStats();
    } catch (e) {
      setError(e.response?.data?.message || 'Save failed');
    }
    setSaving(false);
  };

  const handleToggle = async (c) => {
    try {
      await adminCouponsAPI.update(c.id, { is_active: !c.is_active });
      fetchAll(); fetchStats();
    } catch { showToast('Toggle failed', 'error'); }
  };

  const handleDelete = async (c) => {
    if (!window.confirm(`Deactivate coupon "${c.code}"?`)) return;
    try {
      await adminCouponsAPI.delete(c.id);
      showToast('Coupon deleted', 'success');
      fetchAll(); fetchStats();
    } catch { showToast('Delete failed', 'error'); }
  };

  const fmt = (c) =>
    c.discount_type === 'percentage' ? `${c.discount_value}%` : `$${c.discount_value}`;

  return (
    <>
      <PageHeader
        icon={Tag}
        title="Coupon Manager"
        subtitle={stats ? `${stats.active} active · ${stats.totalRedemptions} total redemptions` : 'Promo codes and one-time discounts'}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={openCreate}
            leftIcon={<Plus className="h-4 w-4" />}
            className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
          >
            New Coupon
          </Button>
        }
      />

      <Container className="py-8">
        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-[1fr,180px,auto] gap-3 items-end">
            <Input
              placeholder="Search code or description..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchAll()}
            />
            <Select
              value={filterActive}
              onChange={(e) => { setFilterActive(e.target.value); fetchAll(); }}
              options={[
                { value: '', label: 'All' },
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ]}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchAll()}
              leftIcon={<RefreshCw className="w-4 h-4" />}
            >
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        {/* Table — Courses-style: progressively hide columns at smaller breakpoints */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                    Discount
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                    Uses
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                    Expires
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center">
                      <Spinner size="lg" />
                    </td>
                  </tr>
                ) : coupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-gray-500 dark:text-gray-400">
                      No coupons yet — click "New Coupon" to create one.
                    </td>
                  </tr>
                ) : coupons.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                    <td className="px-3 py-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
                          <Tag className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-mono font-semibold text-gray-900 dark:text-white truncate">{c.code}</p>
                          {/* On phones (where Discount + Expires columns are
                              hidden) surface the key facts under the code so
                              the row still reads at a glance. */}
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            <span className="sm:hidden text-blue-600 dark:text-blue-400 font-medium">{fmt(c)}</span>
                            {c.description && <span className="sm:hidden"> · </span>}
                            {c.description || (c.expires_at && <span className="sm:hidden">expires {new Date(c.expires_at).toLocaleDateString()}</span>)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className="text-sm text-blue-600 dark:text-blue-400 font-semibold">{fmt(c)}</span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap hidden md:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {c.uses_count}/{c.max_uses ?? '∞'}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap hidden lg:table-cell">
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}
                      </span>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap">
                      <Badge variant={c.is_active ? 'success' : 'default'}>
                        {c.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-3 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center gap-1 justify-end">
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleToggle(c)}
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                          title={c.is_active ? 'Deactivate' : 'Activate'}
                        >
                          {c.is_active ? <X className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="border-t border-gray-200 dark:border-gray-700 p-4">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                onPageChange={(p) => fetchAll(p)}
                size="sm"
              />
            </div>
          )}
        </div>
      </Container>

      {/* Create/Edit Modal — kept native form fields since the inputs are
          simple and dense. Inherits the shared Modal chrome. */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Edit Coupon' : 'New Coupon'}
        size="lg"
      >
        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm mb-4 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded">
            {error}
          </p>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Code *</label>
            <Input
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              disabled={!!editing}
              className="font-mono"
            />
            {editing && <p className="text-xs text-gray-400 mt-1">Code cannot be changed after creation</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Type *</label>
            <Select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
              options={[
                { value: 'percentage', label: 'Percentage (%)' },
                { value: 'flat', label: 'Flat ($)' },
              ]}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Value *</label>
            <Input
              type="number"
              min="0"
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              placeholder={form.discount_type === 'percentage' ? '10 = 10%' : '50 = $50 off'}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Max Uses</label>
            <Input
              type="number"
              min="1"
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              placeholder="Blank = unlimited"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Per-user Limit</label>
            <Input
              type="number"
              min="1"
              value={form.per_user_limit}
              onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Min Purchase ($)</label>
            <Input
              type="number"
              min="0"
              value={form.min_purchase_amount}
              onChange={(e) => setForm({ ...form, min_purchase_amount: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Expires (blank = never)</label>
            <Input
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
          </div>
          <div className="sm:col-span-2">
            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Internal Note</label>
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="e.g. VIP student discount"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6 justify-end">
          <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Coupon'}
          </Button>
        </div>
      </Modal>
    </>
  );
}
