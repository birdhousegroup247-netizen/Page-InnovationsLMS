/**
 * Feature flags — central on/off switches for hideable student + instructor
 * features.
 *
 * Why this file exists:
 *   Tiers, beta surfaces, and paywall-able features need to be hidden /
 *   shown without code rewrites. Every gateable feature has a named flag
 *   here. Set it to `false` to hide, `true` to show. One file, one source
 *   of truth — same pattern the admin app uses.
 *
 * What gets gated:
 *   1. Sidebar items in `utils/navigationItems.jsx` — items with a matching
 *      `feature` key disappear from the sidebar when their flag is off.
 *   2. Routes in `App.jsx` — wrapping a route in <FeatureGate flag="..."/>
 *      redirects to the role's home (/dashboard for students,
 *      /instructor/dashboard for instructors) when off, so the URL isn't
 *      reachable either.
 *   3. Inline page sections — import `FEATURES` and conditionally render
 *      a section / CTA. Useful when a button on Page A belongs to feature
 *      B (e.g. a "Refer a friend" CTA on My Courses when `referrals` is
 *      off).
 *
 * How to hide a feature:
 *   Flip its value from `true` to `false`, commit, deploy. Done.
 *
 * Defaults:
 *   Everything starts ON so the app behaves exactly as it did before this
 *   file existed.
 *
 * Future:
 *   This map can later be sourced from VITE_ env vars or a backend
 *   endpoint so flags toggle at runtime without a redeploy. Not needed
 *   today — keep it simple.
 */

export const FEATURES = {
  // Page Innovations tier (decided with client rep 2026-07-04):
  // core learning stays on; growth/gamification/self-serve extras off.

  // ─── Shared (controls both student + instructor tab when relevant) ──────
  announcements: true,
  attendance: true,
  assignments: true,    // student "My Assignments" + instructor "Assignments"
  tests: true,          // student "My Assigned Tests" + instructor "My Tests"

  // ─── Student-only ───────────────────────────────────────────────────────
  // After signup, prompt students to complete their enrollment profile
  // (next-of-kin + academic) — Page Innovations onboarding workflow.
  completeProfile: true,
  practiceTests: false,
  generateTest: false,
  wishlist: false,
  bookmarks: false,
  myNotes: true,
  certificates: false,
  leaderboard: false,
  bundles: false,
  referrals: false,
  billing: false,       // current cohort has already paid

  // Cohort mode (2026-07 launch): students pay OFFLINE, then pick the course
  // they paid for at signup and are auto-enrolled — no online checkout.
  // Effects when ON: (1) signup shows a required "which course did you enroll
  // in?" picker; (2) prices are hidden everywhere; (3) other courses show as
  // locked (visible but not enrollable). Flip to false when Paystack goes
  // live and normal self-serve checkout resumes.
  cohortMode: true,
  knowledgeBase: false,

  // ─── Instructor-only ────────────────────────────────────────────────────
  liveSessions: true,
  myStudents: true,
  contributeQuestions: false,
  createCourse: false,  // academy model — admin curates the catalog
};

/**
 * Helper: check a flag by key. Returns true if undefined so unflagged
 * items are always visible — only items that explicitly opt into gating
 * can be hidden.
 */
export function isFeatureOn(key) {
  if (!key) return true;
  return FEATURES[key] !== false;
}
