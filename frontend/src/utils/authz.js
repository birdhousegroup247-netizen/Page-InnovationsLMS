/**
 * authz.js — the single source of truth for auth capabilities and post-auth
 * routing. Mirrors the backend authorize() dual-role rule.
 *
 * Why this exists: the app is dual-role (one account can learn AND teach), but
 * the routing/guards used to check `user.role === 'instructor'` in ~6 scattered
 * places, and the "where do I send this user" decision was copy-pasted in 4
 * files that drifted apart. That caused every recurring login bug (approved
 * instructors — who keep role='student' — landing on the student dashboard,
 * "switch" doing nothing, "this login is for X only" errors).
 *
 * Rule: never read `user.role === 'instructor'` in a component again. Use
 * `canTeach()` for capability and `homePathFor()` for routing.
 */

// ── Capabilities (derived from the server user; immutable per session) ───────
export const canTeach = (u) =>
  u?.role === 'instructor' || u?.instructor_status === 'approved';

export const isAdmin = (u) =>
  u?.role === 'admin' || u?.role === 'super_admin';

export const isPendingInstructor = (u) => u?.instructor_status === 'pending';

// ── Active view (which "hat" the user is wearing right now) ──────────────────
// A dual-role user toggles between 'student' and 'instructor'. Stored under a
// new key; we also mirror the legacy 'selectedRole' key so older readers keep
// working during the migration.
const VIEW_KEY = 'activeView';
const LEGACY_KEY = 'selectedRole';

export const defaultView = (u) => (canTeach(u) ? 'instructor' : 'student');

export const getActiveView = (u) => {
  try {
    const v = localStorage.getItem(VIEW_KEY) || localStorage.getItem(LEGACY_KEY);
    if (v === 'instructor' && canTeach(u)) return 'instructor';
    if (v === 'student') return 'student';
  } catch { /* ignore */ }
  return defaultView(u);
};

export const setActiveView = (view) => {
  try {
    localStorage.setItem(VIEW_KEY, view);
    localStorage.setItem(LEGACY_KEY, view); // keep legacy readers working
  } catch { /* ignore */ }
};

export const clearActiveView = () => {
  try {
    localStorage.removeItem(VIEW_KEY);
    localStorage.removeItem(LEGACY_KEY);
  } catch { /* ignore */ }
};

// ── Routing (the ONE place that decides where a user goes) ───────────────────
/**
 * Home path for a user given a chosen view. Used by every redirect, guard, and
 * the role toggle so they can never disagree.
 */
export const homePathFor = (u, view) => {
  if (!u) return '/login';
  const v = view || getActiveView(u);
  if (v === 'instructor' && canTeach(u)) return '/instructor/dashboard';
  return '/dashboard';
};

/**
 * Does this freshly-authenticated user need to be ASKED which view to open?
 * Only dual-role users (can teach). Pure students go straight to their home.
 * This drives the "ask each login" behaviour: the login flow sends dual-role
 * users to the chooser every time.
 */
export const needsViewChoice = (u) => canTeach(u);

/**
 * Where to send a user right after they authenticate.
 * - dual-role  → the chooser ("Continue as Instructor / Student")
 * - pure student → student dashboard
 */
export const postAuthPath = (u) => {
  if (!u) return '/login';
  if (needsViewChoice(u)) return '/role-selector';
  return '/dashboard';
};
