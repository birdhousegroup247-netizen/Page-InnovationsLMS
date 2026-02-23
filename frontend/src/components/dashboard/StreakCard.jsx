/**
 * StreakCard — Duolingo-style learning streak widget
 * Shows: 🔥 current streak, 7-day dot calendar, coins, XP, motivational message
 */

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Coins, Zap, Trophy, AlertTriangle } from 'lucide-react';
import { activityAPI } from '../../lib/api';
import { cn } from '../../utils/cn';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Motivational messages keyed by streak length
function getMessage(streak, atRisk) {
  if (atRisk) return "Don't break your streak! Learn something today 🎯";
  if (streak === 0) return 'Start your streak today — every expert was once a beginner!';
  if (streak === 1) return 'Great start! Come back tomorrow to build your streak 💪';
  if (streak < 3) return `${streak} days in a row! The momentum is building 🚀`;
  if (streak < 7) return `${streak} days strong! You're forming a real habit 🔥`;
  if (streak < 14) return `One week+ streak! You're unstoppable 🏆`;
  if (streak < 30) return `${streak} days! You're a learning machine 🤖`;
  return `${streak} days — absolute legend status! 👑`;
}

// Celebration overlay when streak continues
function CelebrationBurst({ show }) {
  if (!show) return null;
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl z-10">
      {Array.from({ length: 16 }).map((_, i) => (
        <span
          key={i}
          className="absolute w-2 h-2 rounded-full animate-ping"
          style={{
            left: `${Math.random() * 90 + 5}%`,
            top: `${Math.random() * 90 + 5}%`,
            backgroundColor: ['#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7'][i % 5],
            animationDuration: `${0.6 + Math.random() * 0.8}s`,
            animationDelay: `${Math.random() * 0.3}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function StreakCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [celebrate, setCelebrate] = useState(false);
  const prevStreak = useRef(null);

  useEffect(() => {
    activityAPI.getStreak()
      .then((res) => {
        const d = res.data?.data;
        setData(d);
        // Trigger celebration if streak went up (compare to sessionStorage)
        const stored = sessionStorage.getItem('last_streak');
        if (stored && d && parseInt(stored) < d.current_streak) {
          setCelebrate(true);
          setTimeout(() => setCelebrate(false), 1800);
        }
        if (d) sessionStorage.setItem('last_streak', d.current_streak);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-dark-700 rounded w-1/3 mb-4" />
        <div className="h-20 bg-gray-200 dark:bg-dark-700 rounded mb-4" />
        <div className="flex gap-2">
          {Array(7).fill(0).map((_, i) => (
            <div key={i} className="flex-1 h-8 bg-gray-200 dark:bg-dark-700 rounded-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const {
    current_streak,
    longest_streak,
    active_today,
    streak_at_risk,
    weekly_activity,
    coins,
    total_xp,
  } = data;

  // Today index in the week (Mon=0)
  const todayIdx = (new Date().getDay() + 6) % 7;

  const isAlive = current_streak > 0;
  const cardBg = streak_at_risk
    ? 'from-amber-500/10 to-orange-500/10 border-amber-300 dark:border-amber-700'
    : isAlive
    ? 'from-orange-500/10 to-red-500/10 border-orange-200 dark:border-orange-800'
    : 'from-gray-50 to-gray-100 dark:from-dark-800 dark:to-dark-700 border-gray-200 dark:border-border-dark';

  return (
    <div className={cn(
      'relative rounded-2xl border bg-gradient-to-br p-6 transition-all',
      cardBg,
    )}>
      <CelebrationBurst show={celebrate} />

      {/* Header row */}
      <div className="flex items-start justify-between mb-5">
        {/* Fire + streak count */}
        <div className="flex items-center gap-3">
          <div className={cn(
            'relative flex items-center justify-center w-16 h-16 rounded-2xl text-4xl shadow-md select-none',
            isAlive ? 'bg-orange-500 shadow-orange-300 dark:shadow-orange-900' : 'bg-gray-200 dark:bg-dark-700',
          )}>
            {isAlive ? (
              <>
                🔥
                {streak_at_risk && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-3 h-3 text-white" />
                  </span>
                )}
              </>
            ) : '💤'}
          </div>
          <div>
            <p className="text-4xl font-black text-gray-900 dark:text-white leading-none">
              {current_streak}
            </p>
            <p className="text-sm font-semibold text-orange-600 dark:text-orange-400">
              {current_streak === 1 ? 'Day Streak' : 'Day Streak'}
            </p>
          </div>
        </div>

        {/* Coins + XP */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-1.5 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-3 py-1 rounded-full text-sm font-bold">
            <span>🪙</span>
            <span>{coins.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-3 py-1 rounded-full text-sm font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>{total_xp.toLocaleString()} XP</span>
          </div>
        </div>
      </div>

      {/* Motivational message */}
      <p className={cn(
        'text-sm font-medium mb-5',
        streak_at_risk ? 'text-amber-700 dark:text-amber-400' : 'text-gray-600 dark:text-gray-400',
      )}>
        {getMessage(current_streak, streak_at_risk)}
      </p>

      {/* 7-day dot calendar */}
      <div className="flex gap-1.5 mb-5">
        {DAYS.map((day, i) => {
          const isToday = i === todayIdx;
          const active = weekly_activity[i];
          const isFuture = i > todayIdx;
          return (
            <div key={day} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                'w-full aspect-square rounded-full flex items-center justify-center text-base transition-all duration-300',
                active
                  ? 'bg-orange-500 shadow-md shadow-orange-300/50 dark:shadow-orange-900/50 scale-110'
                  : isToday && !active
                  ? streak_at_risk
                    ? 'bg-amber-200 dark:bg-amber-900/40 border-2 border-amber-400 animate-pulse'
                    : 'bg-gray-100 dark:bg-dark-700 border-2 border-dashed border-gray-300 dark:border-dark-500'
                  : isFuture
                  ? 'bg-gray-100 dark:bg-dark-700 opacity-40'
                  : 'bg-gray-200 dark:bg-dark-700',
              )}>
                {active ? '🔥' : isToday && !active ? '📅' : ''}
              </div>
              <span className={cn(
                'text-[10px] font-semibold',
                isToday ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400 dark:text-gray-500',
              )}>
                {day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer: longest streak + CTA */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Trophy className="w-3.5 h-3.5 text-yellow-500" />
          Best: <span className="font-bold text-gray-700 dark:text-gray-300">{longest_streak} days</span>
        </div>

        {!active_today && (
          <Link
            to="/my-courses"
            className={cn(
              'text-xs font-bold px-3 py-1.5 rounded-lg transition-all',
              streak_at_risk
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-orange-500 hover:bg-orange-600 text-white',
            )}
          >
            {streak_at_risk ? '⚠️ Save Your Streak!' : '▶ Learn Now'}
          </Link>
        )}

        {active_today && (
          <span className="text-xs font-bold text-green-600 dark:text-green-400 flex items-center gap-1">
            ✅ Done for today!
          </span>
        )}
      </div>
    </div>
  );
}
