# Security Audit — Page Innovation (2026-07-01)

End-to-end audit of authentication, authorization, session, transport,
input handling, and secrets management across the 3 apps. Written the
same way as `finance-audit.md` / `email-audit.md` — findings ordered
by severity, prioritized punch list at the end.

---

## TL;DR

| Area | Status | Notes |
|---|---|---|
| Password hashing | ✅ Solid | bcrypt, cost=12, format checked at login |
| Password strength | ✅ Solid | Joi: min 8, requires upper+lower+digit |
| JWT signing | ✅ Solid | Separate access + refresh secrets; verifies expiry |
| CSRF (double-submit cookie) | ✅ Solid | Constant-time compare, correct exempt list |
| Rate limiters | ✅ Solid | Auth (5/15min), password reset (3/hr), register (5/hr), global (1000/15min) |
| helmet + CSP | ✅ Solid | Locked down to known payment / font / img origins |
| CORS | ✅ Solid | Explicit allowedHeaders; credentials on |
| SQL injection | ✅ Safe | Sequelize parameterized everywhere; no raw string concat found |
| SmartSanitizer | ✅ Solid | URL fields (_url/_uri/_link) skipped correctly; rich text lenient |
| bcrypt on password change | ✅ Auto | Hooks in User model re-hash on save |
| Password reset link expiry | ✅ 1h | + rate limited |
| Attack-pattern detection | ⚠️ Fine | Blocks `<script>` and path traversal on non-content endpoints |
| **2FA** | ❌ **Decorative** | `two_factor_enabled` never gates login. `req.session` is undefined; state doesn't persist. |
| **Token blacklist** | ⚠️ Degrades silently | No Redis → logout doesn't invalidate anything |
| **`JWT_SECRET` strength** | ⚠️ Unchecked | Operator could set 'change-me'; no minimum-length assert at boot |
| **Client XSS surface** | ⚠️ Server-only | 4 `dangerouslySetInnerHTML` sites trust the server sanitizer |
| **CSP has `'unsafe-inline'` for script + style** | ⚠️ Trade-off | Needed by Stripe, PayPal, Paystack popups; documented, not fixable without heavy refactor |
| **`req.session` referenced but never installed** | ⚠️ Dead code | `middleware/security.js` `csrfProtection` + all of `twoFactorController` |
| **JWT payload leaks role** | ⚠️ Minor | Access token carries `role`; server re-checks so not exploitable, but blurs single-source-of-truth |
| **Client stores tokens in localStorage** | ⚠️ Trade-off | Enables per-tab role switching but expands XSS blast radius |
| **`detectAttackPatterns` false-positives risk** | ⚠️ Minor | Regex over `JSON.stringify(body)` — legit content with `; rm ` could 403 on non-content endpoints |
| **Forgot-password enumerates emails** | ⚠️ Check | Need to verify the 200 response is identical whether the email exists or not |

Legend: ✅ solid, ⚠️ caveat, ❌ broken

---

## 1. Authentication

**Passwords.** bcrypt with cost=12. Salt generated per user. On save,
Sequelize hooks re-hash if `password_hash` changed and doesn't start
with `$2b$`. Login uses `bcrypt.compare` — constant-time. ✅

**Registration validation** (Joi):
- `password: min(8).max(128)` with pattern requiring uppercase + lowercase + digit.
- No special-character requirement — arguable, not strictly required.
- `full_name` size-limited, `email` validated as RFC email.
✅

**Login flow (`authController.login`, line 520+):**
1. Look up user by email.
2. `user.comparePassword(password)`.
3. Failed → log activity → 401.
4. Success → check `email_verified` → 403 with `EMAIL_NOT_VERIFIED` code.
5. Generate JWTs (with optional `rememberMe` extended expiry).
6. Set cookies + return tokens.

**Missing step:** if `user.two_factor_enabled === true`, the flow should
stop here and require a follow-up `/api/auth/2fa/authenticate` call
before issuing tokens. It doesn't. See §4.1.

**JWT lifetimes.**
- Access token: 24h default, 7d with rememberMe.
- Refresh token: 7d default, 30d with rememberMe.
- Separate secrets (`JWT_SECRET` / `JWT_REFRESH_SECRET`). ✅

---

