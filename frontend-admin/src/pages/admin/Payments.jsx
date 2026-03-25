import { useState, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';
import { adminPaymentsAPI } from '../../lib/api';
import {
  DollarSign,
  TrendingUp,
  RefreshCw,
  Search,
  RotateCcw,
  CreditCard,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Container } from '../../components/layout';
import { Button, Input, Select, Badge, Spinner, Modal } from '../../components/ui';
import { SimplePagination } from '../../components/ui/Pagination';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function Payments() {
  const { showToast } = useToast();
  const [payments, setPayments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [pagination, setPagination] = useState(null);

  const [filters, setFilters] = useState({
    status: '',
    payment_method: '',
    payment_gateway: '',
    date_from: '',
    date_to: '',
    search: '',
    page: 1,
    limit: 20,
  });

  const [refundTarget, setRefundTarget] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [refundLoading, setRefundLoading] = useState(false);

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [filters.page, filters.status, filters.payment_method, filters.payment_gateway, filters.date_from, filters.date_to]);

  useEffect(() => {
    const timer = setTimeout(() => fetchPayments(), 400);
    return () => clearTimeout(timer);
  }, [filters.search]);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await adminPaymentsAPI.getAll(filters);
      setPayments(response.data.data.payments || []);
      setPagination(response.data.data.pagination);
    } catch (error) {
      showToast('Failed to load payments', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const response = await adminPaymentsAPI.getStats();
      setStats(response.data.data);
    } catch (error) {
      console.error('Failed to fetch payment stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundTarget) return;
    try {
      setRefundLoading(true);
      await adminPaymentsAPI.issueRefund(refundTarget.id, refundReason);
      showToast('Refund issued successfully', 'success');
      setRefundTarget(null);
      setRefundReason('');
      fetchPayments();
      fetchStats();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to issue refund', 'error');
    } finally {
      setRefundLoading(false);
    }
  };

  const statusBadge = (status) => {
    const map = {
      completed: 'success',
      pending: 'warning',
      failed: 'danger',
      refunded: 'default',
    };
    return map[status] || 'default';
  };

  const formatCurrency = (val) => `$${parseFloat(val || 0).toFixed(2)}`;

  const formatMonth = (month) => {
    if (!month) return '';
    return new Date(month).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  return (
    <>
      <Container>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Revenue & Payments</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Track revenue, transactions, and manage refunds
            </p>
          </div>
          <Button variant="outline" onClick={() => { fetchPayments(); fetchStats(); }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {statsLoading ? (
          <div className="flex justify-center py-8"><Spinner /></div>
        ) : stats && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              {[
                { label: 'Total Revenue', value: formatCurrency(stats.total_revenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-900/30' },
                { label: 'This Month', value: formatCurrency(stats.this_month_revenue), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
                { label: 'Total Refunds', value: formatCurrency(stats.total_refunds), icon: RotateCcw, color: 'text-red-500', bg: 'bg-red-100 dark:bg-red-900/30' },
                { label: 'Pending Payments', value: stats.pending_payments, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
              ].map(({ label, value, icon: Icon, color, bg }) => (
                <div key={label} className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`p-2 rounded-lg ${bg}`}>
                      <Icon className={`w-5 h-5 ${color}`} />
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
                </div>
              ))}
            </div>

            {/* Revenue Chart + Top Courses */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-2 bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Monthly Revenue (Last 12 Months)</h2>
                {stats.monthly_chart?.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={stats.monthly_chart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                      <XAxis dataKey="month" tickFormatter={formatMonth} tick={{ fontSize: 11 }} />
                      <YAxis tickFormatter={(v) => `$${v}`} tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v) => [`$${parseFloat(v).toFixed(2)}`, 'Revenue']}
                        labelFormatter={formatMonth}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="#3B82F6" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No revenue data yet</div>
                )}
              </div>

              <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-5">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Top Courses by Revenue</h2>
                <div className="space-y-3">
                  {stats.top_courses?.length > 0 ? stats.top_courses.map((c, i) => (
                    <div key={c.course_id} className="flex items-center gap-3">
                      <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{c.title}</p>
                        <p className="text-xs text-gray-500">{c.sales} sales</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">${c.revenue}</span>
                    </div>
                  )) : (
                    <p className="text-sm text-gray-400">No data yet</p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Filters */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <Input
              placeholder="Search student name or email..."
              leftIcon={<Search className="w-4 h-4" />}
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value, page: 1 }))}
            />
            <Select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value, page: 1 }))}
              options={[
                { value: '', label: 'All Status' },
                { value: 'completed', label: 'Completed' },
                { value: 'pending', label: 'Pending' },
                { value: 'failed', label: 'Failed' },
                { value: 'refunded', label: 'Refunded' },
              ]}
            />
            <Select
              value={filters.payment_gateway}
              onChange={(e) => setFilters(prev => ({ ...prev, payment_gateway: e.target.value, page: 1 }))}
              options={[
                { value: '', label: 'All Gateways' },
                { value: 'stripe', label: 'Stripe (International)' },
                { value: 'paystack', label: 'Paystack (Nigeria)' },
              ]}
            />
            <Input
              label="From"
              type="date"
              value={filters.date_from}
              onChange={(e) => setFilters(prev => ({ ...prev, date_from: e.target.value, page: 1 }))}
            />
            <Input
              label="To"
              type="date"
              value={filters.date_to}
              onChange={(e) => setFilters(prev => ({ ...prev, date_to: e.target.value, page: 1 }))}
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => setFilters({ status: '', payment_method: '', payment_gateway: '', date_from: '', date_to: '', search: '', page: 1, limit: 20 })}>
              <RefreshCw className="w-4 h-4 mr-1" />
              Reset Filters
            </Button>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-border-dark overflow-hidden">
          {loading ? (
            <div className="p-10 flex justify-center"><Spinner size="lg" /></div>
          ) : payments.length === 0 ? (
            <div className="p-10 text-center text-gray-500 dark:text-gray-400">No transactions found</div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-dark-700 border-b border-gray-200 dark:border-border-dark">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Student</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Course</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Gateway</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-border-dark">
                    {payments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-dark-700 transition-colors">
                        <td className="px-4 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{payment.student?.full_name || '—'}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{payment.student?.email}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                          <span className="line-clamp-1">{payment.course?.title || '—'}</span>
                        </td>
                        <td className="px-4 py-3 text-sm font-semibold text-gray-900 dark:text-white">
                          {formatCurrency(payment.amount)}
                          {payment.discount_amount > 0 && (
                            <span className="ml-1 text-xs text-gray-400 line-through">{formatCurrency(payment.original_amount)}</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-gray-400" />
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              payment.payment_gateway === 'paystack'
                                ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                                : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                            }`}>
                              {payment.payment_gateway === 'paystack' ? 'Paystack' : 'Stripe'}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusBadge(payment.payment_status)}>
                            {payment.payment_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
                          {payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {payment.payment_status === 'completed' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setRefundTarget(payment); setRefundReason(''); }}
                              className="text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <RotateCcw className="w-3.5 h-3.5 mr-1" />
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {pagination && (
                <div className="px-4 py-3 border-t border-gray-200 dark:border-border-dark">
                  <SimplePagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={(p) => setFilters(prev => ({ ...prev, page: p }))}
                  />
                </div>
              )}
            </>
          )}
        </div>
      </Container>

      {/* Refund Confirmation Modal */}
      <Modal isOpen={!!refundTarget} onClose={() => setRefundTarget(null)} title="Issue Refund" size="sm">
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700 dark:text-red-300">
              Refund <strong>{formatCurrency(refundTarget?.amount)}</strong> to <strong>{refundTarget?.student?.full_name}</strong> for <strong>{refundTarget?.course?.title}</strong>?
              This will trigger a {refundTarget?.payment_gateway === 'paystack' ? 'Paystack' : 'Stripe'} refund and cannot be undone.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason (optional)</label>
            <textarea
              value={refundReason}
              onChange={(e) => setRefundReason(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
              placeholder="Enter reason for refund..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setRefundTarget(null)} disabled={refundLoading}>Cancel</Button>
            <Button variant="danger" onClick={handleRefund} isLoading={refundLoading}>Confirm Refund</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
