import { useState } from 'react';
import { announcementsAPI } from '../../lib/api';
import { cn } from '../../utils/cn';

const EMOJIS = ['👍', '❤️', '🎉', '👀', '💡'];

/**
 * Reactions bar for an announcement row. Optimistic-updates the
 * local tally and `mine` set, then posts the toggle. Reverts on
 * failure. Source must be 'admin' or 'course' to match the
 * backend's polymorphic reaction table.
 */
export default function ReactionsBar({ source, announcementId, initialTally = {}, initialMine = [] }) {
  const [tally, setTally] = useState(initialTally);
  const [mine, setMine]   = useState(new Set(initialMine));
  const [busy, setBusy]   = useState(false);

  const onToggle = async (emoji) => {
    if (busy) return;
    const hadIt = mine.has(emoji);
    const nextTally = { ...tally, [emoji]: Math.max(0, (tally[emoji] || 0) + (hadIt ? -1 : 1)) };
    if (nextTally[emoji] === 0) delete nextTally[emoji];
    const nextMine = new Set(mine);
    if (hadIt) nextMine.delete(emoji); else nextMine.add(emoji);

    setTally(nextTally);
    setMine(nextMine);
    setBusy(true);
    try {
      await announcementsAPI.toggleReaction(source, announcementId, emoji);
    } catch {
      // revert on failure
      setTally(tally);
      setMine(mine);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {EMOJIS.map((e) => {
        const count = tally[e] || 0;
        const active = mine.has(e);
        return (
          <button
            key={e}
            type="button"
            aria-label={`React with ${e}`}
            aria-pressed={active}
            disabled={busy}
            onClick={() => onToggle(e)}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded-full border text-xs transition-colors',
              active
                ? 'bg-brand-blue/10 border-brand-blue/30 text-brand-blue'
                : 'bg-gray-50 dark:bg-dark-700 border-gray-200 dark:border-dark-700 text-gray-600 dark:text-text-dark-secondary hover:border-brand-blue/30 hover:text-brand-blue'
            )}
          >
            <span className="text-sm leading-none">{e}</span>
            {count > 0 && <span className="font-medium">{count}</span>}
          </button>
        );
      })}
    </div>
  );
}
