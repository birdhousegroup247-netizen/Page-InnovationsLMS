import { Lock, AlertOctagon, CreditCard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * SuspensionModal — fullscreen overlay for:
 *   - D35 soft lock (installmentStage === 'soft')
 *   - D42 hard lock / registration_status === 'suspended'
 *
 * Rendered in AppLayout so it always appears on top of all content.
 */
export default function SuspensionModal() {
  const { isSuspended, installmentStage, installmentData } = useAuth();
  const navigate = useNavigate();

  const isSoft = installmentStage === 'soft';
  if (!isSuspended && !isSoft) return null;

  const payUrl = installmentData
    ? `/checkout?course_id=${installmentData.course_id}&installment_payment=1`
    : '/my-courses';

  if (isSuspended) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
        <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
            <AlertOctagon className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Account Suspended</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
            Your account has been suspended due to an unpaid installment balance.
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Please complete your payment to restore full access to your courses.
          </p>
          <button
            onClick={() => navigate(payUrl)}
            className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-[#0e2b5c] to-[#2e3192] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity mb-3"
          >
            <CreditCard className="w-4 h-4" />
            Complete Payment
          </button>
          <p className="text-xs text-gray-400">
            Need help?{' '}
            <a href="mailto:support@tekypro.com" className="underline hover:text-gray-600">
              Contact support
            </a>
          </p>
        </div>
      </div>
    );
  }

  // Soft lock (D35)
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-5">
          <Lock className="w-8 h-8 text-orange-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Content Access Paused</h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">
          Your installment payment is significantly overdue. Course access has been temporarily paused.
        </p>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
          Complete your payment to immediately restore access. Your progress is saved.
        </p>
        <button
          onClick={() => navigate(payUrl)}
          className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-[#eb1c22] to-[#c0392b] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity mb-3"
        >
          <CreditCard className="w-4 h-4" />
          Pay & Restore Access
        </button>
        <p className="text-xs text-gray-400">
          Your account will be permanently suspended in 7 days without payment.
        </p>
      </div>
    </div>
  );
}
