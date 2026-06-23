import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsAPI } from '../lib/api';
import { CreditCard, CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw, Receipt } from 'lucide-react';

const STATUS_CONFIG = {
  completed: { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3.5 h-3.5" /> },
  failed: { label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
  refunded: { label: 'Refunded', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: <RefreshCw className="w-3.5 h-3.5" /> },
};

const INSTALLMENT_CONFIG = {
  not_applicable: null,
  pending: { label: 'Balance Due', color: 'text-amber-600 dark:text-amber-400' },
  overdue: { label: 'Overdue!', color: 'text-red-600 dark:text-red-400' },
  completed: { label: 'Paid', color: 'text-green-600 dark:text-green-400' },
};

export default function Billing() {
  const navigate = useNavigate();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    paymentsAPI
      .getMyPayments()
      .then((res) => setPayments(res.data?.data?.payments || []))
      .catch((err) => {
        // Surface the real API message so we don't sit on the generic
        // "Unable to load payment history" with no clue what broke.
        const msg = err.response?.data?.message || err.message || 'Unable to load payment history';
        console.error('Billing: getMyPayments failed', err);
        setError(msg);
      })
      .finally(() => setLoading(false));
  }, []);

  const totalPaid = payments
    .filter((p) => p.payment_status === 'completed')
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const hasOutstandingInstallment = payments.some(
    (p) =>
      p.payment_plan === 'installment' &&
      p.payment_status === 'completed' &&
      ['pending', 'overdue'].includes(p.installment_status)
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-brand-blue" />
            Billing & Payments
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            View your payment history and manage installment balances
          </p>
        </div>
      </div>

      {/* Outstanding installment alert */}
      {hasOutstandingInstallment && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
          <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-amber-800 dark:text-amber-300 text-sm">
              You have an outstanding installment balance
            </p>
            <p className="text-amber-700 dark:text-amber-400 text-xs mt-0.5">
              Pay your remaining balance to keep full access to your course.
            </p>
          </div>
          <button
            onClick={() => navigate('/checkout?installment_payment=1')}
            className="flex-shrink-0 flex items-center gap-1.5 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <CreditCard className="w-4 h-4" />
            Pay Now
          </button>
        </div>
      )}

      {/* Summary card */}
      {!loading && payments.length > 0 && (
        <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-5 mb-6">
          <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Total Paid</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white">${totalPaid.toFixed(2)}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {payments.filter((p) => p.payment_status === 'completed').length} completed payment(s)
          </p>
        </div>
      )}

      {/* Payment list */}
      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-10 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent mb-3"></div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Loading payments...</p>
          </div>
        ) : error ? (
          <div className="p-10 text-center">
            <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="p-10 text-center">
            <CreditCard className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">No payments yet</p>
            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
              Enroll in a course to get started.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-dark-700">
            {payments.map((p) => {
              const statusCfg = STATUS_CONFIG[p.payment_status] || STATUS_CONFIG.pending;
              const installmentCfg = INSTALLMENT_CONFIG[p.installment_status];
              const isInstallmentDue =
                p.payment_plan === 'installment' &&
                p.payment_status === 'completed' &&
                ['pending', 'overdue'].includes(p.installment_status);

              return (
                <div key={p.id} className="p-5 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
                  <div className="flex items-start gap-4">
                    {/* Course thumbnail */}
                    {p.course?.thumbnail ? (
                      <img
                        src={p.course.thumbnail}
                        alt={p.course.title}
                        className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-gray-100 dark:bg-dark-700 flex items-center justify-center flex-shrink-0">
                        <CreditCard className="w-5 h-5 text-gray-400" />
                      </div>
                    )}

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                          {p.course?.title || 'Course (no longer available)'}
                        </p>
                        <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
                          ${parseFloat(p.amount).toFixed(2)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {/* Status badge */}
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                          {statusCfg.icon}
                          {statusCfg.label}
                        </span>

                        {/* Payment plan */}
                        {p.payment_plan === 'installment' && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-700 px-2 py-0.5 rounded-full">
                            Installment
                          </span>
                        )}

                        {/* Payment date */}
                        {p.payment_date && (
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            {new Date(p.payment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </span>
                        )}
                      </div>

                      {/* Installment info */}
                      {p.payment_plan === 'installment' && p.payment_status === 'completed' && (
                        <div className="mt-2 p-2.5 bg-gray-50 dark:bg-dark-700 rounded-lg text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Paid upfront</span>
                            <span className="text-gray-700 dark:text-gray-300">${parseFloat(p.amount).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500 dark:text-gray-400">Remaining balance</span>
                            <span className={`font-medium ${installmentCfg?.color || 'text-gray-700 dark:text-gray-300'}`}>
                              ${parseFloat(p.installment_remaining_amount || 0).toFixed(2)}
                              {installmentCfg && ` — ${installmentCfg.label}`}
                            </span>
                          </div>
                          {p.installment_due_date && p.installment_status !== 'completed' && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Due date</span>
                              <span className={p.installment_status === 'overdue' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                {new Date(p.installment_due_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                          {p.installment_paid_at && (
                            <div className="flex justify-between">
                              <span className="text-gray-500 dark:text-gray-400">Balance paid</span>
                              <span className="text-green-600 dark:text-green-400">
                                {new Date(p.installment_paid_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Refund info */}
                      {p.payment_status === 'refunded' && p.refund_amount && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
                          Refunded ${parseFloat(p.refund_amount).toFixed(2)}
                          {p.refund_date ? ` on ${new Date(p.refund_date).toLocaleDateString()}` : ''}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Pay now CTA for overdue installments */}
                  {isInstallmentDue && (
                    <div className="mt-3 ml-16">
                      <button
                        onClick={() => navigate('/checkout?installment_payment=1')}
                        className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        Pay Remaining ${parseFloat(p.installment_remaining_amount || 0).toFixed(2)}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
