# White-Label Setup — Shipping This Platform for a New Company

How to take this codebase (built as Page Innovations) and ship it for another
company — Page Innovations or anyone after them — cleanly, without
touching the original.

**The model:** Page Innovations's repo is the MASTER. Each client gets their own
copy (fork/duplicate), their own Railway project, and their own set of
accounts. Bug fixes land in the master first, then get pulled into each
client copy (see "Keeping clients up to date" at the bottom).

---

## Part 1 — What the new company must provide

Send them this list. Nothing can go live until every row is delivered.

### Accounts they must create (all have free tiers)

| # | Account | What we need from them | Where they get it |
|---|---------|------------------------|-------------------|
| 1 | **Domain** | Their domain (e.g. pageinnovation.com) + DNS access | Namecheap / any registrar |
| 2 | **Railway** | An account with billing enabled (~$5-20/mo) — or they add you to their team | railway.app |
| 3 | **Resend** (email) | API key, and DNS records added for their domain | resend.com — free 3k emails/mo |
| 4 | **PayPal Business** | Live Client ID + Secret + Webhook ID (from developer.paypal.com, app of type "Merchant") | paypal.com business account |
| 5 | **Cloudinary** (file storage) | Cloud name + API key + API secret + an unsigned upload preset | cloudinary.com — free tier |
| 6 | **Google Cloud** (Google login) | OAuth Client ID + Secret with the right redirect URL | console.cloud.google.com |
| 7 | **Cloudflare Turnstile** (bot protection) | Site key + secret key | cloudflare.com — free |

### Optional accounts (only if they want the feature)

| Account | Feature it powers |
|---------|-------------------|
| Discord (bot app + server) | Course community channels, auto role assignment |
| Zoom | Auto-created live session meetings |
| Redis (Railway plugin) | Faster rate limiting + caching (app works without it) |
| Stripe / Paystack | Extra payment gateways beyond PayPal |

### Branding assets they must provide

- [ ] Company name (exact spelling — used in every email, page, certificate)
- [ ] Tagline (one line, appears on login page + PDFs)
- [ ] Logo — PNG, transparent background, wide format (roughly 4:1, like a wordmark)
- [ ] Brand colors — primary, secondary, accent (hex codes)
- [ ] Support email address
- [ ] The currency they sell in (USD, NGN, …)

---

## Part 2 — Duplicating the project

```bash
# 1. Clone the master into a new folder named for the client
git clone https://github.com/Anointed-Excel/TekyproLMS.git PageInnovationLMS
cd PageInnovationLMS

# 2. Detach from Page Innovations's GitHub and attach to a NEW private repo
git remote remove origin
# (create an empty private repo on GitHub first, e.g. PageInnovationLMS)
git remote add origin https://github.com/YOUR-USER/PageInnovationLMS.git

# 3. Run the rebrand script (replaces the name everywhere, prints
#    the remaining manual steps)
./scripts/rebrand.sh "Page Innovations"

# 4. Manual branding steps the script will remind you of:
#    a. Replace frontend/src/assets/logo.png        (their logo)
#    b. Replace frontend-admin/src/assets/logo.png   (same file)
#    c. Edit frontend/tailwind.config.js — the 'brand-blue',
#       'brand-purple', 'brand-red' hex values (keep the token NAMES,
#       change only the color values — every page follows automatically)
#    d. Same edit in frontend-admin/tailwind.config.js
#    e. frontend/index.html + frontend-admin/index.html — <title> and
#       favicon
#    f. Landing page copy (frontend/src/pages/LandingPage.jsx) — hero
#       text, feature bullets, footer

# 5. Commit and push
git add -A && git commit -m "rebrand: Page Innovations" && git push -u origin main
```

---

## Part 3 — Railway setup (per client)

Create ONE new Railway project with FOUR services:

| Service | Source | Notes |
|---------|--------|-------|
| **Postgres** | Railway plugin "PostgreSQL" | Copy its DATABASE_URL |
| **backend** | The new GitHub repo, root dir `/backend` | All env vars below |
| **student frontend** | Same repo, root dir `/frontend` | Vite build |
| **admin frontend** | Same repo, root dir `/frontend-admin` | Vite build |

### Backend env vars (complete list)

