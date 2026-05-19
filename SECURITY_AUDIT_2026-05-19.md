# Pre-Launch Security Audit — TekyPro LMS
**Date:** 2026-05-19
**Audit type:** Pre-Launch Checklist (security-prompts.md §7)
**Launch target:** ~2026-05-31
**Verdict at a glance:** 🚨 **2 BLOCKERS** before launch. Most gates pass. Several advisory upgrades worth doing.

---

## 🚨 BLOCKERS (must fix before launch)

### B1 — Real JWT and DB secrets committed to git history
**Severity:** Critical
**File:** `backend/.env.local.backup` (currently tracked, committed in `fece923`)
**Evidence:**
```
DB_PASSWORD=Sunmboye@1
JWT_SECRET=3b938607813a8754c46daa65df309120d379c37fa7e9f6af7df285d0a1183e8ebafa5ce3560c4fef5e83fe10bf8f5fbab726fcad2c9a7a8a6582efe4020038d4
JWT_REFRESH_SECRET=ce1e211892e953f9674d3f4b74a40f3d42c1d63f476db39487c65cc786bc5a1986697a5e09fc5093a931e9d0413edb86bd75b15e79cfa0d15e3e70ce54f205e9
```
**Attack:** Anyone with repo read access can forge any user's JWT (sign with the leaked `JWT_SECRET`) and impersonate them. Refresh-token forgery is also possible. DB password reuse on prod = total compromise.
**Fix:**
1. Remove the file from the current tree: `git rm backend/.env.local.backup`
2. Rewrite history to scrub it: `git filter-repo --path backend/.env.local.backup --invert-paths` (or use BFG). Force-push.
3. **Rotate the secrets** — even after history rewrite, anyone who cloned the repo before now has them. Regenerate `JWT_SECRET`, `JWT_REFRESH_SECRET`, change the DB password.
4. Add explicit pattern to `.gitignore`: `*.env.local*`, `*.env*backup*`.

### B2 — PayPal blocked by Content Security Policy in production
**Severity:** High (functional block, no payments possible)
**File:** `backend/middleware/security.js:66-82`
**Evidence:** CSP allows only Stripe origins. PayPal SDK loads from `https://www.paypal.com` and `https://www.paypalobjects.com`; both will be blocked by the current `script-src`, `connect-src`, and `frame-src` directives.
**Fix:** Update CSP to also allow PayPal origins:
```js
"script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com https://www.paypal.com https://www.paypalobjects.com",
"connect-src 'self' wss: ws: https://api.stripe.com https://js.stripe.com https://api-m.paypal.com https://api-m.sandbox.paypal.com https://www.paypal.com",
"frame-src https://js.stripe.com https://hooks.stripe.com https://www.paypal.com",
"img-src 'self' data: https: blob: https://www.paypalobjects.com",
```

---

## ⚠️ ADVISORIES (launch OK, fix soon)

### A1 — 9 HIGH npm vulnerabilities in backend production dependencies
**Evidence:** `cd backend && npm audit --omit=dev`
- `sequelize` — SQL Injection via JSON Column Cast Type
- `axios` — SSRF + Cloud Metadata Exfiltration
- `socket.io-parser` — unbounded binary attachments (DoS)
- `lodash` — Prototype Pollution + Code Injection
- `express-rate-limit` — bypass on dual-stack (IPv4-mapped IPv6)
- `multer` — DoS via incomplete cleanup
- `path-to-regexp` — ReDoS
- `minimatch` — ReDoS
- `underscore` — unbounded recursion DoS

**Exploitability in OUR code (quick triage):**
- Sequelize SQL injection requires `cast()` on JSON columns — we don't do that. **Not currently exploitable.**
- axios SSRF/SSRF requires user-controlled URL passed to axios — we only call hard-coded PayPal/Paystack URLs. **Not currently exploitable.**
- socket.io-parser — we use socket.io for chat → **upgradable, real DoS surface.**
- multer DoS — uploads are authenticated and rate-limited → **limited exposure but worth upgrading.**
- express-rate-limit bypass — Railway terminates TLS upstream, so dual-stack rate-bypass less likely → **upgrade.**

**Fix:** `cd backend && npm update sequelize socket.io socket.io-parser express-rate-limit multer axios path-to-regexp lodash && npm audit --omit=dev` then test thoroughly.

