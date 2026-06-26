import { useState, useEffect } from 'react';
import { adminLeadsAPI } from '../../lib/api';
import { UserPlus, RefreshCw, CheckCircle, Trash2, TrendingUp, Search } from 'lucide-react';
import { Button, Input, Select } from '../../components/ui';
import Container from '../../components/layout/Container';
import { PageHeader } from '../../components/layout';

const STATUS_LABELS = {
  registered: { label: 'Registered', color: 'bg-gray-200 text-gray-700 dark:bg-gray-700 dark:text-gray-300' },
  welcome_sent: { label: 'Welcome Sent', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  d1_sent: { label: 'D1 Sent', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400' },
  d3_sent: { label: 'D3 Sent', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400' },
  d7_sent: { label: 'D7 Sent', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
  d14_sent: { label: 'D14 Sent', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400' },
  converted: { label: 'Converted', color: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' },
  unsubscribed: { label: 'Unsubscribed', color: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400' },
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  useEffect(() => { fetchAll(); fetchStats(); }, []);

  const fetchAll = async (page = 1) => {
    setLoading(true);
    try {
      const params = { page, limit: 25 };
      if (search) params.search = search;
      if (filterStatus) params.drip_status = filterStatus;
      const r = await adminLeadsAPI.getAll(params);
      setLeads(r.data.data.leads);
      setPagination(r.data.data.pagination);
    } catch { /* silent */ }
    setLoading(false);
  };

  const fetchStats = async () => {
    try {
      const r = await adminLeadsAPI.getStats();
      setStats(r.data.data);
    } catch { /* silent */ }
  };

  const handleConvert = async (id) => {
    if (!confirm('Mark this lead as manually converted?')) return;
    try { await adminLeadsAPI.markConverted(id); fetchAll(); fetchStats(); }
    catch { /* silent */ }
  };

  const handleDelete = async (id) => {
    if (!confirm('Permanently delete this lead?')) return;
    try { await adminLeadsAPI.delete(id); fetchAll(); fetchStats(); }
    catch { /* silent */ }
  };

  return (
    <>
      <PageHeader
        icon={UserPlus}
        title="Leads Dashboard"
        subtitle={stats ? `${stats.total} total · ${stats.conversionRate}% conversion` : 'Track and convert leads'}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { fetchAll(); fetchStats(); }}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
          >
            Refresh
          </Button>
        }
      />
      <Container className="py-8">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-text-secondary mb-1">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
          </div>
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-text-secondary mb-1">Converted</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.converted}</p>
          </div>
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-text-secondary mb-1">Conversion Rate</p>
            <p className="text-2xl font-bold text-brand-blue">{stats.conversionRate}%</p>
          </div>
          <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-4">
            <p className="text-xs text-gray-500 dark:text-text-secondary mb-1">Last 7 Days</p>
            <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.recentLeads}</p>
          </div>
        </div>
      )}

      {/* Drip Funnel Mini-Chart */}
      {stats?.byStatus && (
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-4 mb-6">
          <p className="text-sm font-medium text-gray-600 dark:text-text-secondary mb-3 flex items-center gap-1.5"><TrendingUp className="w-4 h-4" /> Drip Funnel</p>
          <div className="flex items-end gap-2 h-14">
            {stats.byStatus.filter(s => s.status !== 'unsubscribed').map((s) => {
              const max = Math.max(...stats.byStatus.map(x => x.count), 1);
              const h = Math.max((s.count / max) * 100, 4);
              const cfg = STATUS_LABELS[s.status];
              const barColor = cfg?.color.split(' ').find((c) => c.startsWith('bg-') && !c.startsWith('bg-white')) || 'bg-brand-blue';
              return (
                <div key={s.status} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-gray-600 dark:text-text-secondary">{s.count}</span>
                  <div className={`w-full rounded-t ${barColor}`} style={{ height: `${h}%` }} title={cfg?.label} />
                  <span className="text-xs text-gray-400 dark:text-text-muted leading-tight text-center" style={{ fontSize: '9px' }}>{cfg?.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchAll(1)}
          placeholder="Search name, email, phone..."
          className="flex-1 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm placeholder-gray-400 dark:placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
        <select
          value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); fetchAll(); }}
          className="bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 text-gray-900 dark:text-white rounded-lg px-3 py-2 text-sm"
        >
          <option value="">All Statuses</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
        </select>
        <button onClick={() => fetchAll()} className="p-2 bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-600 dark:text-text-secondary hover:text-gray-900 dark:hover:text-white">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-dark-700 text-gray-600 dark:text-text-secondary">
              <th className="text-left p-4 font-medium">Name / Email</th>
              <th className="text-left p-4 font-medium hidden sm:table-cell">Phone</th>
              <th className="text-left p-4 font-medium hidden md:table-cell">Country</th>
              <th className="text-left p-4 font-medium">Status</th>
              <th className="text-left p-4 font-medium hidden lg:table-cell">Registered</th>
              <th className="text-left p-4 font-medium hidden lg:table-cell">Converted</th>
              <th className="text-right p-4 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500 dark:text-text-secondary">Loading...</td></tr>
            ) : leads.length === 0 ? (
              <tr><td colSpan={7} className="p-8 text-center text-gray-500 dark:text-text-secondary">No leads found</td></tr>
            ) : leads.map((l) => {
              const cfg = STATUS_LABELS[l.drip_status] || STATUS_LABELS.registered;
              return (
                <tr key={l.id} className="border-b border-gray-100 dark:border-dark-700 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                  <td className="p-4">
                    <p className="font-medium text-gray-900 dark:text-white">{l.full_name}</p>
                    <p className="text-xs text-gray-500 dark:text-text-secondary">{l.email}</p>
                    {l.course_interest && (
                      <p className="text-xs text-brand-blue mt-0.5">{l.course_interest.title}</p>
                    )}
                  </td>
                  <td className="p-4 text-gray-600 dark:text-text-secondary hidden sm:table-cell">{l.phone || '—'}</td>
                  <td className="p-4 text-gray-600 dark:text-text-secondary hidden md:table-cell">{l.country || '—'}</td>
                  <td className="p-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                      {cfg.label}
                    </span>
                  </td>
                  <td className="p-4 text-gray-500 dark:text-text-secondary text-xs hidden lg:table-cell">
                    {new Date(l.registered_at).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-gray-500 dark:text-text-secondary text-xs hidden lg:table-cell">
                    {l.converted_at ? new Date(l.converted_at).toLocaleDateString() : '—'}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-1.5 justify-end">
                      {l.drip_status !== 'converted' && (
                        <button onClick={() => handleConvert(l.id)}
                          title="Mark Converted"
                          className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-600 text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300">
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => handleDelete(l.id)}
                        className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-dark-600 text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-dark-700 text-sm text-gray-600 dark:text-text-secondary">
            <span>{pagination.total} total leads</span>
            <div className="flex gap-2">
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button key={p} onClick={() => fetchAll(p)}
                  className={`w-8 h-8 rounded ${pagination.page === p ? 'bg-brand-blue text-white' : 'hover:bg-gray-100 dark:hover:bg-dark-600 text-gray-700 dark:text-gray-300'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      </Container>
    </>
  );
}
