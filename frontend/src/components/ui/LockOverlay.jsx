import { Lock, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

/**
 * LockOverlay — shown over locked lessons in CoursePlayer.
 * variant='preview'  → enroll prompt (default)
 * variant='drip'     → "available on [date]" message
 */
export default function LockOverlay({ courseId, variant = 'preview', unlockDate }) {
  const navigate = useNavigate();

  const formattedDate = unlockDate
    ? new Date(unlockDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-gray-900/80 backdrop-blur-sm rounded-xl">
      <div className="text-center px-6 max-w-sm">
        <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
          {variant === 'drip' ? (
            <Calendar className="w-8 h-8 text-white" />
          ) : (
            <Lock className="w-8 h-8 text-white" />
          )}
        </div>

        {variant === 'drip' ? (
          <>
            <h3 className="text-xl font-bold text-white mb-2">Not Yet Available</h3>
            <p className="text-white/70 text-sm mb-2">
              This lesson unlocks on
            </p>
            {formattedDate && (
              <p className="text-white font-semibold text-base mb-4">{formattedDate}</p>
            )}
            <p className="text-white/50 text-xs">Check back on that date to access this lesson.</p>
          </>
        ) : (
          <>
            <h3 className="text-xl font-bold text-white mb-2">Lesson Locked</h3>
            <p className="text-white/70 text-sm mb-6">
              This lesson is part of the full course. Enroll to unlock all content and get your certificate.
            </p>
            <button
              onClick={() => navigate(`/checkout?course_id=${courseId}`)}
              className="px-6 py-3 bg-gradient-to-r from-[#2e3192] to-[#eb1c22] text-white font-semibold rounded-lg hover:opacity-90 transition-opacity text-sm"
            >
              Enroll Now
            </button>
            <p className="text-white/50 text-xs mt-3">60/40 installment plan available</p>
          </>
        )}
      </div>
    </div>
  );
}
