import { useMemo } from 'react';

// Real timezone picker. Reads every IANA zone the browser supports
// (Intl.supportedValuesOf('timeZone') — 400+ zones, all major
// cities), annotates each with its current UTC offset, sorts by
// offset so users can find their region quickly, and exposes a
// "Use my current timezone" button that snaps to the browser's
// detected zone.
//
// Notes on auto-detection:
// - Intl.DateTimeFormat().resolvedOptions().timeZone gives the
//   browser's best guess. On most modern browsers this is the
//   system tz (so a laptop set to Lagos returns "Africa/Lagos").
// - We don't ask for geolocation permission — that's overkill for
//   tz detection and creates a prompt the user has to dismiss.
//   Browser-default + manual override is the LMS-standard pattern.

function offsetForZone(zone) {
  try {
    const dtf = new Intl.DateTimeFormat('en-US', { timeZone: zone, timeZoneName: 'longOffset' });
    const parts = dtf.formatToParts(new Date());
    const off = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    // Normalize "GMT+1" → "GMT+01:00"
    const m = off.match(/GMT([+-])(\d{1,2})(?::?(\d{2}))?/);
    if (m) {
      const sign = m[1];
      const hh = m[2].padStart(2, '0');
      const mm = (m[3] || '00').padStart(2, '0');
      return `GMT${sign}${hh}:${mm}`;
    }
    return off || 'GMT';
  } catch {
    return 'GMT';
  }
}

function offsetMinutes(offsetStr) {
  const m = offsetStr.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  const sign = m[1] === '-' ? -1 : 1;
  return sign * (parseInt(m[2], 10) * 60 + parseInt(m[3], 10));
}

export default function TimezoneSelect({ value, onChange, autoSelectLabel = 'Use my current timezone' }) {
  const browserZone = useMemo(() => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch { return ''; }
  }, []);

  const zones = useMemo(() => {
    const list = typeof Intl?.supportedValuesOf === 'function'
      ? Intl.supportedValuesOf('timeZone')
      : [];
    // Fallback for older browsers — short curated set covering the
    // big regions so the page still works.
    const fallback = [
      'UTC',
      'Africa/Lagos', 'Africa/Johannesburg', 'Africa/Cairo', 'Africa/Nairobi',
      'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Toronto', 'America/Sao_Paulo', 'America/Mexico_City',
      'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Rome',
      'Asia/Dubai', 'Asia/Kolkata', 'Asia/Singapore', 'Asia/Hong_Kong', 'Asia/Shanghai', 'Asia/Tokyo', 'Asia/Seoul',
      'Australia/Sydney', 'Australia/Perth', 'Pacific/Auckland',
    ];
    const source = list.length > 0 ? list : fallback;
    return source
      .map((z) => ({ zone: z, offset: offsetForZone(z) }))
      .map((z) => ({ ...z, mins: offsetMinutes(z.offset) }))
      .sort((a, b) => a.mins - b.mins || a.zone.localeCompare(b.zone));
  }, []);

  // Pretty label: "(GMT+01:00) Africa / Lagos". Slash replaced by
  // a thin space + slash so wide names break naturally in narrow
  // dropdowns.
  const labelFor = (z) => `(${z.offset}) ${z.zone.replace(/_/g, ' ').replace('/', ' / ')}`;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 px-3 py-2.5 bg-white dark:bg-dark-700 border border-gray-300 dark:border-border-dark rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-blue"
        >
          <option value="">Select a timezone…</option>
          {zones.map((z) => (
            <option key={z.zone} value={z.zone}>{labelFor(z)}</option>
          ))}
        </select>
        {browserZone && (
          <button
            type="button"
            onClick={() => onChange(browserZone)}
            className="px-3 py-2.5 text-xs font-medium text-brand-blue bg-brand-blue/10 hover:bg-brand-blue/20 border border-brand-blue/20 rounded-lg whitespace-nowrap transition-colors"
          >
            {autoSelectLabel}
          </button>
        )}
      </div>
      {browserZone && (
        <p className="text-[11px] text-gray-500 dark:text-text-dark-muted">
          We detected your browser's timezone as <code className="text-[11px] px-1 py-0.5 rounded bg-gray-100 dark:bg-dark-700">{browserZone}</code>.
          Used for due-date displays and live session times.
        </p>
      )}
    </div>
  );
}
