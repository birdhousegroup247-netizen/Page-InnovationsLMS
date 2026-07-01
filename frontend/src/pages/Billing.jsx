import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { paymentsAPI, referralsAPI } from '../lib/api';
import { formatCurrency as fmtCurrency } from '../utils/currency';
import {
  CreditCard, CheckCircle, Clock, AlertTriangle, XCircle, RefreshCw,
  Receipt, Wallet, Users, Copy, Check, TrendingUp, ChevronRight,
} from 'lucide-react';

/**
 * Billing dashboard
 *
 * Tabs:
 *   Overview     — Totals + outstanding + referral credit at a glance
 *   History      — Every payment with status, refunds, dates
 *   Installments — Active 60/40 plans, pay-now CTA per row
 *   Referrals    — User's referral code/link + stats + credit balance
 */

const STATUS_CONFIG = {
  completed: { label: 'Paid', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: <CheckCircle className="w-3.5 h-3.5" /> },
  pending:   { label: 'Pending', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400', icon: <Clock className="w-3.5 h-3.5" /> },
  failed:    { label: 'Failed', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400', icon: <XCircle className="w-3.5 h-3.5" /> },
  refunded:  { label: 'Refunded', color: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400', icon: <RefreshCw className="w-3.5 h-3.5" /> },
};

const INSTALLMENT_CONFIG = {
  not_applicable: null,
  pending:   { label: 'Balance Due', color: 'text-amber-600 dark:text-amber-400' },
  overdue:   { label: 'Overdue', color: 'text-red-600 dark:text-red-400' },
  completed: { label: 'Paid', color: 'text-green-600 dark:text-green-400' },
};

const TABS = [
  { key: 'overview', label: 'Overview', icon: Wallet },
  { key: 'history', label: 'Payment History', icon: Receipt },
  { key: 'installments', label: 'Installments', icon: CreditCard },
  { key: 'referrals', label: 'Referrals', icon: Users },
];

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Historically hardcoded to '$'. Now respects the payment's currency
// column so a non-USD payment renders with the right symbol. When only
// a scalar is passed (e.g. sum of amounts), we still fall back to USD.
function formatCurrency(v, currency = 'USD') {
  return fmtCurrency(v, currency);
}

export default function Billing() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');

  const [payments, setPayments] = useState([]);
  const [referralStats, setReferralStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.allSettled([
      paymentsAPI.getMyPayments(),
      referralsAPI.getMyStats(),
    ])
      .then(([paymentsRes, referralsRes]) => {
        if (paymentsRes.status === 'fulfilled') {
          setPayments(paymentsRes.value.data?.data?.payments || []);
        } else {
          const msg = paymentsRes.reason?.response?.data?.message || paymentsRes.reason?.message || 'Unable to load payment history';
          console.error('Billing: getMyPayments failed', paymentsRes.reason);
          setError(msg);
        }
        if (referralsRes.status === 'fulfilled') {
          setReferralStats(referralsRes.value.data?.data || null);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Derived numbers ─────────────────────────────────────────────────────
  const completedPayments = payments.filter((p) => p.payment_status === 'completed');
  const totalPaid = completedPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);

  const installmentPayments = payments.filter((p) => p.payment_plan === 'installment');
  const outstanding = installmentPayments
    .filter((p) => ['pending', 'overdue'].includes(p.installment_status))
    .reduce((sum, p) => sum + parseFloat(p.installment_remaining_amount || 0), 0);

  const hasOverdue = installmentPayments.some((p) => p.installment_status === 'overdue');

  const credits = referralStats?.stats?.credits_earned || 0;

  const copyReferralLink = async () => {
    if (!referralStats?.referral_link) return;
    try {
      await navigator.clipboard.writeText(referralStats.referral_link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Receipt className="w-6 h-6 text-brand-blue" />
          Billing & Payments
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Manage your balance, payments, and referrals.
        </p>
      </div>

      {/* Outstanding-installment alert (always visible across tabs) */}
      {outstanding > 0 && (
        <div className="mb-6 flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl">
          <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${hasOverdue ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`} />
          <div className="flex-1">
            <p className={`font-semibold text-sm ${hasOverdue ? 'text-red-800 dark:text-red-300' : 'text-amber-800 dark:text-amber-300'}`}>
              {hasOverdue ? 'Installment payment overdue' : 'Outstanding installment balance'}
            </p>
            <p className={`text-xs mt-0.5 ${hasOverdue ? 'text-red-700 dark:text-red-400' : 'text-amber-700 dark:text-amber-400'}`}>
              Remaining: <span className="font-semibold">{formatCurrency(outstanding)}</span> — pay now to keep full access.
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

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200 dark:border-dark-700 overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                active
                  ? 'text-brand-blue dark:text-cyan-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-blue dark:bg-cyan-400 rounded-t-full" />
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-brand-blue border-r-transparent mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading…</p>
        </div>
      ) : (
        <>
          {/* ─────────── OVERVIEW ─────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Stat cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  label="Total Paid"
                  value={formatCurrency(totalPaid)}
                  hint={`${completedPayments.length} payment${completedPayments.length === 1 ? '' : 's'}`}
                  icon={CheckCircle}
                  color="green"
                />
                <StatCard
                  label="Outstanding"
                  value={formatCurrency(outstanding)}
                  hint={outstanding > 0 ? 'Installment balance' : 'No balance due'}
                  icon={CreditCard}
                  color={outstanding > 0 ? (hasOverdue ? 'red' : 'amber') : 'gray'}
                />
                <StatCard
                  label="Referral Credits"
                  value={credits}
                  hint={
                    credits > 0
                      ? 'Available — admin sets redeem rules'
                      : 'Invite friends to earn'
                  }
                  icon={Users}
                  color="purple"
                />
                <StatCard
                  label="Active Courses"
                  value={completedPayments.length}
                  hint="Lifetime enrolments"
                  icon={TrendingUp}
                  color="blue"
                />
              </div>

              {/* Quick actions */}
              <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-5">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Quick actions</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <QuickActionRow
                    label="Browse courses"
                    sub="See what's available and enrol"
                    icon={TrendingUp}
                    onClick={() => navigate('/courses')}
                  />
                  <QuickActionRow
                    label="View all payments"
                    sub={`${payments.length} on record`}
                    icon={Receipt}
                    onClick={() => setActiveTab('history')}
                  />
                </div>
              </div>

              {/* Recent payments preview */}
              {payments.length > 0 && (
                <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl">
                  <div className="flex items-center justify-between p-5 pb-3">
                    <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Recent payments</h2>
                    <button
                      onClick={() => setActiveTab('history')}
                      className="text-xs text-brand-blue dark:text-cyan-400 hover:underline font-medium"
                    >
                      View all →
                    </button>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-dark-700">
                    {payments.slice(0, 3).map((p) => <PaymentRow key={p.id} p={p} compact navigate={navigate} />)}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl">
                  <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* ─────────── HISTORY ─────────── */}
          {activeTab === 'history' && (
            <PaymentList
              payments={payments}
              loading={loading}
              error={error}
              navigate={navigate}
              emptyMsg="No payments yet — enrol in a course to get started."
            />
          )}

          {/* ─────────── INSTALLMENTS ─────────── */}
          {activeTab === 'installments' && (
            <PaymentList
              payments={installmentPayments}
              loading={loading}
              error={error}
              navigate={navigate}
              emptyMsg="You have no installment plans. Choose the 60/40 option at checkout to split payment."
            />
          )}

          {/* ─────────── REFERRALS ─────────── */}
          {activeTab === 'referrals' && (
            <ReferralPanel
              stats={referralStats}
              copied={copied}
              onCopy={copyReferralLink}
            />
          )}
        </>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────── */

function StatCard({ label, value, hint, icon: Icon, color }) {
  const palette = {
    green:  'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400',
    amber:  'text-amber-600 bg-amber-100 dark:bg-amber-900/30 dark:text-amber-400',
    red:    'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400',
    blue:   'text-brand-blue bg-blue-100 dark:bg-blue-900/30 dark:text-cyan-400',
    purple: 'text-brand-purple bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400',
    gray:   'text-gray-600 bg-gray-100 dark:bg-dark-700 dark:text-gray-400',
  }[color] || 'text-gray-600 bg-gray-100';

  return (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-semibold">{label}</span>
        <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${palette}`}>
          <Icon className="w-4 h-4" />
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      {hint && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function QuickActionRow({ label, sub, icon: Icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-dark-700 hover:border-brand-blue hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors text-left"
    >
      <span className="w-9 h-9 rounded-lg bg-brand-blue/10 text-brand-blue dark:text-cyan-400 flex items-center justify-center flex-shrink-0">
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">{sub}</p>
      </div>
      <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
    </button>
  );
}

function PaymentList({ payments, loading, error, navigate, emptyMsg }) {
  return (
    <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl overflow-hidden">
      {error ? (
        <div className="p-10 text-center">
          <XCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
          <p className="text-red-500 dark:text-red-400 text-sm">{error}</p>
        </div>
      ) : payments.length === 0 ? (
        <div className="p-10 text-center">
          <CreditCard className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">Nothing here yet</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">{emptyMsg}</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100 dark:divide-dark-700">
          {payments.map((p) => <PaymentRow key={p.id} p={p} navigate={navigate} />)}
        </div>
      )}
    </div>
  );
}

function PaymentRow({ p, compact, navigate }) {
  const statusCfg = STATUS_CONFIG[p.payment_status] || STATUS_CONFIG.pending;
  const installmentCfg = INSTALLMENT_CONFIG[p.installment_status];
  const isInstallmentDue =
    p.payment_plan === 'installment' &&
    p.payment_status === 'completed' &&
    ['pending', 'overdue'].includes(p.installment_status);

  return (
    <div className="p-5 hover:bg-gray-50 dark:hover:bg-dark-700/50 transition-colors">
      <div className="flex items-start gap-4">
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

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
              {p.course?.title || 'Course (no longer available)'}
            </p>
            <span className="text-sm font-semibold text-gray-900 dark:text-white flex-shrink-0">
              {formatCurrency(p.amount, p.currency)}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
              {statusCfg.icon}
              {statusCfg.label}
            </span>
            {p.payment_plan === 'installment' && (
              <span className="text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-dark-700 px-2 py-0.5 rounded-full">
                Installment
              </span>
            )}
            {p.payment_date && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {formatDate(p.payment_date)}
              </span>
            )}
          </div>

          {!compact && p.payment_plan === 'installment' && p.payment_status === 'completed' && (
            <div className="mt-2 p-2.5 bg-gray-50 dark:bg-dark-700 rounded-lg text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Paid upfront</span>
                <span className="text-gray-700 dark:text-gray-300">{formatCurrency(p.amount, p.currency)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500 dark:text-gray-400">Remaining balance</span>
                <span className={`font-medium ${installmentCfg?.color || 'text-gray-700 dark:text-gray-300'}`}>
                  {formatCurrency(p.installment_remaining_amount, p.currency)}
                  {installmentCfg && ` — ${installmentCfg.label}`}
                </span>
              </div>
              {p.installment_due_date && p.installment_status !== 'completed' && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Due date</span>
                  <span className={p.installment_status === 'overdue' ? 'text-red-600 dark:text-red-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                    {formatDate(p.installment_due_date)}
                  </span>
                </div>
              )}
              {p.installment_paid_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500 dark:text-gray-400">Balance paid</span>
                  <span className="text-green-600 dark:text-green-400">
                    {formatDate(p.installment_paid_at)}
                  </span>
                </div>
              )}
            </div>
          )}

          {p.payment_status === 'refunded' && p.refund_amount && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              Refunded {formatCurrency(p.refund_amount, p.currency)}{p.refund_date ? ` on ${formatDate(p.refund_date)}` : ''}
            </p>
          )}
        </div>
      </div>

      {!compact && isInstallmentDue && (
        <div className="mt-3 ml-16">
          <button
            onClick={() => navigate('/checkout?installment_payment=1')}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue-600 text-white text-xs font-medium rounded-lg transition-colors"
          >
            <CreditCard className="w-3.5 h-3.5" />
            Pay Remaining {formatCurrency(p.installment_remaining_amount, p.currency)}
          </button>
        </div>
      )}
    </div>
  );
}

function ReferralPanel({ stats, copied, onCopy }) {
  if (!stats) {
    return (
      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 rounded-xl p-10 text-center">
        <Users className="w-10 h-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">Referrals are not available right now.</p>
      </div>
    );
  }
  const s = stats.stats || {};

  return (
    <div className="space-y-6">
      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Invited" value={s.total_invited || 0} hint="Friends who signed up" icon={Users} color="blue" />
        <StatCard label="Enrolled" value={s.enrolled || 0} hint="Completed signup + paid" icon={CheckCircle} color="green" />
        <StatCard label="Credits Earned" value={s.credits_earned || 0} hint="Redeem rules set by admin" icon={Wallet} color="purple" />
      </div>

      {/* Share card */}
      <div className="bg-gradient-to-br from-brand-purple/5 to-brand-blue/5 dark:from-brand-purple/10 dark:to-brand-blue/10 border border-brand-purple/20 dark:border-brand-purple/30 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Share your link</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Earn a credit for every friend who joins and enrols using your link.
        </p>

        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            readOnly
            value={stats.referral_link || ''}
            className="flex-1 px-3 py-2.5 text-sm bg-white dark:bg-dark-700 border border-gray-200 dark:border-dark-600 rounded-lg text-gray-700 dark:text-gray-200 truncate"
            onFocus={(e) => e.target.select()}
          />
          <button
            onClick={onCopy}
            className="flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy link</>}
          </button>
        </div>

        {stats.referral_code && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Or share your code: <span className="font-mono font-semibold text-gray-700 dark:text-gray-300">{stats.referral_code}</span>
          </p>
        )}
      </div>
    </div>
  );
}
