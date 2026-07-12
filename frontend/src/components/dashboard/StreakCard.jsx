/**
 * StreakCard — learning streak widget
 * Shows: current streak, 7-day calendar, coins, XP, a short message.
 * Design: one accent (brand red), lucide icons (no emoji), muted
 * neutrals for everything secondary — calm, on-brand, not cluttered.
 */

import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Flame, Coins, Zap, Trophy, Play, Check } from 'lucide-react';
import { activityAPI } from '../../lib/api';
import { cn } from '../../utils/cn';

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

// Short, plain message keyed by streak length
function getMessage(streak, atRisk) {
  if (atRisk) return 'Learn something today to keep your streak alive.';
  if (streak === 0) return 'Start your streak today — a few minutes is enough.';
  if (streak === 1) return 'Nice start. Come back tomorrow to keep it going.';
  if (streak < 7) return `${streak} days in a row — the habit is forming.`;
  if (streak < 30) return `${streak} days strong. Keep the momentum going.`;
  return `${streak} days — outstanding consistency.`;
}

export default function StreakCard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const prevStreak = useRef(null);

  useEffect(() => {
    activityAPI.getStreak()
      .then((res) => setData(res.data?.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-dark-800 border border-gray-200 dark:border-border-dark rounded-2xl p-5 animate-pulse">
        <div className="h-10 bg-gray-200 dark:bg-dark-700 rounded w-2/5 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-dark-700 rounded w-3/4 mb-4" />
        <div className="flex gap-1.5">
          {Array(7).fill(0).map((_, i) => (
            <div key={i} className="flex-1 h-9 bg-gray-200 dark:bg-dark-700 rounded-full" />
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

  const todayIdx = (new Date().getDay() + 6) % 7;
  const isAlive = current_streak > 0;

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-border-dark bg-white dark:bg-dark-800 p-5">
      {/* Header: streak count + secondary stats */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex items-center justify-center w-11 h-11 rounded-xl',
            isAlive
              ? 'bg-red-50 dark:bg-brand-red/10 text-brand-red'
              : 'bg-gray-100 dark:bg-dark-700 text-gray-400',
          )}>
            <Flame className="w-6 h-6" strokeWidth={2} fill={isAlive ? 'currentColor' : 'none'} />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white leading-none">
              {current_streak}
              <span className="text-sm font-medium text-gray-400 dark:text-gray-500 ml-1.5">
                day{current_streak === 1 ? '' : 's'}
              </span>
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
              Current streak
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
            <Coins className="w-4 h-4 text-amber-500" />
            {coins.toLocaleString()}
          </span>
          <span className="flex items-center gap-1.5 text-gray-600 dark:text-gray-300 font-medium">
            <Zap className="w-4 h-4 text-brand-red" />
            {total_xp.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Message */}
      <p className={cn(
        'text-sm mb-4',
        streak_at_risk ? 'text-brand-red font-medium' : 'text-gray-500 dark:text-gray-400',
      )}>
        {getMessage(current_streak, streak_at_risk)}
      </p>

      {/* 7-day calendar */}
      <div className="flex gap-1.5 mb-4">
        {DAYS.map((day, i) => {
          const isToday = i === todayIdx;
          const active = weekly_activity[i];
          const isFuture = i > todayIdx;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
              <div className={cn(
                'w-9 h-9 rounded-full flex items-center justify-center transition-colors',
                active
                  ? 'bg-brand-red text-white'
                  : isToday
                  ? 'border-2 border-brand-red text-brand-red'
                  : isFuture
                  ? 'bg-gray-50 dark:bg-dark-700/50 text-gray-300 dark:text-gray-600'
                  : 'bg-gray-100 dark:bg-dark-700 text-gray-300 dark:text-gray-600',
              )}>
                {active ? <Flame className="w-4 h-4" fill="currentColor" strokeWidth={2} /> : (
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                )}
              </div>
              <span className={cn(
                'text-[10px] font-semibold',
                isToday ? 'text-brand-red' : 'text-gray-400 dark:text-gray-500',
              )}>
                {day}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer: best streak + CTA */}
      <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-border-dark">
        <span className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
          <Trophy className="w-3.5 h-3.5 text-gray-400" />
          Best: <span className="font-semibold text-gray-700 dark:text-gray-300">{longest_streak} days</span>
        </span>

        {active_today ? (
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 dark:text-green-400">
            <Check className="w-3.5 h-3.5" /> Done today
          </span>
        ) : (
          <Link
            to="/my-courses"
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-brand-red hover:opacity-90 text-white transition-opacity"
          >
            <Play className="w-3 h-3" fill="currentColor" />
            {streak_at_risk ? 'Save streak' : 'Learn now'}
          </Link>
        )}
      </div>
    </div>
  );
}
