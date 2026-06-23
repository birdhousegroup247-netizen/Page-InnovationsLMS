/**
 * Per-tab auth token storage.
 *
 * Previously stored tokens in localStorage, which is shared across all
 * tabs of the same origin. That meant opening student in tab A and
 * instructor in tab B caused tab B's login to clobber tab A's tokens.
 *
 * Strategy:
 *   - sessionStorage is the *active* session for the tab (per-tab).
 *   - localStorage is a "Remember me" seed for new tabs / browser
 *     restarts. We never read it after a tab has its own session.
 *
 * Lifecycle:
 *   on login: write to sessionStorage; also to localStorage iff rememberMe.
 *   on read:  sessionStorage first; fall back to localStorage *only if
 *             the tab has no session yet*, and on that fallback copy the
 *             values into sessionStorage so the tab becomes "owned" by
 *             that user from then on.
 *   on logout: clear both stores.
 *
 * Result: Tab A and Tab B can be logged in as different users
 * simultaneously. The httpOnly cookies the backend sets still get
 * overwritten across tabs, but the backend honours Authorization: Bearer
 * over the cookie, so per-tab Bearer tokens win.
 */

const KEYS = ['accessToken', 'refreshToken'];

function readFromAny(key) {
  try {
    const fromSession = sessionStorage.getItem(key);
    if (fromSession) return fromSession;
  } catch {}
  try {
    const fromLocal = localStorage.getItem(key);
    if (fromLocal) {
      // First read in a new tab: seed sessionStorage so subsequent reads
      // are stable and don't pick up a different user written by another
      // tab to localStorage later.
      try { sessionStorage.setItem(key, fromLocal); } catch {}
      return fromLocal;
    }
  } catch {}
  return null;
}

export const tokenStorage = {
  get(key) {
    return readFromAny(key);
  },

  /**
   * @param {string} key
   * @param {string} value
   * @param {{ persist?: boolean }} opts persist=true seeds localStorage too
   *   (Remember me). Defaults to true so existing single-tab "tokens
   *   survive refresh" UX is preserved.
   */
  set(key, value, opts = {}) {
    const persist = opts.persist !== false;
    try { sessionStorage.setItem(key, value); } catch {}
    if (persist) {
      try { localStorage.setItem(key, value); } catch {}
    } else {
      // Explicit ephemeral: make sure no stale localStorage value lingers.
      try { localStorage.removeItem(key); } catch {}
    }
  },

  remove(key) {
    try { sessionStorage.removeItem(key); } catch {}
    try { localStorage.removeItem(key); } catch {}
  },

  clearAll() {
    KEYS.forEach((k) => this.remove(k));
  },

  /**
   * Persist a token bundle. `rememberMe=true` also seeds localStorage so
   * a new tab / browser restart can pick the session back up.
   */
  setTokens({ accessToken, refreshToken } = {}, { rememberMe = false } = {}) {
    if (accessToken) this.set('accessToken', accessToken, { persist: rememberMe });
    if (refreshToken) this.set('refreshToken', refreshToken, { persist: rememberMe });
  },
};
