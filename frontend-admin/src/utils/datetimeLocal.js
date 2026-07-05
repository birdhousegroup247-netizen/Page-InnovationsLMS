/**
 * <input type="datetime-local"> ⇄ API timestamp conversion.
 *
 * The input works in naked local wall-clock strings ("2026-07-05T14:12").
 * Sending that string raw to the API is a timezone bug: the server (UTC on
 * Railway) parses it as UTC, so a Lagos instructor's "2:12 PM" comes back
 * as 3:12 PM — every schedule silently shifts by the viewer's UTC offset.
 * The reverse mistake — loading with .toISOString().slice(0, 16) — puts
 * UTC digits into a local input and shows times an hour early.
 *
 * Rules:
 *   submit → toUTCISO(form.value)    (browser interprets local, sends Z-ISO)
 *   load   → toLocalInput(api.value) (formats in the browser's timezone)
 *
 * With both rules applied, the database always holds the true instant and
 * every viewer sees it in their own timezone.
 */

/** Local-wall-clock string for datetime-local inputs, from any date value. */
export function toLocalInput(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** UTC ISO string for the API, from a datetime-local input value. */
export function toUTCISO(value) {
  if (!value) return null;
  const d = new Date(value); // interpreted in the browser's timezone
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}
