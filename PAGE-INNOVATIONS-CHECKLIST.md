# Page Innovations — Everything You Need to Provide

This is the complete list of accounts, keys and assets Page Innovations
must hand over before the app can go live. Every account has a free tier
unless noted. Send each item as soon as it's ready — nothing goes live
until every required row is delivered.

---

## 1. Required accounts & credentials

| # | Account | What to send us | Where to get it |
|---|---------|-----------------|-----------------|
| 1 | **Domain** | Your domain name (e.g. pageinnovations.com) + access to its DNS settings | Namecheap or any registrar (~$10–15/year) |
| 2 | **Railway** (hosting) | An account with billing enabled (~$5–20/month), or add us to your team | railway.app |
| 3 | **Resend** (email sending) | API key; later we'll add 3 DNS records to your domain so emails send as @pageinnovations.com | resend.com — free up to 3,000 emails/month |
| 4 | **PayPal Business** (payments) | Live Client ID + Secret from developer.paypal.com (app type "Merchant"); we'll register the webhook and get the Webhook ID together | paypal.com business account |
| 5 | **Cloudinary** (image/file storage) | Cloud name + API key + API secret + an unsigned upload preset | cloudinary.com — free tier |
| 6 | **Google Cloud** (Google login) | OAuth Client ID + Client Secret | console.cloud.google.com |
| 7 | **Cloudflare Turnstile** (bot protection) | Site key + Secret key | cloudflare.com — free |

## 2. Optional accounts (only if you want the feature)

| Account | Feature it powers |
|---------|-------------------|
| **Discord** (bot app + your server) | Course community channels, automatic role assignment. Need: bot token, client ID + secret, server (guild) ID, invite link |
| **Zoom** | Live class meetings created automatically |
| **Redis** (Railway plugin) | Faster caching — the app works fine without it |
| **Stripe / Paystack** | Extra payment options beyond PayPal |

## 3. Branding assets

| Item | Status |
|------|--------|
| Company name ("Page Innovations") | ✅ done — applied everywhere |
| Brand colors (red #DF0D0D, ink #191C1E, brown #5E3F3A from your designs) | ✅ done — applied to both apps |
| **Official logo** — PNG, transparent background, wide format (roughly 4:1 wordmark) | ⚠️ NEEDED — a temporary generated logo is in place; send the real one to replace it |
| Tagline (one line — shown on the login page and certificates) | ⚠️ NEEDED |
| Support email address (e.g. support@pageinnovations.com) | ⚠️ NEEDED |
| Selling currency (NGN or USD) | ⚠️ NEEDED — confirm which one |
| Landing page copy (hero text, feature bullets, footer) — or approve ours | ⚠️ NEEDED |

## 4. Email mailboxes (on your domain)

Decide which addresses the platform sends from, e.g.:
- `noreply@pageinnovations.com` — general notifications
- `registration@pageinnovations.com` — signup/verification emails (optional)

The mailboxes live wherever your domain email is hosted; sending goes
through Resend after we verify the domain (3 DNS records).

## 5. What we do once everything arrives

1. Create the Railway project: PostgreSQL database + backend + student
   app + admin app (the database sets itself up on first boot).
2. Plug in all the keys above as environment variables.
3. Register the PayPal webhook and Google login redirect against the
   live URLs; verify the domain in Resend.
4. Create the first admin account, set up course categories.
5. Smoke-test everything: signup email, login, enrollment, sandbox
   payment, live session, and the new Onboarding Center.
6. Flip PayPal from sandbox to live. Launch.

## Monthly running cost

| Item | Cost |
|------|------|
| Railway (all 4 services) | ~$5–20 |
| Resend | $0 until 3k emails/month |
| Cloudinary | $0 on free tier |
| PayPal | per-transaction fees only |
| Domain | ~$10–15/YEAR |
| **Total** | **~$5–20/month + payment fees** |

---
*Full technical detail (exact env var lists, webhook URLs, DNS steps)
lives in `WHITE-LABEL-SETUP.md` in this repo.*
