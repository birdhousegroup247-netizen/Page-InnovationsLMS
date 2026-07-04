# Page Innovations — Everything You Need to Provide

This is the complete list of accounts, keys and assets Page Innovations
must hand over before the app can go live. Hosting runs on Birdhouse's
Railway account, so there is nothing to pay for or set up on the hosting
side. Send each item as soon as it's ready — nothing goes live until
every required row is delivered.

---

## 1. Required from Page Innovations

| # | Item | What to send us | Notes |
|---|------|-----------------|-------|
| 1 | **Domain** | DNS access to your existing domain (or add the records we send you) | You already have the domain — we only need to add a few DNS records (email + pointing the app to your domain) |
| 2 | **Resend** (email sending) | API key | resend.com — free up to 3,000 emails/month. We'll verify your domain with 3 DNS records so emails send as @your-domain |
| 3 | **Payments — Paystack or Stripe** | Confirm WHICH one you use, then send: Paystack → Secret key + Public key, or Stripe → Secret key + Publishable key | Both are supported by the platform; we just need to know which account you have |
| 4 | **Cloudinary** (image/file storage) | Cloud name + API key + API secret + an unsigned upload preset | cloudinary.com — free tier |
| 5 | **Google Cloud** (Google login) | OAuth Client ID + Client Secret | console.cloud.google.com |
| 6 | **Cloudflare Turnstile** (bot protection) | Site key + Secret key | cloudflare.com — free |

## 2. Live classes — Google Meet

Live sessions run on **Google Meet**: instructors simply paste the Meet
link when scheduling a class — **no account keys or setup needed from
you**. (If you ever switch to Zoom, that needs Zoom API credentials —
tell us and we'll send the steps.)

## 3. Email addresses — create these in your cPanel

Create these mailboxes in your **cPanel** (where your domain email is
hosted) and send us the addresses:

- `noreply@your-domain.com` — general notifications
- `registration@your-domain.com` — signup/verification emails (optional)
- `support@your-domain.com` — shown to students as the contact address

The mailboxes receive replies in cPanel as normal; the platform sends
through Resend once the domain is verified.

## 4. Branding assets

| Item | Status |
|------|--------|
| Company name ("Page Innovations") | ✅ done — applied everywhere |
| Brand colors (red #DF0D0D, ink #191C1E, brown #5E3F3A from your designs) | ✅ done — applied to both apps |
| **Official logo** — PNG, transparent background, wide format (roughly 4:1 wordmark) | ⚠️ NEEDED — a temporary generated logo is in place; send the real one to replace it |
| Tagline (one line — shown on the login page and certificates) | ⚠️ NEEDED |
| Selling currency (NGN or USD) | ⚠️ NEEDED — confirm which one |
| Landing page copy (hero text, feature bullets, footer) — or approve ours | ⚠️ NEEDED |

## 5. What we do once everything arrives

1. Deploy on Birdhouse's Railway: PostgreSQL database + backend +
   student app + admin app (the database sets itself up on first boot).
2. Plug in all the keys above as environment variables.
3. Register the payment webhook (Paystack or Stripe) and the Google
   login redirect against the live URLs; verify the domain in Resend;
   point your domain at the app.
4. Create the first admin account, set up course categories.
5. Smoke-test everything: signup email, login, enrollment, test
   payment, a Google Meet live session, and the Onboarding Center.
6. Switch payments from test to live. Launch.

## Monthly running cost

| Item | Cost |
|------|------|
| Hosting (Birdhouse Railway) | covered by Birdhouse |
| Resend | $0 until 3k emails/month |
| Cloudinary | $0 on free tier |
| Paystack / Stripe | per-transaction fees only |
| **Total for Page Innovations** | **$0/month + payment fees** |

---
*Full technical detail (exact env var lists, webhook URLs, DNS steps)
lives in `WHITE-LABEL-SETUP.md` in this repo.*
