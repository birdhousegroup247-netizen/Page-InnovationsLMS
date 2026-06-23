/**
 * Per-tab auth token storage — see frontend/src/utils/tokenStorage.js
 * for the full rationale. Same module, mirrored into the admin app so
 * admin and student/instructor tabs don't clobber each other's tokens.
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

  set(key, value, opts = {}) {
    const persist = opts.persist !== false;
    try { sessionStorage.setItem(key, value); } catch {}
    if (persist) {
      try { localStorage.setItem(key, value); } catch {}
    } else {
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

  setTokens({ accessToken, refreshToken } = {}, { rememberMe = false } = {}) {
    if (accessToken) this.set('accessToken', accessToken, { persist: rememberMe });
    if (refreshToken) this.set('refreshToken', refreshToken, { persist: rememberMe });
  },
};
