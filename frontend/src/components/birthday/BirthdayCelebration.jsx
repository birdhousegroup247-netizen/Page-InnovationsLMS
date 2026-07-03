import { useEffect, useState } from 'react';
import { Cake, X } from 'lucide-react';
import api from '../../lib/api';

// Lightweight birthday celebration modal. On mount it asks the
// backend whether the current user has an unseen birthday this year
// (status 'today' or 'belated <=10 days'). If so we pop a full-
// screen overlay with CSS confetti + a personalized message. On
// dismiss we POST /seen so the modal doesn't reappear until next
// year. Belated case copies "Your birthday was N days ago — we
// kept the surprise" so a missed day still gets a warm celebration.
//
// Mounted in AppLayout so it works app-wide for any logged-in user.

export default function BirthdayCelebration({ user }) {
  const [open, setOpen] = useState(false);
  const [payload, setPayload] = useState(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    (async () => {
      try {
        // sessionStorage gate: only ask the backend once per browser
        // session even if the user navigates around. Once they dismiss,
        // we set a longer-lived flag so it doesn't pop again.
        const dismissedKey = `bdayDismissed:${user.id}:${new Date().getUTCFullYear()}`;
        if (sessionStorage.getItem(dismissedKey)) return;

        const res = await api.get('/api/profile/birthday-celebration');
        if (!alive) return;
        const data = res?.data?.data;
        if (data?.celebration) {
          setPayload({ ...data, dismissedKey });
          setOpen(true);
        }
      } catch {
        /* silent — never block app open on this */
      }
    })();
    return () => { alive = false; };
  }, [user]);

  const dismiss = async () => {
    setOpen(false);
    if (payload?.dismissedKey) sessionStorage.setItem(payload.dismissedKey, '1');
    try {
      await api.post('/api/profile/birthday-celebration/seen');
    } catch { /* fine — local gate also blocks the re-pop */ }
  };

  if (!open || !payload?.celebration) return null;

  const first = payload.first_name || 'there';
  const isBelated = payload.celebration.status === 'belated';
  const daysAgo = payload.celebration.days_ago || 0;

  // Build 60 colorful confetti pieces with randomized left + delay
  // so each render looks fresh without an animation library.
  const confetti = Array.from({ length: 60 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 3 + Math.random() * 3;
    const colors = ['#3b82f6', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#ef4444', '#06b6d4'];
    const color = colors[i % colors.length];
    const size = 8 + Math.random() * 8;
    const rotate = Math.random() * 360;
    return (
      <span
        key={i}
        className="absolute top-[-20px] rounded-sm"
        style={{
          left: `${left}%`,
          width: `${size}px`,
          height: `${size * 0.4}px`,
          background: color,
          transform: `rotate(${rotate}deg)`,
          animation: `bdayFall ${duration}s linear ${delay}s infinite`,
        }}
      />
    );
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Confetti rain — sits between backdrop and card */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">{confetti}</div>

      {/* Card */}
      <div className="relative bg-white dark:bg-dark-800 rounded-2xl shadow-2xl max-w-md w-full p-8 text-center animate-[bdayPop_400ms_ease-out]">
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-pink-500 via-orange-400 to-yellow-400 flex items-center justify-center mb-4 animate-[bdayBounce_1.6s_ease-in-out_infinite]">
          <Cake className="w-10 h-10 text-white" />
        </div>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
          {isBelated ? `We saved a surprise for you, ${first}!` : `Happy Birthday, ${first}! 🎉`}
        </h2>

        <p className="text-gray-600 dark:text-text-dark-secondary mb-6 leading-relaxed">
          {isBelated ? (
            <>
              Your birthday was <strong>{daysAgo} day{daysAgo === 1 ? '' : 's'} ago</strong>{' '}
              — but we didn't want to skip it. Everyone at Page Innovation is wishing you a brilliant year
              ahead. Thanks for being part of this community. 🎂
            </>
          ) : (
            <>
              The whole Page Innovation team is celebrating with you today.
              Thank you for letting us be a small part of your learning journey —
              the curiosity you bring to every lesson is exactly what makes growth happen.
              Here's to another year of building, breaking, and getting better. 💙
            </>
          )}
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-brand-blue to-brand-purple text-white font-medium hover:opacity-95 transition"
        >
          Thank you! Let's keep learning →
        </button>
      </div>

      {/* Inline keyframes — kept local to avoid Tailwind config thrash. */}
      <style>{`
        @keyframes bdayFall {
          0% { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0.85; }
        }
        @keyframes bdayPop {
          0% { transform: scale(0.85); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes bdayBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
    </div>
  );
}