### A2 — Frontend dependency vulns (5 HIGH)
**Fix:** `cd frontend && npm audit fix` / manual review. Same for `frontend-admin` (1 HIGH).

### A3 — Seed script hard-codes `password123` for all seeded users
**File:** `backend/scripts/seedDatabase.js:132`, `:137`, `:152`
Default seed creates `admin@tekypro.com` (super_admin) + others, all with bcrypt hash of `password123`.
**Risk:** If `npm run seed` is ever run against production, attackers know the admin password.
**Fix:** Either (a) refuse to run when `NODE_ENV=production`, or (b) require an env var `SEED_ADMIN_PASSWORD` at runtime. Recommend (a).
```js
if (process.env.NODE_ENV === 'production') {
  console.error('seedDatabase refuses to run in production');
  process.exit(1);
}
```

### A4 — Logger has no field-level redaction
**File:** `backend/utils/logger.js`
Current logger does not scrub `password`, `token`, `authorization`, etc. fields. No instances of secrets currently being logged found in code review, but future code could leak without anyone noticing.
**Fix:** Add a winston format that redacts known sensitive keys before formatting. Example:
```js
const REDACT_KEYS = ['password', 'password_hash', 'token', 'accessToken', 'refreshToken', 'authorization', 'jwt', 'secret', 'apiKey'];
const redactFormat = winston.format((info) => {
  const walk = (obj) => {
    if (obj && typeof obj === 'object') for (const k of Object.keys(obj)) {
      if (REDACT_KEYS.includes(k.toLowerCase())) obj[k] = '[REDACTED]';
      else walk(obj[k]);
    }
  };
  walk(info);
  return info;
});
```

### A5 — Privacy policy / cookie consent / data-deletion endpoint missing
**Evidence:** No `/api/users/me/account` delete route, no privacy-policy / GDPR / cookie-consent files found in `frontend/` or `frontend-admin/`. `CTO_ROADMAP.md:276` lists "GDPR compliance features" as future work.
**Risk:** If TekyPro serves any EU/UK student, this is legally non-compliant.
**Fix (minimum):**
1. Add a static privacy policy page on the marketing site / login.
2. Add a "Delete my account" endpoint: `DELETE /api/users/me/account` with confirmation flow, that nullifies/deletes the user's PII per retention policy.
3. Cookie banner — only required if you use tracking cookies (Google Analytics, FB pixel). If only session cookies used for auth, no banner needed under GDPR's "strictly necessary" exception.

### A6 — Root `package-lock.json` is gitignored
**File:** `.gitignore:14`
**Risk:** Supply-chain integrity at the workspace level — if any prod tooling reads root `package.json`, the absence of a lockfile means CI could pull different transitive versions than dev.
**Note:** `backend/`, `frontend/`, `frontend-admin/` lockfiles ARE tracked — this is only the workspace root. Low risk in practice because nothing critical lives at root.
**Fix:** Remove `package-lock.json` from the root `.gitignore` if root has a real `package.json` with prod deps. If root is just a meta wrapper, leave as-is.

---

## ✅ PASSED CHECKS

