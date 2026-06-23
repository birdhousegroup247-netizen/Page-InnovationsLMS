import { useState } from 'react';
import { X, AlertTriangle, AlertCircle, Lock, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * PaymentBanner — persistent top banner for:
 *   - Preview-mode users (blue, encouraging enrollment)
 *   - Installment overdue users (yellow/orange/red/amber based on stage)
 */
export default function PaymentBanner() {
  const { user, isPreview, installmentStage, installmentData } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;
  if (!isPreview && !installmentStage) return null;

  // Instructors and admins don't enrol in their own platform, so the
  // "Preview Mode — only Lesson 1 is unlocked" prompt is nonsense for
  // them. Suppress the banner entirely for those roles.
  const role = user?.role;
  if (role === 'instructor' || role === 'admin' || role === 'super_admin') {
    return null;
  }

  const payUrl = installmentData
    ? `/checkout?course_id=${installmentData.course_id}&installment_payment=1`
    : null;

  // --- Preview mode banner ---
  if (isPreview) {
    return (
      <div className="bg-gradient-to-r from-[#0e2b5c] to-[#2e3192] text-white px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm">
          <BookOpen className="w-4 h-4 flex-shrink-0" />
          <span>
            You're in <strong>Preview Mode</strong> — only Lesson 1 is unlocked.{' '}
            <button
              onClick={() => navigate('/courses')}
              className="underline font-semibold hover:no-underline"
            >
              Enroll in a course
            </button>{' '}
            to access all content.
          </span>
        </div>
        <button
          onClick={() => setDismissed(true)}
          className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  // --- Installment overdue banners ---
  const STAGE_CONFIG = {
    warning: {
      bg: 'bg-yellow-50 border-b border-yellow-200',
      text: 'text-yellow-800',
      icon: <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />,
      message: 'Your installment payment is due. Please pay to keep your access uninterrupted.',
      cta: 'Pay Now',
    },
    orange: {
      bg: 'bg-orange-50 border-b border-orange-200',
      text: 'text-orange-800',
      icon: <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0" />,
      message: 'Your installment payment is 3 days overdue. Content restrictions will apply soon.',
      cta: 'Pay Now',
    },
    red: {
      bg: 'bg-red-50 border-b border-red-300',
      text: 'text-red-800',
      icon: <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />,
      message: 'URGENT: Payment is 7 days overdue. Your account will be restricted in 4 days.',
      cta: 'Pay Immediately',
    },
    partial: {
      bg: 'bg-amber-50 border-b border-amber-300',
      text: 'text-amber-900',
      icon: <Lock className="w-4 h-4 text-amber-700 flex-shrink-0" />,
      message: 'New course content is locked due to overdue payment. Pay to restore full access.',
      cta: 'Restore Access',
    },
    soft: {
      bg: 'bg-red-600',
      text: 'text-white',
      icon: <Lock className="w-4 h-4 text-white flex-shrink-0" />,
      message: 'Your account is temporarily restricted. Pay your installment to continue learning.',
      cta: 'Pay Now',
    },
  };

  const cfg = STAGE_CONFIG[installmentStage];
  if (!cfg) return null;

  return (
    <div className={`${cfg.bg} px-4 py-2.5 flex items-center justify-between gap-3`}>
      <div className={`flex items-center gap-2 text-sm ${cfg.text}`}>
        {cfg.icon}
        <span>{cfg.message}</span>
        {payUrl && (
          <button
            onClick={() => navigate(payUrl)}
            className={`font-semibold underline hover:no-underline ml-1 flex-shrink-0`}
          >
            {cfg.cta} →
          </button>
        )}
      </div>
      {installmentStage !== 'soft' && (
        <button
          onClick={() => setDismissed(true)}
          className={`p-1 rounded hover:bg-black/5 transition-colors flex-shrink-0 ${cfg.text}`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
