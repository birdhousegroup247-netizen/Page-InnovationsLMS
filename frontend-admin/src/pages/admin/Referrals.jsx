import { useState, useEffect } from 'react';
import { adminReferralsAPI } from '../../lib/api';
import { Gift, RefreshCw, CheckCircle, Clock, Search } from 'lucide-react';
import { Button, Input, Badge, Spinner } from '../../components/ui';
import Container from '../../components/layout/Container';
import { PageHeader } from '../../components/layout';
import { useToast } from '../../components/ui/Toast';

export default function Referrals() {
  const { showToast } = useToast();
  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const r = await adminReferralsAPI.getAll();
      setReferrals(r.data.data.referrals || []);
    } catch {
      showToast('Failed to load referrals', 'error');
    }
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

  return (
    <>
      <PageHeader
        icon={Gift}
        title="Referrals"
        subtitle={`${referrals.length} total · ${totalRewarded} rewarded · ${totalPending} pending`}
        actions={
          <Button
            variant="ghost"
            size="sm"
            onClick={fetchAll}
            leftIcon={<RefreshCw className="h-4 w-4" />}
            className="!bg-white/10 !backdrop-blur-md !text-white !border !border-white/20 hover:!bg-white/20 !shadow-none"
          >
            Refresh
          </Button>
        }
      />

      <Container className="py-8">
        {/* Search */}
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-xl p-4 mb-6">
          <Input
            placeholder="Search by referrer or referred user..."
            leftIcon={<Search className="w-4 h-4" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Referrer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Referred</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Credits</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr><td colSpan={5} className="p-12 text-center"><Spinner size="lg" /></td></tr>
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={5} className="p-12 text-center text-gray-500 dark:text-gray-400">No referrals yet.</td></tr>
                ) : filtered.map((ref) => (
                  <tr key={ref.id} className="hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{ref.referrer?.full_name || '—'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {/* On phones (Referred + Credits + Date hidden) surface the referred user inline */}
                        <span className="md:hidden">→ {ref.referred?.full_name || '—'}</span>
                        <span className="hidden md:inline">{ref.referrer?.email || '—'}</span>
                      </p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-900 dark:text-white truncate">{ref.referred?.full_name || '—'}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{ref.referred?.email || '—'}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 hidden lg:table-cell">
                      {ref.referrer?.referral_credits ?? 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {ref.status === 'rewarded' ? (
                        <Badge variant="success">
                          <span className="inline-flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Rewarded</span>
                        </Badge>
                      ) : (
                        <Badge variant="warning">
                          <span className="inline-flex items-center gap-1"><Clock className="w-3 h-3" /> Pending</span>
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 dark:text-gray-400 hidden lg:table-cell">
                      {new Date(ref.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Container>
    </>
  );
}
