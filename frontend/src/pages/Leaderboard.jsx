import { useState, useEffect } from 'react';
import { leaderboardAPI, badgesAPI } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Medal, Star, Crown, RefreshCw } from 'lucide-react';
import Avatar from '../components/ui/Avatar';
import { cn } from '../utils/cn';

const RANK_STYLES = {
  1: { bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-300 dark:border-yellow-700', icon: <Crown className="w-5 h-5 text-yellow-500" /> },
  2: { bg: 'bg-gray-50 dark:bg-gray-800/50', border: 'border-gray-300 dark:border-gray-600', icon: <Medal className="w-5 h-5 text-gray-400" /> },
  3: { bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300 dark:border-orange-700', icon: <Medal className="w-5 h-5 text-orange-400" /> },
};

function RankBadge({ rank }) {
  if (rank === 1) return <span className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-white font-bold text-sm">1</span>;
  if (rank === 2) return <span className="w-8 h-8 rounded-full bg-gray-400 flex items-center justify-center text-white font-bold text-sm">2</span>;
  if (rank === 3) return <span className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold text-sm">3</span>;
  return <span className="w-8 h-8 rounded-full bg-gray-100 dark:bg-dark-700 flex items-center justify-center text-gray-600 dark:text-gray-400 font-semibold text-sm">{rank}</span>;
}

export default function Leaderboard() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState([]);
  const [myRank, setMyRank] = useState(null);
  const [myBadges, setMyBadges] = useState([]);
  const [allBadges, setAllBadges] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [lb, rank, myB, allB] = await Promise.all([
        leaderboardAPI.get({ limit: 20 }),
        leaderboardAPI.getMyRank(),
        badgesAPI.getMyBadges(),
        badgesAPI.getAll(),
      ]);
      setLeaderboard(lb.data?.data?.leaderboard || []);
      setMyRank(rank.data?.data || null);
      setMyBadges(myB.data?.data?.badges || []);
      setAllBadges(allB.data?.data?.badges || []);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const earnedIds = new Set(myBadges.map((b) => b.badge_id));

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-500" />
            Leaderboard
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Top learners by courses completed</p>
        </div>
        <button onClick={load} className="p-2 rounded-lg bg-gray-100 dark:bg-dark-700 text-gray-500 hover:bg-gray-200 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Leaderboard */}
        <div className="lg:col-span-2">
          {/* My rank card */}
          {myRank && (
            <div className="mb-4 p-4 rounded-xl bg-brand-blue/5 border border-brand-blue/20 flex items-center gap-4">
              <RankBadge rank={myRank.rank} />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-white text-sm">Your Ranking</p>
                <p className="text-xs text-gray-500">#{myRank.rank} globally · {myRank.courses_completed} course{myRank.courses_completed !== 1 ? 's' : ''} completed · {myRank.badges_earned} badge{myRank.badges_earned !== 1 ? 's' : ''}</p>
              </div>
              <Star className="w-5 h-5 text-brand-blue flex-shrink-0" />
            </div>
          )}

          {/* Table */}
          <div className="bg-white dark:bg-dark-800 rounded-xl border border-gray-200 dark:border-dark-700 overflow-hidden">
            {loading ? (
              <div className="flex justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-blue border-r-transparent" />
              </div>
            ) : leaderboard.length === 0 ? (
              <p className="text-center text-gray-400 py-12 text-sm">No data yet</p>
            ) : (
              leaderboard.map((entry) => {
                const style = RANK_STYLES[entry.rank] || {};
                const isMe = entry.id === user?.id;
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-4 px-4 py-3 border-b border-gray-100 dark:border-dark-700 last:border-0 transition-colors',
                      style.bg,
                      isMe && 'ring-2 ring-inset ring-brand-blue/30'
                    )}
                  >
                    <RankBadge rank={entry.rank} />
                    <Avatar
                      src={entry.profile_picture}
                      alt={entry.full_name}
                      fallback={entry.full_name?.[0]?.toUpperCase()}
                      size="sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                        {entry.full_name} {isMe && <span className="text-xs text-brand-blue">(you)</span>}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {entry.courses_completed} completed · {entry.badges_earned} badges
                      </p>
                    </div>
                    {entry.rank <= 3 && style.icon}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Badges */}
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
            <Medal className="w-4 h-4 text-brand-blue" />
            Badges
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {allBadges.map((badge) => {
              const earned = earnedIds.has(badge.id);
              return (
                <div
                  key={badge.id}
                  title={badge.description}
                  className={cn(
                    'p-3 rounded-xl border text-center transition-all',
                    earned
                      ? 'bg-white dark:bg-dark-800 border-brand-blue/30 shadow-sm'
                      : 'bg-gray-50 dark:bg-dark-800/50 border-gray-200 dark:border-dark-700 opacity-40 grayscale'
                  )}
                >
                  <span className="text-2xl block mb-1">{badge.icon}</span>
                  <p className="text-xs font-medium text-gray-900 dark:text-white leading-tight">{badge.name}</p>
                  {earned && (
                    <span className="mt-1 inline-block text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">Earned</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