```bash
# Core
NODE_ENV=production
DATABASE_URL=<from the Postgres plugin>
FRONTEND_URL=https://<student-service>.up.railway.app
ADMIN_FRONTEND_URL=https://<admin-service>.up.railway.app

# Secrets — generate fresh PER CLIENT, never reuse Page Innovations's:
#   openssl rand -hex 32   (run once per secret)
JWT_SECRET=<random 64 chars>
JWT_REFRESH_SECRET=<random 64 chars>
EMAIL_UNSUB_SECRET=<random 64 chars>
SEED_SECRET=<random 32 chars>

# Email (Resend)
RESEND_API_KEY=re_...
EMAIL_FROM=Page Innovations <noreply@pageinnovation.com>
# optional per-purpose senders:
# EMAIL_FROM_REGISTRATION=Page Innovations <registration@pageinnovation.com>
# EMAIL_FROM_PORTAL=Page Innovations <portal@pageinnovation.com>

# Payments (PayPal is the primary gateway)
PAYPAL_CLIENT_ID=...
PAYPAL_CLIENT_SECRET=...
PAYPAL_WEBHOOK_ID=...        # register webhook URL first, see below
PAYPAL_MODE=sandbox          # flip to live after testing

# File storage
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...

# Google login
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_CALLBACK_URL=https://<backend>.up.railway.app/api/auth/google/callback

# Bot protection
TURNSTILE_SECRET_KEY=...

# Optional
# DISCORD_BOT_TOKEN= / DISCORD_CLIENT_ID= / DISCORD_CLIENT_SECRET=
# DISCORD_GUILD_ID= / DISCORD_INVITE_URL= / DISCORD_REDIRECT_URI=
# REDIS_ENABLED=true + REDIS_HOST/PORT/PASSWORD (Railway Redis plugin)
# STRIPE_SECRET_KEY= / STRIPE_WEBHOOK_SECRET= / PAYSTACK_SECRET_KEY=
```

### Student frontend env vars

```bash
VITE_API_URL=https://<backend>.up.railway.app
VITE_PAYMENT_CURRENCY=USD          # or NGN etc.
VITE_PAYPAL_CLIENT_ID=<same live/sandbox client id>
VITE_CLOUDINARY_CLOUD_NAME=...
VITE_CLOUDINARY_UPLOAD_PRESET=...
VITE_TURNSTILE_SITE_KEY=...
```

### Admin frontend env vars

```bash
VITE_API_URL=https://<backend>.up.railway.app
VITE_MAIN_APP_URL=https://<student-service>.up.railway.app
VITE_PAYMENT_CURRENCY=USD
```

### External registrations that reference the URLs

Do these AFTER the Railway URLs exist:

1. **PayPal webhook:** developer.paypal.com → the app → Webhooks →
   add `https://<backend>.up.railway.app/api/webhooks/paypal`
   (subscribe to payment capture events) → copy the Webhook ID into
   `PAYPAL_WEBHOOK_ID`
2. **Google OAuth redirect:** console.cloud.google.com → the OAuth
   client → Authorized redirect URIs → add the GOOGLE_CALLBACK_URL above
3. **Resend domain:** verify their domain (see `email-domain-setup.md` —
   same 3-DNS-records dance, in THEIR registrar)
4. **CORS allowlist:** edit `backend/config/allowedOrigins.js` in their
   repo — replace the Page Innovations Railway/Render URLs with the new client's
   frontend URLs. (Socket.IO and HTTP share this file.)

---

## Part 4 — First boot

1. Deploy all three code services. Boot auto-runs migrations — the
   Postgres schema builds itself.
2. Create the first admin:
   ```bash
   # from your machine, in the client repo:
   DATABASE_URL=<their railway postgres url> node backend/scripts/createAdmin.js
   ```
3. Log into the admin app → Categories → create their course categories.
4. (Optional demo content) `POST /api/seed/enrich` with their SEED_SECRET
   once they have courses — fills lesson articles, reviews, question bank.
5. Run the smoke tests: signup (email arrives?), login, enroll in a free
   course, sandbox PayPal payment, live session + attendance code.

---

## Part 5 — Keeping clients up to date

Bug fixes go into the Page Innovations master repo first. To pull them into a
client copy:

```bash
cd PageInnovationLMS
git remote add upstream https://github.com/Anointed-Excel/TekyproLMS.git   # once
git fetch upstream
git merge upstream/main     # conflicts will be in branding files only,
                            # keep the client's side for those
git push
```

The rebrand touches (name strings, logo, colors, landing copy) are the
only files that conflict — everything else merges clean. This is why the
rebrand deliberately does NOT restructure code.

---

## Quick-reference: total cost per client (monthly)

| Item | Cost |
|------|------|
| Railway (4 services incl. Postgres) | ~$5–20 |
| Resend | $0 until 3k emails/mo |
| Cloudinary | $0 on free tier |
| PayPal | per-transaction fees only |
| Domain | ~$10–15/YEAR |
| **Total** | **~$5–20/mo + payment fees** |
