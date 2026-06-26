/**
 * Feature flags — central on/off switches for hideable admin features.
 *
 * Why this file exists:
 *   Some tabs / pages / inline sections need to be hidden depending on what
 *   the client has paid for. Instead of commenting out code (which then has
 *   to be commented back in later, risking merge conflicts and missed
 *   wiring), every hideable feature has a named flag here. Set the flag to
 *   `false` to hide it, `true` to show it. One file, one source of truth.
 *
 * What gets gated:
 *   1. Sidebar items in `navigationItems.jsx` — items with a matching
 *      `feature` key disappear from the sidebar when their flag is off.
 *   2. Routes in `App.jsx` — wrapping a route in <FeatureGate flag="..."/>
 *      redirects to /dashboard when off, so the URL isn't reachable either.
 *   3. Inline page sections — import { FEATURES } and conditionally render
 *      a section / CTA. Useful when a button on Page A belongs to feature
 *      B (e.g. a "Refer a friend" CTA on Users when `referrals` is off).
 *
 * How to hide a feature:
 *   Flip its value from `true` to `false`, commit, deploy. Done.
 *
 * How to add a new gated feature:
 *   1. Add a key here (default `true`).
 *   2. Reference it in the nav item: `feature: 'yourKey'`.
 *   3. Reference it in the route: <FeatureGate flag="yourKey">…</FeatureGate>.
 *   4. (Optional) Use `FEATURES.yourKey` in any page section that should hide
 *      with it.
 *
 * Defaults:
 *   Everything starts ON so the app behaves the same as before this file
 *   existed. The client can later be sold tiers by flipping subsets off.
 *
 * Future:
 *   This map can later be sourced from VITE_ env vars or a backend endpoint
 *   so flags toggle at runtime without a redeploy. Not needed today — keep
 *   it simple.
 */

export const FEATURES = {
  // Communication
  inbox: true,            // admin DMs to instructors / students
  chatModeration: true,   // course chat-room moderation
  announcements: true,    // broadcast announcements

  // People
  instructorApplications: true,
  leads: true,
  enrollments: true,

  // Learning catalog
  categories: true,
  bundles: true,
  questionBank: true,
  tests: true,

  // Growth tools
  coupons: true,
  referrals: true,
  badges: true,

  // Finance & reporting
  payments: true,
  analytics: true,
  activityLogs: true,
};

/**
 * Helper: check a flag by key. Returns true if undefined so unflagged items
 * are always visible — only items that explicitly opt into gating can be
 * hidden.
 */
export function isFeatureOn(key) {
  if (!key) return true;
  return FEATURES[key] !== false;
}
