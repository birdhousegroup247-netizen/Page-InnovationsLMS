import { useState, useEffect } from 'react';
import { adminReferralsAPI } from '../../lib/api';
import { Gift, RefreshCw, CheckCircle, Clock } from 'lucide-react';

export default function Referrals() {
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await adminReferralsAPI.getAll();
      setReferrals(r.data.data.referrals || []);
    } catch { /* silent */ }
    setLoading(false);
  };

  const filtered = referrals.filter((ref) => {
    const q = search.toLowerCase();
    return (
      ref.referrer?.full_name?.toLowerCase().includes(q) ||
      ref.referrer?.email?.toLowerCase().includes(q) ||
      ref.referred?.full_name?.toLowerCase().includes(q) ||
      ref.referred?.email?.toLowerCase().includes(q)
    );
  });

  const totalRewarded = referrals.filter((r) => r.status === 'rewarded').length;
  const totalPending = referrals.filter((r) => r.status === 'pending').length;
  const uniqueReferrers = new Set(referrals.map((r) => r.referrer_id)).size;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Gift className="w-6 h-6 text-brand-blue" /> Referrals
        </h1>
        <button
          onClick={fetchAll}
          className="flex items-center gap-2 px-3 py-2 bg-dark-700 hover:bg-dark-600 text-text-secondary rounded-lg text-sm transition-colors"
        >
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <p className="text-xs text-text-secondary mb-1">Total Referrals</p>
          <p className="text-2xl font-bold text-white">{referrals.length}</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <p className="text-xs text-text-secondary mb-1">Rewarded</p>
          <p className="text-2xl font-bold text-green-400">{totalRewarded}</p>
        </div>
        <div className="bg-dark-800 border border-dark-700 rounded-xl p-4">
          <p className="text-xs text-text-secondary mb-1">Pending</p>
          <p className="text-2xl font-bold text-yellow-400">{totalPending}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search by referrer or referred user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-80 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white placeholder-text-secondary focus:outline-none focus:border-brand-blue"
        />
      </div>

      {/* Table */}
      <div className="bg-dark-800 border border-dark-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-secondary">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-text-secondary">No referrals found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-dark-700 text-text-secondary text-xs uppercase">
                  <th className="px-4 py-3 text-left">Referrer</th>
                  <th className="px-4 py-3 text-left">Referred User</th>
                  <th className="px-4 py-3 text-left">Credits</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark-700">
                {filtered.map((ref) => (
                  <tr key={ref.id} className="hover:bg-dark-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-white font-medium">{ref.referrer?.full_name || '—'}</p>
                      <p className="text-text-secondary text-xs">{ref.referrer?.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-white">{ref.referred?.full_name || '—'}</p>
                      <p className="text-text-secondary text-xs">{ref.referred?.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {ref.referrer?.referral_credits ?? 0}
                    </td>
                    <td className="px-4 py-3">
                      {ref.status === 'rewarded' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-900/40 text-green-400">
                          <CheckCircle className="w-3 h-3" /> Rewarded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-yellow-900/40 text-yellow-400">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-text-secondary text-xs">
                      {new Date(ref.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