## 2. CSRF

**Double-submit cookie pattern** in `server.js:200-209`:
- Skips safe methods (GET/HEAD/OPTIONS).
- Skips Bearer-token requests (correct — Authorization header can't be forged from third-party origins).
- Skips signed webhooks (Stripe / Paystack / PayPal have their own signatures).
- Skips a whitelist of bootstrap auth endpoints (login, register, refresh, verify code, resend verification, forgot password, reset password, 2fa/authenticate — all rate-limited).
- Constant-time compare via `crypto.timingSafeEqual`.

Reasonable. The exempt list is the sensitive part — it's the intersection
of "unauthenticated endpoints that mutate" and "must accept cross-origin
POST from the SPA before a CSRF cookie exists." Every entry is
individually rate-limited, so brute force is contained.

**Dead code:** `middleware/security.js` still exports a
`csrfProtection` function that reads `req.session.csrfToken`. It's not
registered anywhere and would 500 if it were, since `express-session`
isn't installed. See §5.

---

## 3. Rate limiters

`middleware/rateLimiter.js` + inline `checkoutLimiter` in
`routes/api/payments.js`:

| Limiter | Window | Max | Applied to |
|---|---|---|---|
| Global API | 15 min | 1000 | Every `/api/*` |
| Auth (login) | 15 min | 5 | `/api/auth/login` |
| Password reset | 1 hour | 3 | `/api/auth/forgot-password` |
| Registration | 1 hour | 5 | `/api/auth/register` |
| Upload | 1 hour | 100 | Upload routes |
| Test submit | 1 min | 10 | Practice + assigned test submit |
| Checkout | 15 min | 10 | Payment initialize endpoints |

Good coverage. Rate limits are per IP (`ipKeyGenerator`), which behind
Railway's proxy resolves to the client IP as long as `trust proxy` is
enabled — worth verifying that once (see §11.3).

---

## 4. Findings (by severity)

### 🔴 Critical

**4.1 2FA is decorative — login never checks it.**

`authController.login` generates JWTs immediately after password
verification. There's no branch on `user.two_factor_enabled`. A user
who enables 2FA gets zero additional protection at login time —
password alone still works.

Additionally, `TwoFactorController.authenticate` writes state to
`req.session`, but `express-session` isn't installed:
```js
req.session = req.session || {};
req.session.twoFactorVerified = true;   // written to a plain object
req.session.twoFactorUserId = userId;   // that dies with the request
```
So even the "verify 2FA code" endpoint just returns `{ verified: true }`
without persisting anything the login flow could consume.

**Fix (correct pattern):**
1. Login endpoint: after password verify + email verify, if
   `user.two_factor_enabled`, return `{ requires2FA: true, userId }`
   instead of tokens.
2. Frontend collects the OTP code from user.
3. Frontend posts `{ userId, token }` to `/api/auth/2fa/authenticate`.
4. Backend verifies via `authenticator.verify`, and ON SUCCESS returns
   real JWT tokens (with the same cookie set as normal login).

This works without express-session — the verified 2FA state is
implicit in the token being issued.

**4.2 Token blacklist silently no-ops when Redis is down.**

`TokenBlacklist.addToBlacklist` returns `false` and logs a warning
when Redis isn't available:
```js
if (!isRedisAvailable()) {
  logger.warn('Redis not available - token blacklist disabled');
  return false;
}
```
This means `/api/auth/logout` on prod without Redis just deletes the
cookie — but if the attacker already lifted the token (via XSS, log
scraping, etc.), it stays valid until natural expiry (24h / 7d /
30d).

**Fix:** at boot, hard-fail if `NODE_ENV=production` and Redis isn't
configured. Or add an in-memory fallback (bounded LRU) so at least a
single-instance deployment gets logout protection.

---

### 🟡 Important

**4.3 `JWT_SECRET` strength is unchecked.**

If the operator sets `JWT_SECRET=changeme` or leaves it blank in prod,
tokens can be brute-forced or forged. There's no minimum-length
assertion at boot.

**Fix:** add a startup check:
```js
if (process.env.NODE_ENV === 'production'
    && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET must be at least 32 chars in production');
}
```
Same check for `JWT_REFRESH_SECRET` and the new `EMAIL_UNSUB_SECRET`.

**4.4 `dangerouslySetInnerHTML` in 4 places.**

Sites:
- `frontend/src/pages/KnowledgeBase.jsx:66` — `selected.content || selected.body`
- `frontend/src/pages/CoursePlayer.jsx:890` — `currentContent.article_content` (through `formatArticleContent`)
- `frontend/src/pages/instructor/CourseBuilder.jsx:1273` — `previewContent.article_content`
- `frontend-admin/src/pages/admin/CourseBuilder.jsx:1229` — `lessonPreview.article_content`

All rely on the server sanitizer having stripped `<script>` before
storage. `smartSanitizer` does strip them, but any bypass (or content
loaded from a non-sanitized path) is instantly XSS.

**Fix:** use DOMPurify on the client for rich-text render sites.
Defense in depth. Server sanitizer is your first line, DOMPurify is
your second.

**4.5 Client stores tokens in localStorage / sessionStorage.**

`frontend/src/utils/tokenStorage.js` reads/writes access + refresh
tokens to `sessionStorage` (per-tab) or `localStorage` (remember-me).
This is a deliberate trade-off to support the dual-role tab pattern
you memory'd (`[[project-dual-role-design]]`), but it means any XSS
that lands can lift both tokens. The httpOnly cookies mitigate for
requests that flow through the browser, but a leaked token can be
replayed from an attacker's machine.

**No cheap fix** — this is the price of the per-tab UX. Worth
documenting as a known trade-off; harden by making sure §4.4 is done
so no XSS lands in the first place.

**4.6 `req.session` is referenced but not installed.**

`middleware/security.js` exports:
- `csrfProtection` — reads `req.session.csrfToken`. Not used anywhere.
- `provideCSRFToken` — writes `req.session.csrfToken`. Not used anywhere.

`controllers/auth/twoFactorController.js` `authenticate()` writes
`req.session.twoFactorVerified`. Called but state doesn't persist
(§4.1).

**Fix:** delete the dead functions from `security.js`. Fix
`twoFactorController.authenticate` as part of §4.1.

**4.7 `detectAttackPatterns` false-positive risk.**

The middleware regex tests over `JSON.stringify({body, query, params})`
and 403s on match. On non-content endpoints, it includes:
```js
/[;|`]\s*(rm|cat|wget|curl|bash|sh|nc|netcat)\b/i
```
Legitimate user content on non-content endpoints (e.g. a note field
in a payment metadata form, a search query, an assignment submission
comment) that happens to say `"...then run rm ..."` triggers 403.

Also: this is a bandaid, not a defense. Real defense is
Sequelize parameterized queries (which you have) + input validation
+ output encoding.

**Fix:** either narrow the trigger (only match on `req.query` string
values, not JSON.stringify of the whole request) or delete the
middleware. Sequelize + Joi + smartSanitizer already cover the real
threats.

**4.8 CSP allows `'unsafe-inline'` on script + style.**

`middleware/security.js:69-77`:
```
script-src 'self' 'unsafe-inline' ...
style-src 'self' 'unsafe-inline' ...
```
`unsafe-inline` neuters most of CSP's XSS defense. It's needed today
because Stripe / PayPal / Paystack SDKs inject inline scripts at
runtime.

**No quick fix.** Real fix requires nonce-based CSP (`'nonce-abc123'`
in the header, matching `nonce="abc123"` on every allowed inline
script tag), rendered per-request from a random per-request nonce.
Doable but touches every render path in the SPA. Worth doing
before serious enterprise/regulated customers.

**4.9 Forgot-password email enumeration risk.**

Need to check: does `POST /api/auth/forgot-password` return an
identical 200 whether the email exists or not? If it 404s on
unknown emails, an attacker can enumerate registered accounts.

**Fix:** confirm the endpoint always returns
`{ success: true, message: 'If that email exists, we sent a reset link' }`
regardless of DB hit/miss.

**4.10 JWT payload leaks `role`.**

Access token payload: `{ id, email, role }`. Anyone who lifts a token
can see the user's role. Not exploitable — `authorize()` re-reads from
DB via `req.user.role` — but it means the JWT is not a minimal claim.

**Cheap fix:** drop `role` from the token payload; `authenticate`
already re-fetches the user from DB. Would let you skip a query if
you added role-caching, but you'd need to invalidate on role change.
Low-priority polish.

---

### 🟢 Minor / defensive

**4.11 `trust proxy` should be set for accurate rate-limiter keying.**

Railway routes through a load balancer. Without `app.set('trust proxy', 1)`
(or similar), `req.ip` sees Railway's internal IP, not the client's.
Result: every request looks like the same IP, so all users get
lumped into a single rate-limit bucket.

**Fix:** verify + set `app.set('trust proxy', 1)` in `server.js`
before rate limiters mount.

**4.12 Refresh endpoint has no rate limiter.**

`/api/auth/refresh` is CSRF-exempt and unauthenticated. A stolen
refresh token could be replayed infinitely to mint new access
tokens. Adding a per-IP rate limit (say 30/hour) would mitigate.

**4.13 Password reset token — no per-user single-use guarantee.**

Worth verifying: after `/api/auth/reset-password` succeeds, is the
`PasswordReset` row marked `used=true` or deleted so the same token
can't be replayed?

**4.14 No account lockout after N failed logins.**

Rate limiter is per-IP, not per-account. An attacker with a residential
proxy pool can brute-force a specific account by rotating IPs. Not
exploitable given 8-char + complexity passwords, but combining
per-IP + per-account counters would be safer.

---

## 5. What's NOT broken

- Sequelize is used everywhere for DB reads/writes. No `sequelize.query` with string concatenation found in code paths (only in the migration block, which reads env-fixed table names).
- `smartSanitizer` correctly skips URL fields (URL_FIELDS + `_url/_uri/_link` suffix), so the historical "meeting URL rendered as `about:blank`" bug is closed. See [[project-url-sanitizer-pattern]].
- helmet + CORS + `frame-ancestors 'none'` protect against clickjacking.
- Webhook endpoints verify provider signatures before parsing the body (see finance-audit §6).
- Cookies are marked `httpOnly`, `secure` in prod, `sameSite` set per env.
- `preventRateLimitBypass` middleware exists (not read here but registered).
- Metrics endpoint is token-gated via `PROMETHEUS_TOKEN`.

---

## 6. Prioritized punch list

### P0 — ship-blocking for live payments
1. **Wire 2FA into the login flow.** Users who enabled it today think they're protected. §4.1
2. **Add `JWT_SECRET` strength assertion at boot.** §4.3

### P1 — before scaling
3. **Verify + set `trust proxy`** so rate limiters key on client IPs. §4.11
4. **Confirm forgot-password doesn't enumerate emails.** §4.9
5. **Rate-limit `/api/auth/refresh`.** §4.12
6. **Verify password-reset token single-use.** §4.13
7. **Redis for token blacklist** — fail-fast at boot in prod, or add in-memory fallback. §4.2

### P2 — hardening
8. **Client DOMPurify on the 4 dangerouslySetInnerHTML sites.** §4.4
9. **Delete dead `csrfProtection` / `provideCSRFToken` from `middleware/security.js`.** §4.6
10. **Narrow or delete `detectAttackPatterns`.** False positives waiting to happen. §4.7
11. **Per-account failed-login counter** (in addition to per-IP). §4.14

### P3 — polish
12. **Nonce-based CSP** to remove `unsafe-inline`. §4.8
13. **Drop `role` from JWT payload.** §4.10

---

## 7. Files of interest

- `backend/utils/jwt.js` — token gen/verify
- `backend/utils/csrf.js` — double-submit cookie
- `backend/middleware/auth/authMiddleware.js` — authenticate + authorize + checkOwnership + checkNotSuspended
- `backend/middleware/security.js` — helmet supplement + CSP + attack patterns + dead session code
- `backend/middleware/smartSanitizer.js` — context-aware input sanitization
- `backend/middleware/rateLimiter.js` — every rate limiter
- `backend/middleware/validation/authValidation.js` — Joi schemas for auth endpoints
- `backend/controllers/auth/authController.js` — login (2FA bug at line 520)
- `backend/controllers/auth/twoFactorController.js` — the broken 2FA state
- `backend/utils/tokenBlacklist.js` — Redis-dependent logout
- `backend/server.js` — CSRF middleware, helmet, CORS, exempt list
