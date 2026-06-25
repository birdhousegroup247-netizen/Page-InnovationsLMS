import { useRef, useState, useEffect } from 'react';
import { SmilePlus } from 'lucide-react';
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
    // Rule: 1 emoji per user per announcement.
    //  - same emoji clicked again → remove it
    //  - different emoji clicked  → remove whatever the user had + add this one
    const hadIt = mine.has(emoji);
    const nextTally = { ...tally };
    const nextMine = new Set(mine);

    if (hadIt) {
      // remove
      nextTally[emoji] = Math.max(0, (nextTally[emoji] || 0) - 1);
      if (nextTally[emoji] === 0) delete nextTally[emoji];
      nextMine.delete(emoji);
    } else {
      // swap out any previous emoji this user had on this row
      for (const prev of mine) {
        nextTally[prev] = Math.max(0, (nextTally[prev] || 0) - 1);
        if (nextTally[prev] === 0) delete nextTally[prev];
        nextMine.delete(prev);
      }
      // add the new one
      nextTally[emoji] = (nextTally[emoji] || 0) + 1;
      nextMine.add(emoji);
    }

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

  // Quiet pattern (Slack/LinkedIn style):
  //   - by default show only emojis that already have a count > 0
  //     or that this user has reacted with
  //   - a small "+" button reveals the full picker (a popover that
  //     closes on outside-click)
  // Keeps the card content the prominent thing; reactions are
  // engagement signal, not content.
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef(null);
  useEffect(() => {
    if (!pickerOpen) return undefined;
    const onDoc = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [pickerOpen]);

  const visible = EMOJIS.filter((e) => (tally[e] || 0) > 0 || mine.has(e));

  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      {visible.map((e) => {
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
              'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[12px] transition-colors',
              active
                ? 'bg-brand-blue/10 ring-1 ring-brand-blue/30 text-brand-blue'
                : 'bg-gray-100 dark:bg-dark-700 text-gray-600 dark:text-text-dark-secondary hover:bg-gray-200 dark:hover:bg-dark-600'
            )}
          >
            <span className="text-sm leading-none">{e}</span>
            {count > 0 && <span className="font-medium tabular-nums">{count}</span>}
          </button>
        );
      })}

      {/* Add-reaction button + popover picker */}
      <div className="relative" ref={pickerRef}>
        <button
          type="button"
          aria-label="Add reaction"
          aria-expanded={pickerOpen}
          onClick={() => setPickerOpen((o) => !o)}
          className={cn(
            'inline-flex items-center justify-center w-7 h-7 rounded-full transition-colors',
            visible.length === 0
              ? 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-700'
              : 'text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-dark-700'
          )}
        >
          <SmilePlus className="w-3.5 h-3.5" />
        </button>
        {/* Anchor the tray to the right edge — the bar sits in the
            card footer's right side, so left:0 would overflow into
            the next card / off-screen. right-0 opens it leftward
            inside the card. */}
        {pickerOpen && (
          <div className="absolute z-20 bottom-full right-0 mb-2 flex items-center gap-1 p-1 rounded-full bg-white dark:bg-dark-800 border border-gray-200 dark:border-dark-700 shadow-lg">
            {EMOJIS.map((e) => {
              const active = mine.has(e);
              return (
                <button
                  key={e}
                  type="button"
                  disabled={busy}
                  onClick={() => { onToggle(e); setPickerOpen(false); }}
                  className={cn(
                    'w-7 h-7 rounded-full inline-flex items-center justify-center text-base transition-transform hover:scale-110',
                    active && 'bg-brand-blue/10 ring-1 ring-brand-blue/30'
                  )}
                  aria-label={`React with ${e}`}
                  aria-pressed={active}
                >
                  {e}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