| Gate | Evidence |
|---|---|
| HTTPS enforced in prod | `server.js:37-44` — redirects `x-forwarded-proto !== 'https'` to 301 HTTPS |
| HSTS header | `middleware/security.js:111-115` — `max-age=31536000; includeSubDomains; preload` (prod only) |
| X-Frame-Options | `middleware/security.js:88` — `DENY` |
| X-Content-Type-Options | `middleware/security.js:96` — `nosniff` |
| Referrer-Policy | `middleware/security.js:122` — `strict-origin-when-cross-origin` |
| Permissions-Policy | `middleware/security.js:129-138` — camera/mic/geo/etc disabled |
| CORS not `*` with credentials | `server.js:80-110` — allowlist of named origins, `credentials: true` |
| `helmet()` applied | `server.js:60` |
| CSP present (but see B2 for PayPal gap) | `middleware/security.js:66-82` |
| Rate limiter — global | `middleware/rateLimiter.js:175`, applied at `server.js:136` |
| Rate limiter — login | `routes/api/auth.js:27` uses `authRateLimiter` |
| Rate limiter — register | `routes/api/auth.js:22` uses `registrationLimiter` |
| Rate limiter — password reset | `routes/api/auth.js:42,47` uses `passwordResetLimiter` |
| Rate limiter — payments | `routes/api/payments.js` uses `checkoutLimiter` on all initialize/capture |
| 500-error message hidden in prod | `middleware/errorHandler.js:75-78` |
| `sequelize.sync` blocked in prod | `server.js:392`, `:529` — explicit `NODE_ENV !== 'production'` gates |
| `DB_FORCE_RESET` removed | Per memory: commit `2483003` removed it entirely |
| Database not bound to host | `docker-compose.yml` — MySQL + Redis only on internal network, no host port mapping |
| CSRF protection | `server.js:147-156` — double-submit cookie pattern, skips webhooks and Bearer auth |
| Raw card data never on our server | No `card_number`/`cvv` references; payments via Stripe Checkout, Paystack Inline, PayPal SDK |
| `.env` files in `.gitignore` (current tree) | Both root and `backend/` `.gitignore` ignore `.env*` |
| Lockfiles tracked (backend/frontend/admin) | `git ls-files` confirms |
| Uploads go to Cloudinary, not local FS | `services/storage/cloudinary.js` — no path-traversal risk on our server |
| Webhook signature verification | Stripe + Paystack + PayPal all verify before processing (Paystack HMAC; PayPal via `verify-webhook-signature` endpoint) |
| `trust proxy` set | `server.js:34` — `app.set('trust proxy', 1)` so rate-limit uses real client IP |
| Prometheus `/metrics` admin-gated | Per memory commit `68499d9` |

---

## ⏳ THINGS I COULD NOT VERIFY (need user / external check)

| # | Item | Where to check |
|---|------|----|
| U1 | Domain registrar lock + 2FA | His registrar account |
| U2 | 2FA on Railway / Render / Cloudinary / PayPal | Those accounts |
| U3 | Database backups configured + restore tested | Wherever DB ends up hosted (Railway provides automated daily backups on paid tiers; verify after renewal) |
| U4 | DNS SPF/DKIM/DMARC | `dig tekypro.com TXT` once DNS resolves |
| U5 | Incident response plan exists | Owner-side process |
| U6 | Production env vars don't reuse the leaked JWT secrets from B1 | After rotation, confirm Railway env has new values |

---

## NON-FINDINGS (look scary, are fine)

- `'unsafe-inline'` in CSP `script-src` — Stripe and PayPal SDKs both require it; this is industry-normal for payment-integrated apps. CSP still blocks external script injection thanks to `default-src 'self'` and the specific allowlist.
- `MYSQL_ROOT_PASSWORD` fallback in `docker-compose.yml` — the `?Error:` syntax means it FAILS to start if the env var isn't set, no insecure fallback used.
- Multiple `process.env.NODE_ENV !== 'production'` branches enabling Swagger / sync / verbose errors — all correctly gated, won't activate in prod.
- `console.log` calls in `backend/scripts/*` — these are CLI utility scripts (`getLoginCredentials`, `resetAdminPassword`) that run manually, not in the request path.

---

## RECOMMENDED FIX ORDER

1. **Right now (15 min):** Fix B1 — remove `.env.local.backup`, rewrite history, rotate JWT secrets.
2. **Today (5 min):** Fix B2 — update CSP for PayPal.
3. **Before launch (1-2 hr):** A1 — backend dependency upgrades + smoke test.
4. **Before launch (10 min):** A3 — guard seed script against production.
5. **Within first week:** A4 — logger redaction, A2 — frontend dep upgrades.
6. **Within first month:** A5 — privacy policy + delete-account endpoint.
7. **After client gives accounts:** U1–U6 — registrar lock, 2FA, backups, DNS auth.

---

## SUMMARY VERDICT

| | Count |
|---|---|
| 🚨 Blockers | 2 |
| ⚠️ Advisories | 6 |
| ✅ Passes | 22 |
| ⏳ External (cannot verify) | 6 |

The codebase is in solid shape — multiple prior audits show. The two blockers are both fixable in under 30 minutes total. The dependency advisory is the biggest "do it now anyway" item.

Estimated time to clear blockers: **30 minutes.**
